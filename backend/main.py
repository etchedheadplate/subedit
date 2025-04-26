import os
import time
import shutil
import uuid
import threading
import re
from typing import Dict, Any, AsyncGenerator
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from structures import ShowRequest, ShiftRequest, AlignRequest, CleanRequest, TranslateRequest
from subedit import SubEdit

# Constants
PARENT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_FILES_DIR = os.path.join(PARENT_DIR, "..", "user_files")
SESSION_LIFETIME = 3600  # 1 hour in seconds
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB in bytes
ALLOWED_EXTENSIONS = {".srt"}  # Allowed file extensions

# Ensure user_files directory exists
if not os.path.exists(USER_FILES_DIR):
    os.makedirs(USER_FILES_DIR)

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan event handler for FastAPI (startup/shutdown).

    Args:
        app (FastAPI): The FastAPI application instance.

    Yields:
        None: Control is yielded back to FastAPI during application runtime.
    """
    cleanup_thread = threading.Thread(target=run_cleanup, daemon=True)
    cleanup_thread.start()
    yield

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
                print(f"[DEBUG] [API] cleanup_old_sessions: {session_id}")

def run_cleanup() -> None:
    """Run cleanup function every hour.

    This function is intended to be run in a separate thread to
    periodically clean up old session directories.
    """
    while True:
        cleanup_old_sessions()
        time.sleep(3600)

app = FastAPI(lifespan=lifespan)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service endpoints
@app.post("/get-session/")
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
    print("[DEBUG] [API] /get-session/ endpoint called:", session_id)
    return {"session_id": session_id}

@app.post("/upload/")
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
    filename_to_sanitize = str(file.filename or "")
    safe_filename = re.sub(r'[^a-zA-Z0-9.-]', '-', filename_to_sanitize)
    assert isinstance(safe_filename, str)
    file_location = os.path.join(session_path, safe_filename)

    # Read file content to check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds limit of 1 MB")

    # Save file
    with open(file_location, "wb") as buffer:
        buffer.write(contents)

    print("Received file:", file.filename)  # Debugging

    return {
        "session_id": session_id,
        "filename": safe_filename,
        "file_path": file_location,
        "message": "File uploaded successfully"
    }

@app.get("/download/")
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
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

@app.post("/info/")
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
        print(f"[DEBUG] [API] /info/ endpoint called: session_id={session_id}, filename={filename}")

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
            "eta": subtitles_data['eta'],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/shift/")
async def shift_subtitles(request: ShiftRequest) -> Dict[str, Any]:
    """Shift the timing of subtitles by a specified delay.

    Args:
        request (ShiftRequest): Request containing session ID, filename,
                              delay amount, and optional subtitle indices.

    Returns:
        Dict[str, Any]: Dictionary containing file information, processed filename,
                       subtitles preview, and metadata.

    Raises:
        HTTPException: If an error occurs during processing.
    """
    try:
        print("[DEBUG] [API] /shift/ endpoint called")

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename
        shift_delay, shift_items = request.delay, request.items
        print(f"Received shift request: session_id={session_id}, filename={source_filename}, delay={shift_delay}, items={shift_items}")

        # Initialize SubEdit object
        file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)
        subedit = SubEdit([file_path])

        # Apply shifting
        subedit.shift_timing(delay=shift_delay, items=shift_items)

        # Return response with preview and metadata
        subtitles_data = subedit.subtitles_data[subedit.shifted_file]

        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "processed_filename": subedit.processed_file,
            "message": "Subtitles shifted successfully",
            "preview": subtitles_data['subtitles'],
            "encoding": subtitles_data['metadata']['encoding'],
            "confidence": subtitles_data['metadata']['confidence'],
            "language": subtitles_data['metadata']['language']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/align/")
async def align_subtitles(request: AlignRequest) -> Dict[str, Any]:
    """Align subtitles timing based on an example file.

    Args:
        request (AlignRequest): Request containing session ID, source filename,
                              example filename, and optional slice indices.

    Returns:
        Dict[str, Any]: Dictionary containing file information, processed filename,
                       subtitles preview, and metadata.

    Raises:
        HTTPException: If an error occurs during processing or if example file is missing.
    """
    try:
        print("[DEBUG] [API] /align/ endpoint called")

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename
        source_slice, example_slice = request.source_slice, request.example_slice

        # Check if example file is provided
        if request.example_filename:
            file_list = [
                os.path.join(USER_FILES_DIR, session_id, source_filename),
                os.path.join(USER_FILES_DIR, session_id, request.example_filename)
            ]
        else:
            raise HTTPException(status_code=400, detail="Example file is required for alignment")

        # Initialize SubEdit object
        subedit = SubEdit(file_list)

        # Apply alignment
        subedit.align_timing(source_slice=source_slice, example_slice=example_slice)

        # Get the aligned file data with metadata
        subtitles_data = subedit.subtitles_data[subedit.aligned_file]

        # Return response with preview and metadata
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "processed_filename": subedit.processed_file,
            "message": "Subtitles aligned successfully",
            "preview": subtitles_data['subtitles'],
            "encoding": subtitles_data['metadata']['encoding'],
            "confidence": subtitles_data['metadata']['confidence'],
            "language": subtitles_data['metadata']['language']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clean/")
async def clean_subtitles(request: CleanRequest) -> Dict[str, Any]:
    """Clean markup from subtitles based on specified options.

    Args:
        request (CleanRequest): Request containing session ID, filename,
                              and boolean flags for markup types to clean.

    Returns:
        Dict[str, Any]: Dictionary containing file information, processed filename,
                       subtitles preview, and metadata.

    Raises:
        HTTPException: If an error occurs during processing.
    """
    try:
        print("[DEBUG] [API] /clean/ endpoint called")

        # Load the session and file
        session_id, source_filename = request.session_id, request.source_filename
        file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)

        # Initialize SubEdit object
        subedit = SubEdit([file_path])

        # Apply markup cleaning
        subedit.clean_markup(
            bold=request.bold,
            italic=request.italic,
            underline=request.underline,
            strikethrough=request.strikethrough,
            color=request.color,
            font=request.font
        )

        # Get the cleaned file data with metadata
        subtitles_data = subedit.subtitles_data[subedit.cleaned_file]

        # Return response with preview and metadata
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "processed_filename": subedit.processed_file,
            "message": "Markup cleaned successfully",
            "preview": subtitles_data['subtitles'],
            "encoding": subtitles_data['metadata']['encoding'],
            "confidence": subtitles_data['metadata']['confidence'],
            "language": subtitles_data['metadata']['language']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate/")
async def translate_subtitles(request: TranslateRequest) -> Dict[str, Any]:
    """Translate subtitles to the specified target language.

    Args:
        request (TranslateRequest): Request containing session ID, filename,
                                  language settings, model configuration, and timeouts.

    Returns:
        Dict[str, Any]: Dictionary containing file information, processed filename,
                       translated subtitles preview, and metadata.

    Raises:
        HTTPException: If an error occurs during processing.
    """
    try:
        print("[DEBUG] [API] /translate/ endpoint called")

        # Load the session and file information
        session_id, source_filename = request.session_id, request.source_filename
        file_path = os.path.join(USER_FILES_DIR, session_id, source_filename)

        # Initialize SubEdit object
        subedit = SubEdit([file_path])

        # Apply translation
        subedit.translate_text(
            target_language=request.target_language,
            original_language=request.original_language,
            model_name=request.model_name,
            model_throttle=request.model_throttle,
            request_timeout=request.request_timeout,
            response_timeout=request.response_timeout
        )

        # Get the translated file data with metadata
        subtitles_data = subedit.subtitles_data[subedit.translated_file]

        # Return response with preview and metadata
        return {
            "session_id": session_id,
            "source_filename": source_filename,
            "processed_filename": subedit.processed_file,
            "message": f"Subtitles translated to {request.target_language} successfully",
            "preview": subtitles_data['subtitles'],
            "encoding": subtitles_data['metadata']['encoding'],
            "confidence": subtitles_data['metadata']['confidence'],
            "language": request.target_language,  # Use target language as the new language
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    run_cleanup()
