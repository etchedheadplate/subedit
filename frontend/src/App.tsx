import { useState, useEffect } from "react";

function App() {
    const [file, setFile] = useState<File | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

    // Fetch a new session ID when the component loads
    const getSessionId = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/get-session/", {
                method: "POST",
            });
            const data = await response.json();
            setSessionId(data.session_id);
        } catch (error) {
            console.error("Failed to get session ID:", error);
        }
    };

    // Fetch uploaded files for the current session
    const fetchUploadedFiles = async () => {
        if (!sessionId) return;

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/list-files/?session_id=${sessionId}`,
            );
            const data = await response.json();

            if (data.error) {
                setMessage(data.error);
            } else {
                setUploadedFiles(data.files);
            }
        } catch (error) {
            console.error("Failed to fetch files:", error);
        }
    };

    // Handle file selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
    };

    // Handle file upload
    const handleUpload = async () => {
        if (!file) {
            setMessage("Please select a file.");
            return;
        }
        if (!sessionId) {
            setMessage("Session ID missing. Try refreshing.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_id", sessionId); // Include session ID

        try {
            const response = await fetch("http://127.0.0.1:8000/upload/", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            setMessage(data.message);
            setFile(null); // Clear selected file

            // Refresh file list after upload
            fetchUploadedFiles();
        } catch (error) {
            console.error("Upload error:", error);
            setMessage("Upload failed.");
        }
    };

    // Fetch session ID when the page loads
    useEffect(() => {
        getSessionId();
    }, []);

    // Fetch uploaded files when session ID changes
    useEffect(() => {
        if (sessionId) {
            fetchUploadedFiles();
        }
    }, [sessionId]);

    return (
        <div>
            <h1>Upload Subtitle File</h1>
            {sessionId ? (
                <p>Session ID: {sessionId}</p>
            ) : (
                <p>Getting session...</p>
            )}
            <input type="file" accept=".srt" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button>
            {message && <p>{message}</p>}

            <h2>Uploaded Files</h2>
            <ul>
                {uploadedFiles.length > 0 ? (
                    uploadedFiles.map((filename, index) => (
                        <li key={index}>
                            {filename}{" "}
                            <a
                                href={`http://127.0.0.1:8000/download/?session_id=${sessionId}&filename=${filename}`}
                                download
                            >
                                [Download]
                            </a>
                        </li>
                    ))
                ) : (
                    <p>No files uploaded yet.</p>
                )}
            </ul>
        </div>
    );
}

export default App;
