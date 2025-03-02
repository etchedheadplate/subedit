import os
import time
import shutil
import uuid
import threading
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, Form
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for FastAPI (startup/shutdown)."""
    # Start cleanup thread
    cleanup_thread = threading.Thread(target=run_cleanup, daemon=True)
    cleanup_thread.start()

    yield  # Allow FastAPI to continue running

    # No explicit cleanup is needed, as the thread is daemonized

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def read_root():
    return {"message": "Welcome to SubEdit API"}

UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.post("/get-session/")
async def get_session():
    """Generate a new session ID for the user if needed."""
    session_id = str(uuid.uuid4())
    session_path = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)

    return {"session_id": session_id}

@app.post("/upload/")
async def upload_file(
    session_id: str = Form(...),  # Get session ID from frontend
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """Upload file to the user's session directory."""
    session_path = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)  # Ensure session directory exists

    file_location = os.path.join(session_path, str(file.filename))
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "session_id": session_id,
        "filename": file.filename,
        "file_path": file_location,
        "message": "File uploaded successfully"
    }

SESSION_LIFETIME = 3600  # 1 hour in seconds

def cleanup_old_sessions():
    """Delete session folders older than SESSION_LIFETIME seconds."""
    now = time.time()

    for session_id in os.listdir(UPLOAD_DIR):
        session_path = os.path.join(UPLOAD_DIR, session_id)

        if os.path.isdir(session_path):
            # Get folder modification time
            last_modified = os.path.getmtime(session_path)

            # Delete if older than SESSION_LIFETIME
            if now - last_modified > SESSION_LIFETIME:
                shutil.rmtree(session_path)
                print(f"Deleted old session: {session_id}")

def run_cleanup():
    """Runs cleanup function every hour in the background."""
    while True:
        cleanup_old_sessions()
        time.sleep(3600)  # Run cleanup every hour
