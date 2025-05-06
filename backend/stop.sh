#!/bin/bash

# Read the PID from file and kill the process
if [ -f uvicorn.pid ]; then
    PID=$(cat uvicorn.pid)
    kill "$PID"
    echo "Uvicorn (PID $PID) stopped."
    rm uvicorn.pid
else
    echo "No PID file found. Is Uvicorn running?"
fi
