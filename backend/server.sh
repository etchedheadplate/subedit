#!/bin/bash

# Function to display usage information
function show_usage {
  echo "Usage: ./server.sh [option]"
  echo "Options:"
  echo "  start    - Start the server"
  echo "  stop     - Stop the server"
  echo "  restart  - Restart the server"
  echo "  status   - Check if server is running"
}

# Function to start the server
function start_server {
  # Check if server is already running
  if [ -f uvicorn.pid ]; then
    echo "Server is already running with PID $(cat uvicorn.pid)"
    return
  fi

  # Load environment variables from .env file
  export $(grep -v '^#' .env | xargs)

  # Activate the virtual environment
  source "$VENV_PATH/bin/activate"

  # Move into the app directory
  cd "$APP_PATH" || exit 1

  # Start Uvicorn in the background and write its PID to a file
  nohup uvicorn main:app --host "$HOST" --port "$PORT" --workers 1 > uvicorn.log 2>&1 &
  echo $! > uvicorn.pid

  echo "Uvicorn started with PID $(cat uvicorn.pid)"
}

# Function to stop the server
function stop_server {
  # Read the PID from file and kill the process
  if [ -f uvicorn.pid ]; then
    PID=$(cat uvicorn.pid)
    kill "$PID"
    echo "Uvicorn (PID $PID) stopped."
    rm uvicorn.pid
  else
    echo "No PID file found. Is Uvicorn running?"
  fi
}

# Function to check server status
function check_status {
  if [ -f uvicorn.pid ]; then
    PID=$(cat uvicorn.pid)
    if ps -p "$PID" > /dev/null; then
      echo "Server is running with PID $PID"
    else
      echo "PID file exists but process is not running. Cleaning up..."
      rm uvicorn.pid
      echo "Server is not running."
    fi
  else
    echo "Server is not running."
  fi
}

# Main logic based on arguments
case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    sleep 2
    start_server
    ;;
  status)
    check_status
    ;;
  *)
    show_usage
    ;;
esac
