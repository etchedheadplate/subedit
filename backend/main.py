import os
import time
import json
import shutil
import uuid
import threading
import asyncio
import props
from dotenv import load_dotenv
from pathlib import Path
from typing import Dict, Any, AsyncGenerator, Optional, List, Coroutine
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from structures import StatusRequest, ShowRequest, ShiftRequest, AlignRequest, CleanRequest, EngineRequest, DuckRequest, StatisticsData
from subedit import SubEdit
from logger import main_logger

# Load environment variables from .env file
load_dotenv()

# Constants
DEBUG = bool(int(os.getenv('DEBUG', '1')))
RELATIVE_USER_FILES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "user_files")
FRONTEND_URL: str = "http://localhost:5173" if DEBUG else os.getenv('FRONTEND_URL', "http://localhost:5173")
USER_FILES_DIR = RELATIVE_USER_FILES_DIR if DEBUG else os.getenv('USER_FILES_PATH', RELATIVE_USER_FILES_DIR)
SESSION_LIFETIME = 3600  # 1 hour in seconds
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB in bytes
ALLOWED_EXTENSIONS = {".srt"}  # Allowed file extensions

# Ensure user_files directory exists
if not os.path.exists(USER_FILES_DIR):
    os.makedirs(USER_FILES_DIR)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan event handler for FastAPI (startup/shutdown)."""
    cleanup_thread = threading.Thread(target=run_cleanup, daemon=True)
    cleanup_thread.start()
    yield

    # Cancel any running tasks when shutting down
    session_ids: List[str] = TaskManager.get_all_session_ids()
    for session_id in session_ids:
        TaskManager.cancel_tasks(session_id)

def cleanup_old_sessions() -> None:
    """Delete session folders older than SESSION_LIFETIME.

    Scans the user_files directory and removes any session folders
    that have not been modified within the SESSION_LIFETIME period.
    """
    now = time.time()
    for session_id in os.listdir(USER_FILES_DIR):
        session_path = os.path.join(USER_FILES_DIR, session_id)
        if os.path.isdir(session_path):
            last_modified = os.path.getmtime(session_path)
            if now - last_modified > SESSION_LIFETIME:
                shutil.rmtree(session_path)
                main_logger.info(f"removed {session_id}")

def run_cleanup() -> None:
    """Run cleanup function every SESSION_LIFETIME.

    This function is intended to be run in a separate thread to
    periodically clean up old session directories.
    """
    while True:
        cleanup_old_sessions()
        time.sleep(SESSION_LIFETIME)

app = FastAPI(lifespan=lifespan)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Requested-With", "Accept", "Origin", "Authorization"],
    expose_headers=["Content-Disposition"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Service endpoints
@app.get("/ping")
def ping():
    main_logger.info("pong")
    return {"status": "ok", "debug": DEBUG}

@app.get("/statistics")
def statistics():
    """Send stats."""
    # Check if statistics file exists
    props.check_statistics()

    # Load the existing data from the JSON file
    statistics_file = Path(__file__).parent / '../shared/statistics.json'
    with open(statistics_file, 'r') as file:
        data: StatisticsData = json.load(file)

    count_uploaded = data['files_processed']['upload']
    count_downloaded = data['files_processed']['download']
    count_total = data['files_processed']['total']
    count_shifted = data['files_processed']['shift']
    count_aligned = data['files_processed']['align']
    count_cleaned = data['files_processed']['clean']
    count_translated = data['files_processed']['translate']

    main_logger.info("statistics sent")

    return {
        "uploaded": count_uploaded,
        "downloaded": count_downloaded,
        "total": count_total,
        "shifted": count_shifted,
        "aligned": count_aligned,
        "cleaned": count_cleaned,
        "translated": count_translated,
    }

@app.post("/frontend-error")
async def frontend_error(error: str):
    main_logger.info(error)
    return {"status": "ok"}

@app.post("/get-session")
async def get_session() -> Dict[str, str]:
    """Generate a new session ID.

    Creates a new UUID-based session ID and initializes a corresponding
    directory for user files.

    Returns:
        Dict[str, str]: Dictionary containing the generated session ID.
    """
    session_id = str(uuid.uuid4())
    session_path = os.path.join(USER_FILES_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)
    main_logger.info(session_id)
    return {"session_id": session_id}

@app.post("/upload")
async def upload_file(
    session_id: str = Form(...),
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """Upload and validate subtitle file.

    Args:
        session_id (str): The session ID for the current user.
        file (UploadFile): The subtitle file to be uploaded.

    Returns:
        Dict[str, Any]: Dictionary containing session info, file details, and status message.

    Raises:
        HTTPException: If file extension is invalid or file size exceeds the limit.
    """
    session_path = os.path.join(USER_FILES_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)

    # Extract file extension
    split_result = os.path.splitext(file.filename or "")
    _ = split_result[0]
    ext = str(split_result[1]).lower()

    # Validate file extension
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only SubRip .srt files are allowed")

    # Sanitize filename (remove unsafe characters)
    safe_filename = props.sanitize_filename(str(file.filename or ""))
    assert isinstance(safe_filename, str)
    file_location = os.path.join(session_path, safe_filename)

    # Read file content to check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds limit of 1 MB")

    # Save file
    with open(file_location, "wb") as buffer:
        buffer.write(contents)

    main_logger.info(f"session_id={session_id}, filename={file.filename}")

    # Update statistics file
    props.update_statitics('upload')

    return {
        "session_id": session_id,
        "filename": safe_filename,
        "file_path": file_location,
        "message": "File uploaded successfully"
    }

@app.get("/download")
async def download_file(session_id: str, filename: str) -> FileResponse:
    """Download a processed file.

    Args:
        session_id (str): The session ID for the current user.
        filename (str): The name of the file to download.

    Returns:
        FileResponse: The requested file as a downloadable response.

    Raises:
        HTTPException: If the requested file is not found.
    """
    file_path = os.path.join(USER_FILES_DIR, session_id, filename)

    # Update statistics file
    props.update_statitics('download')

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    main_logger.info(f"session_id={session_id}, filename={filename}")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

@app.post("/task-status")
async def check_task_status(request: StatusRequest) -> Dict[str, Any]:
    """Check if a processed file exists from a background task."""
    session_path = os.path.join(USER_FILES_DIR, request.session_id)

    # Get tasks for this session
    tasks = TaskManager.get_tasks(request.session_id)

    # Check for possible processed filenames
    source_name = os.path.splitext(request.filename)[0]
    possible_files = [
        f for f in os.listdir(session_path)
        if f.startswith(source_name) and f != request.filename
    ]

    if possible_files:
        # Return the most recently modified file
        latest_file = max(possible_files, key=lambda f: os.path.getmtime(os.path.join(session_path, f)))
        return {
            "status": "completed",
            "processed_filename": latest_file
        }
    elif tasks:
        # Tasks are still running
        return {
            "status": "processing",
            "tasks_count": len(tasks)
        }
    else:
        return {
            "status": "unknown"  # No tasks found and no output files
        }

@app.post("/info")
async def show_subtitles(request: ShowRequest) -> Dict[str, Any]:
    """Retrieve information about a subtitle file.

    Args:
        request (ShowRequest): Request containing session ID and filename.

    Returns:
        Dict[str, Any]: Dictionary containing file information, subtitles preview,
                       and metadata like encoding and language.

    Raises:
        HTTPException: If an error occurs during processing.
    """
    try:
        # Load the session and file
        session_id, filename = request.session_id, request.filename

        # Initialize SubEdit object
        file_path = os.path.join(USER_FILES_DIR, session_id, filename)
        subedit = SubEdit([file_path])

        # Apply shifting
        subedit.pass_info()

        # Return response with preview and metadata
        subtitles_data = subedit.subtitles_data[subedit.source_file]

        return {
            "session_id": session_id,
            "filename": filename,
            "message": "Subtitles info passed",
            "preview": subtitles_data['subtitles'],
            "encoding": subtitles_data['metadata']['encoding'],
            "confidence": subtitles_data['metadata']['confidence'],
            "language": subtitles_data['metadata']['language'],
            "engine_eta": subtitles_data['engine_eta'],
            "duck_eta": subtitles_data['duck_eta'],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TaskManager:
    """Manage background tasks using asyncio."""

    # Specify the type of _tasks dictionary
    _tasks: Dict[str, List[asyncio.Task[Any]]] = {}

    @classmethod
    def create_task(cls, session_id: str, coroutine: Coroutine[Any, Any, Any]) -> asyncio.Task[Any]:
        """Create and track a new background task."""
        task: asyncio.Task[Any] = asyncio.create_task(coroutine)
        if session_id not in cls._tasks:
            cls._tasks[session_id] = []
        cls._tasks[session_id].append(task)

        # Set up callback to remove task when done
        task.add_done_callback(
            lambda t: cls._tasks[session_id].remove(t) if t in cls._tasks.get(session_id, []) else None
        )
        return task

    @classmethod
    def get_tasks(cls, session_id: str) -> List[asyncio.Task[Any]]:
        """Get all tasks for a session."""
        return cls._tasks.get(session_id, [])

    @classmethod
    def cancel_tasks(cls, session_id: str) -> None:
        """Cancel all tasks for a session."""
        tasks = cls._tasks.get(session_id, [])
        for task in tasks:
            if not task.done():
                task.cancel()
        cls._tasks[session_id] = []

    # Add this method to the TaskManager class:
    @classmethod
    def get_all_session_ids(cls) -> List[str]:
        """Get all session IDs that have active tasks."""
        return list(cls._tasks.keys())

@app.post("/shift")
async def shift_subtitles(request: ShiftRequest) -> Dict[str, Any]:
    """Shift the timing of subtitles by a specified delay."""
    try:
        main_logger.info(
            f"session_id={request.session_id}, "
            f"filename={request.source_filename}, "
            f"delay={request.delay}, "
            f"items={request.items}"
        )

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename
        shift_delay, shift_items = request.delay, request.items

        # Initialize SubEdit object
        file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)
        subedit = SubEdit([file_path])

        # Create task using asyncio
        TaskManager.create_task(
            session_id,
            perform_shift_task(subedit, shift_delay, shift_items, session_id, source_filename)
        )

        # Return immediate response with status
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "message": "Subtitle shifting started in the background",
            "status": "processing"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def perform_shift_task(
    subedit: SubEdit,
    delay: int,
    items: Optional[List[int]],
    session_id: str,
    source_filename: str
) -> None:
    """Perform the subtitle shifting task in the background."""
    try:
        subedit.shift_timing(delay=delay, items=items)
        main_logger.info("shifted successfully")
    except Exception as e:
        main_logger.info(f"error: {str(e)}")

@app.post("/align")
async def align_subtitles(request: AlignRequest) -> Dict[str, Any]:
    """Align subtitles timing based on an example file."""
    try:
        main_logger.info(
            f"session_id={request.session_id}, "
            f"filename={request.source_filename}, "
            f"example_filename={request.example_filename}, "
            f"source_slice={request.source_slice}, "
            f"example_slice={request.example_slice}, "
            f"trim_start={request.trim_start}, "
            f"trim_end={request.trim_end}"
        )

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename
        source_slice, example_slice = request.source_slice, request.example_slice
        trim_start, trim_end = request.trim_start, request.trim_end

        # Check if example file is provided
        if not request.example_filename:
            raise HTTPException(status_code=400, detail="Example file is required for alignment")

        file_list = [
            os.path.join(USER_FILES_DIR, session_id, source_filename),
            os.path.join(USER_FILES_DIR, session_id, request.example_filename)
        ]

        # Initialize SubEdit object
        subedit = SubEdit(file_list)

        # Create task using asyncio
        TaskManager.create_task(
            session_id,
            perform_align_task(subedit, source_slice, example_slice, trim_start, trim_end)
        )

        # Return immediate response with status
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "message": "Subtitle alignment started in the background",
            "status": "processing"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def perform_align_task(
    subedit: SubEdit,
    source_slice: Optional[List[int]],
    example_slice: Optional[List[int]],
    trim_start: bool,
    trim_end: bool
) -> None:
    """Perform the subtitle alignment task in the background."""
    try:
        subedit.align_timing(source_slice=source_slice, example_slice=example_slice, trim_start=trim_start, trim_end=trim_end)
        main_logger.info("aligned successfully")
    except Exception as e:
        main_logger.info(f"error: {str(e)}")

@app.post("/clean")
async def clean_subtitles(request: CleanRequest) -> Dict[str, Any]:
    """Clean markup from subtitles based on specified options."""
    try:
        main_logger.info(
            f"session_id={request.session_id}, "
            f"filename={request.source_filename}, "
            f"bold={request.bold}, "
            f"italic={request.italic}, "
            f"underline={request.underline}, "
            f"strikethrough={request.strikethrough}, "
            f"color={request.color}"
            f"font={request.font}"
        )

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename
        file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)

        # Initialize SubEdit object
        subedit = SubEdit([file_path])

        # Create task using asyncio
        TaskManager.create_task(
            session_id,
            perform_clean_task(
                subedit,
                request.bold,
                request.italic,
                request.underline,
                request.strikethrough,
                request.color,
                request.font
            )
        )

        # Return immediate response with status
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "message": "Markup cleaning started in the background",
            "status": "processing"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def perform_clean_task(
    subedit: SubEdit,
    bold: bool,
    italic: bool,
    underline: bool,
    strikethrough: bool,
    color: bool,
    font: bool
) -> None:
    """Perform the markup cleaning task in the background."""
    try:
        # Apply markup cleaning in the background
        subedit.clean_markup(
            bold=bold,
            italic=italic,
            underline=underline,
            strikethrough=strikethrough,
            color=color,
            font=font
        )
        main_logger.info("cleaned successfully")
    except Exception as e:
        main_logger.info(f"error: {str(e)}")

@app.post("/engine")
async def engine_translate_subtitles(request: EngineRequest) -> Dict[str, Any]:
    """Translates subtitles using the selected translation engine."""
    try:
        main_logger.info(
            f"session_id={request.session_id}, "
            f"filename={request.source_filename}, "
            f"target_language={request.target_language}, "
            f"original_language={request.original_language}, "
            f"engine={request.engine}, "
            f"clean_markup={request.clean_markup}, "
        )

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename

        # Initialize SubEdit object
        file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)
        subedit = SubEdit([file_path])

        # Create task using asyncio
        TaskManager.create_task(
            session_id,
            perform_engine_task(
                subedit=subedit,
                source_filename=source_filename,
                target_language=request.target_language,
                original_language=request.original_language,
                engine=request.engine,
                clean_markup=request.clean_markup
            )
        )

        # Return immediate response with status
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "message": "Engine translation started in the background",
            "status": "processing"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def perform_engine_task(
    subedit: SubEdit,
    source_filename: str,
    target_language: str,
    original_language: Optional[str],
    engine: str,
    clean_markup: bool
) -> None:
    """Perform the engine translation task in the background."""
    try:
        await subedit.engine_translate(
            target_language=target_language,
            original_language=original_language,
            engine=engine,
            clean_markup=clean_markup
        )

        main_logger.info("translated successfully")
    except asyncio.TimeoutError:
        main_logger.info("timed out")
    except Exception as e:
        main_logger.info(f"error: {str(e)}")

# Endpoint accesible only on localhost
if DEBUG:
    @app.post("/duck")
    async def duck_translate_subtitles(request: DuckRequest) -> Dict[str, Any]:
        """Translates subtitles using the selected LLM provided by Duck.ai."""
        try:
            main_logger.info(
                f"session_id={request.session_id}, "
                f"filename={request.source_filename}, "
                f"target_language={request.target_language}, "
                f"original_language={request.original_language}, "
                f"model_name={request.model_name}, "
                f"model_throttle={request.model_throttle}, "
                f"request_timeout={request.request_timeout}, "
                f"response_timeout={request.response_timeout}, "
            )

            # Load the session and file information
            session_id, source_filename = request.session_id, request.source_filename
            file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)

            # Initialize SubEdit object
            subedit = SubEdit([file_path])

            # Create task using asyncio
            TaskManager.create_task(
                session_id,
                perform_duck_task(
                    subedit,
                    request.target_language,
                    request.original_language,
                    request.model_name,
                    request.model_throttle,
                    request.request_timeout,
                    request.response_timeout
                )
            )

            # Return immediate response with status
            return {
                "session_id": session_id,
                "source_filename": source_filename,
                "message": f"Duck Translation to {request.target_language} started in the background",
                "status": "processing"
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def perform_duck_task(
        subedit: SubEdit,
        target_language: str,
        original_language: str,
        model_name: str,
        model_throttle: float,
        request_timeout: int,
        response_timeout: int
    ) -> None:
        """Perform the duck translation task in the background."""
        try:
            await subedit.duck_translate(
                target_language=target_language,
                original_language=original_language,
                model_name=model_name,
                model_throttle=model_throttle,
                request_timeout=request_timeout,
                response_timeout=response_timeout
            )

            main_logger.info("translated successfully")
        except asyncio.TimeoutError:
            main_logger.info("timed out")
        except Exception as e:
            main_logger.info(f"error: {str(e)}")

if __name__ == '__main__':
    run_cleanup()
