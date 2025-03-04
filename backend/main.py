import os
import time
import shutil
import uuid
import threading
import re
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, APIRouter
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from subedit import SubEdit

# Constants
USER_FILES_DIR = "user_files"
SESSION_LIFETIME = 3600  # 1 hour in seconds
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB in bytes
ALLOWED_EXTENSIONS = {".srt"}  # Allowed file extensions

# Ensure user_files directory exists
if not os.path.exists(USER_FILES_DIR):
    os.makedirs(USER_FILES_DIR)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for FastAPI (startup/shutdown)."""
    cleanup_thread = threading.Thread(target=run_cleanup, daemon=True)
    cleanup_thread.start()
    yield

app = FastAPI(lifespan=lifespan)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/get-session/")
async def get_session():
    """Generate a new session ID."""
    session_id = str(uuid.uuid4())
    session_path = os.path.join(USER_FILES_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)
    return {"session_id": session_id}

@app.post("/upload/")
async def upload_file(
    session_id: str = Form(...),
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """Upload and validate subtitle file."""
    session_path = os.path.join(USER_FILES_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)

    # Extract file extension
    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()

    # Validate file extension
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only SubRip .srt files are allowed")

    # Sanitize filename (remove unsafe characters)
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    file_location = os.path.join(session_path, safe_filename)

    # Read file content to check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds limit of 1 MB")

    # Save file
    with open(file_location, "wb") as buffer:
        buffer.write(contents)

    return {
        "session_id": session_id,
        "filename": safe_filename,
        "file_path": file_location,
        "message": "File uploaded successfully"
    }

@app.get("/download/")
async def download_file(session_id: str, filename: str):
    """Download a processed file."""
    file_path = os.path.join(USER_FILES_DIR, session_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

def cleanup_old_sessions():
    """Delete session folders older than SESSION_LIFETIME."""
    now = time.time()
    for session_id in os.listdir(USER_FILES_DIR):
        session_path = os.path.join(USER_FILES_DIR, session_id)
        if os.path.isdir(session_path):
            last_modified = os.path.getmtime(session_path)
            if now - last_modified > SESSION_LIFETIME:
                shutil.rmtree(session_path)
                print(f"Deleted old session: {session_id}")

def run_cleanup():
    """Run cleanup function every hour."""
    while True:
        cleanup_old_sessions()
        time.sleep(3600)

router = APIRouter()

# Define request model
class ShiftRequest(BaseModel):
    session_id: str
    filename: str
    delay: int  # Milliseconds to shift
    items: list[int] | None = None  # List of subtitle indices (optional)

# Shift endpoint
@router.post("/shift/")
async def shift_subtitles(request: ShiftRequest):
    try:
        # Load the session and file
        session_id, filename = request.session_id, request.filename
        shift_delay, shift_items = request.delay, request.items

        # Initialize SubEdit object
        subedit = SubEdit(session_id=session_id, file_list=[filename])

        # Apply shifting
        subedit.shift_timing(delay=shift_delay, items=shift_items)

        # Return response with preview
        return {
            "session_id": session_id,
            "filename": filename,
            "message": "Subtitles shifted successfully",
            "preview": subedit.get_preview()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
