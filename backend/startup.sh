#!/bin/bash

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Activate the virtual environment
source "$VENV_PATH/bin/activate"

# Move into the app directory
cd "$APP_PATH" || exit 1

# Start Uvicorn in the background and write its PID to a file
nohup uvicorn app.main:app --host "$HOST" --port "$PORT" --workers 1 > uvicorn.log 2>&1 &
echo $! > uvicorn.pid

echo "Uvicorn started with PID $(cat uvicorn.pid)"
