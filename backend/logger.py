import os
import logging
from dotenv import load_dotenv
from logging.handlers import TimedRotatingFileHandler

# Load environment variables from .env file
load_dotenv()

# Constants
DEBUG = bool(int(os.getenv('DEBUG', '1')))
LOG_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs")
LOG_FILE: str = os.getenv('LOG_FILE', "backend.log")
LOG_PATH: str = os.path.join(LOG_DIR, LOG_FILE)
LOG_AGE: int = int(os.getenv('LOG_AGE', 30))

# Ensure the log directory exists
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)

main_logger = logging.getLogger(__name__)
main_logger.setLevel(logging.DEBUG)

file_handler = TimedRotatingFileHandler(LOG_PATH, when='D', interval=1, backupCount=LOG_AGE)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(module)s - %(funcName)s - %(message)s')

file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

main_logger.addHandler(file_handler)
main_logger.addHandler(console_handler)
