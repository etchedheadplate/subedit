# Dummy file to run uvicorn server
def application(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return [b"Uvicorn is running. This endpoint is unused."]
