import { useState, useEffect } from "react";

interface SubtitleFile {
    filename: string;
    session_id: string;
}

interface SubtitlePreview {
    [key: number]: {
        start: string;
        end: string;
        text: string;
    };
}

interface SubtitleMetadata {
    encoding: string;
    confidence: number;
    language: string;
}

function App() {
    // State management
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<SubtitleFile | null>(null);
    const [processedFile, setProcessedFile] = useState<string | null>(null);
    const [delay, setDelay] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeOption, setActiveOption] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sourcePreview, setSourcePreview] = useState<SubtitlePreview | null>(
        null,
    );
    const [sourceMeta, setSourceMeta] = useState<SubtitleMetadata | null>(null);
    const [resultPreview, setResultPreview] = useState<SubtitlePreview | null>(
        null,
    );

    // Fetch session ID when app loads
    useEffect(() => {
        const getSession = async () => {
            try {
                const response = await fetch(
                    "http://localhost:8000/get-session/",
                    {
                        method: "POST",
                    },
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setSessionId(data.session_id);
            } catch (error) {
                console.error("Error fetching session ID:", error);
                setErrorMessage(
                    "Failed to initialize application. Please reload the page.",
                );
            }
        };

        getSession();
    }, []);

    // Handle file upload
    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !sessionId) return;

        const file = event.target.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_id", sessionId);

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch("http://localhost:8000/upload/", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Upload failed");
            }

            setUploadedFile({
                filename: data.filename,
                session_id: data.session_id,
            });

            // Reset any previous processing
            setActiveOption(null);
            setResultPreview(null);
            setProcessedFile(null);
        } catch (error: any) {
            setErrorMessage(error.message);
            setUploadedFile(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle option selection
    const handleOptionSelect = (option: string) => {
        setActiveOption(option);
        setResultPreview(null);
        setProcessedFile(null);

        // If we have an uploaded file, fetch its preview
        if (uploadedFile && sessionId) {
            fetchSubtitlePreview();
        }
    };

    // Fetch subtitle preview for the source file
    const fetchSubtitlePreview = async () => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);

        try {
            // For now, let's use the shift endpoint with delay=0 just to get the preview
            const response = await fetch("http://localhost:8000/shift/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    filename: uploadedFile.filename,
                    delay: 0,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Failed to load subtitle preview",
                );
            }

            // Extract metadata from the first subtitle item (could be improved)
            if (data.preview) {
                setSourcePreview(data.preview);

                // In a real implementation, you would get this from a dedicated endpoint
                // This is a placeholder for demonstration
                setSourceMeta({
                    encoding: "UTF-8",
                    confidence: 100,
                    language: "en",
                });
            }
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle shift operation
    const handleShift = async () => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch("http://localhost:8000/shift/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    filename: uploadedFile.filename,
                    delay: delay,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Shift operation failed");
            }

            setResultPreview(data.preview);
            setProcessedFile(
                `${uploadedFile.filename.split(".")[0]}_shifted_by_${delay}_ms.srt`,
            );
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle file download
    const handleDownload = () => {
        if (!processedFile || !sessionId) return;

        window.location.href = `http://localhost:8000/download/?session_id=${sessionId}&filename=${processedFile}`;
    };

    // Render subtitle preview
    const renderSubtitlePreview = (preview: SubtitlePreview | null) => {
        if (!preview) return <p>No preview available</p>;

        return (
            <div className="subtitle-preview">
                <pre>
                    {Object.entries(preview).map(([index, subtitle]) => (
                        <div key={index} className="subtitle-entry">
                            <div>{index}</div>
                            <div>
                                {subtitle.start} -- {subtitle.end}
                            </div>
                            <div>{subtitle.text}</div>
                            <br />
                        </div>
                    ))}
                </pre>
            </div>
        );
    };

    return (
        <div style={{ padding: "20px" }}>
            <h1>Subtitle Editor</h1>

            {errorMessage && (
                <div
                    style={{
                        backgroundColor: "#ffcccc",
                        color: "#cc0000",
                        padding: "10px",
                        borderRadius: "5px",
                        marginBottom: "20px",
                    }}
                >
                    {errorMessage}
                </div>
            )}

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                {/* File upload section */}
                <div>
                    <input
                        type="file"
                        accept=".srt"
                        onChange={handleUpload}
                        disabled={isLoading}
                        style={{ display: "none" }}
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            borderRadius: "5px",
                            cursor: "pointer",
                            display: "inline-block",
                        }}
                    >
                        {isLoading ? "Uploading..." : "Upload Subtitles"}
                    </label>

                    {uploadedFile && (
                        <div style={{ marginTop: "10px" }}>
                            <p>Uploaded: {uploadedFile.filename}</p>
                        </div>
                    )}
                </div>

                {/* Editor options */}
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        onClick={() => handleOptionSelect("shift")}
                        disabled={!uploadedFile || isLoading}
                        style={{
                            padding: "10px 15px",
                            backgroundColor:
                                activeOption === "shift"
                                    ? "#2196F3"
                                    : "#e0e0e0",
                            color:
                                activeOption === "shift"
                                    ? "white"
                                    : !uploadedFile
                                      ? "#a0a0a0"
                                      : "black",
                            border: "none",
                            borderRadius: "5px",
                            cursor: uploadedFile ? "pointer" : "not-allowed",
                        }}
                    >
                        Shift Timing
                    </button>

                    <button
                        onClick={() => handleOptionSelect("align")}
                        disabled={!uploadedFile || isLoading}
                        style={{
                            padding: "10px 15px",
                            backgroundColor:
                                activeOption === "align"
                                    ? "#2196F3"
                                    : "#e0e0e0",
                            color:
                                activeOption === "align"
                                    ? "white"
                                    : !uploadedFile
                                      ? "#a0a0a0"
                                      : "black",
                            border: "none",
                            borderRadius: "5px",
                            cursor: uploadedFile ? "pointer" : "not-allowed",
                        }}
                    >
                        Align by Example
                    </button>

                    <button
                        onClick={() => handleOptionSelect("clean")}
                        disabled={!uploadedFile || isLoading}
                        style={{
                            padding: "10px 15px",
                            backgroundColor:
                                activeOption === "clean"
                                    ? "#2196F3"
                                    : "#e0e0e0",
                            color:
                                activeOption === "clean"
                                    ? "white"
                                    : !uploadedFile
                                      ? "#a0a0a0"
                                      : "black",
                            border: "none",
                            borderRadius: "5px",
                            cursor: uploadedFile ? "pointer" : "not-allowed",
                        }}
                    >
                        Clean Markup
                    </button>

                    <button
                        onClick={() => handleOptionSelect("translate")}
                        disabled={!uploadedFile || isLoading}
                        style={{
                            padding: "10px 15px",
                            backgroundColor:
                                activeOption === "translate"
                                    ? "#2196F3"
                                    : "#e0e0e0",
                            color:
                                activeOption === "translate"
                                    ? "white"
                                    : !uploadedFile
                                      ? "#a0a0a0"
                                      : "black",
                            border: "none",
                            borderRadius: "5px",
                            cursor: uploadedFile ? "pointer" : "not-allowed",
                        }}
                    >
                        Translate Subtitles
                    </button>
                </div>
            </div>

            {/* Active option content */}
            {activeOption === "shift" && uploadedFile && (
                <div style={{ marginBottom: "20px" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                            }}
                        >
                            <label htmlFor="delay-input">Milliseconds:</label>
                            <input
                                id="delay-input"
                                type="number"
                                value={delay}
                                onChange={(e) =>
                                    setDelay(Number(e.target.value))
                                }
                                style={{
                                    padding: "8px",
                                    width: "100px",
                                    borderRadius: "5px",
                                    border: "1px solid #ccc",
                                }}
                            />
                            <button
                                onClick={handleShift}
                                disabled={isLoading}
                                style={{
                                    padding: "8px 15px",
                                    backgroundColor: "#FF9800",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                }}
                            >
                                {isLoading ? "Processing..." : "Shift"}
                            </button>
                        </div>

                        {processedFile && (
                            <button
                                onClick={handleDownload}
                                style={{
                                    padding: "8px 15px",
                                    backgroundColor: "#673AB7",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                }}
                            >
                                Download
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Result display */}
            {activeOption && sourcePreview && (
                <div style={{ display: "flex", gap: "20px" }}>
                    {/* Source file preview */}
                    <div
                        style={{
                            flex: 1,
                            border: "1px solid #ddd",
                            borderRadius: "5px",
                            padding: "15px",
                        }}
                    >
                        <h3>Original File</h3>
                        {sourceMeta && (
                            <div style={{ marginBottom: "10px" }}>
                                <p>
                                    <strong>Filename:</strong>{" "}
                                    {uploadedFile?.filename}
                                </p>
                                <p>
                                    <strong>Language:</strong>{" "}
                                    {sourceMeta.language}
                                </p>
                                <p>
                                    <strong>Encoding:</strong>{" "}
                                    {sourceMeta.encoding}
                                </p>
                            </div>
                        )}
                        {renderSubtitlePreview(sourcePreview)}
                    </div>

                    {/* Result file preview */}
                    {resultPreview && (
                        <div
                            style={{
                                flex: 1,
                                border: "1px solid #ddd",
                                borderRadius: "5px",
                                padding: "15px",
                            }}
                        >
                            <h3>
                                {activeOption === "shift"
                                    ? "Shifted File"
                                    : activeOption === "align"
                                      ? "Aligned File"
                                      : activeOption === "clean"
                                        ? "Cleaned File"
                                        : "Translated File"}
                            </h3>
                            {sourceMeta && (
                                <div style={{ marginBottom: "10px" }}>
                                    <p>
                                        <strong>Filename:</strong>{" "}
                                        {processedFile}
                                    </p>
                                    <p>
                                        <strong>Language:</strong>{" "}
                                        {sourceMeta.language}
                                    </p>
                                    <p>
                                        <strong>Encoding:</strong>{" "}
                                        {sourceMeta.encoding}
                                    </p>
                                </div>
                            )}
                            {renderSubtitlePreview(resultPreview)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
