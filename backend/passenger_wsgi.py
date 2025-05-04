import sys
import os

# Add the current directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import app as application  # FastAPI or ASGI application
