# SubEdit Backend

This is the backend component of the SubEdit web application. It consists of:

- A Python-based `SubEdit` class for subtitle manipulation
- [FastAPI](https://fastapi.tiangolo.com/) endpoints for serving the API
- [Uvicorn](https://www.uvicorn.org/) server for ASGI hosting

---

## Installation

Set up a virtual environment:

```bash
cd subedit/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Environment Configuration

Create a .env file in the `subedit/backend` directory with the following variables:

```
# Set to 0 to run in production
DEBUG=1

# Defaults to http://localhost:5173 when DEBUG=1
FRONTEND_URL=https://your.frontend.domain

# Defaults to ../user_files when DEBUG=1
USER_FILES_PATH=/path/to/your/upload/directory
```

Ensure the directory specified in `USER_FILES_PATH` exists and is writable.

## Usage

Start the Uvicorn server:

```bash
uvicorn main:app --reload
```

Check if the server is running correctly:

```bash
curl -X GET http://127.0.0.1:8000/ping
```

Expected response:

```json
{"status": "ok", "debug": true}
```

## Optional: Enable AI Translation

Subtitle translation using [Duck.ai](https://duckduckgo.com/duckduckgo-help-pages/duckai) is only available in local environments due to a dependency on `stpyv8`, which is not supported on most remote servers.

If you want to enable subtitle translation with Duck.ai:
1. Ensure that stpyv8 can be compiled and installed in your local Python environment (Linux/Mac recommended).
2. Uncomment corresponding lines at the end of `requirements.txt` and run `pip install -r requirements.txt` again.
3. Make `DEBUG=0` in `.env` and remove `if DEBUG` conditions in `main.py` and `subedit.py` to run in production.

## Contributions

Feel free to submit issues or pull requests.

## License

MIT License
