import React, { useState, useEffect } from "react";
import { useSession } from "./hooks/useSession";
import { useFileUpload } from "./hooks/useFileUpload";
import { useSubtitleOperations } from "./hooks/useSubtitleOperations";
import SubtitlePreview from "./components/subtitles/SubtitlePreview";
import ShiftOperation from "./components/operations/ShiftOperation";
import { OperationType } from "./types";

function App() {
    // Custom hooks
    const { sessionId, error: sessionError } = useSession();
    const {
        uploadedFile,
        isLoading: isUploading,
        error: uploadError,
        uploadFile,
    } = useFileUpload(sessionId);

    const {
        sourcePreview,
        sourceMeta,
        resultPreview,
        processedFile,
        isLoading: isProcessing,
        error: processingError,
        fetchSourcePreview,
        shiftSubtitles,
        getDownloadLink,
        resetResults,
    } = useSubtitleOperations(sessionId, uploadedFile);

    // Local state
    const [activeOption, setActiveOption] = useState<OperationType | null>(
        null,
    );

    // Combine errors for display
    const errorMessage = sessionError || uploadError || processingError;
    const isLoading = isUploading || isProcessing;

    // Handle file upload via input element
    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        await uploadFile(event.target.files[0]);
    };

    // Handle option selection
    const handleOptionSelect = (option: OperationType) => {
        setActiveOption(option);
        resetResults();

        // If we have an uploaded file, fetch its preview
        if (uploadedFile && sessionId) {
            fetchSourcePreview();
        }
    };

    // Handle download
    const handleDownload = () => {
        if (processedFile && sessionId) {
            window.location.href = getDownloadLink();
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <h1>[ s u b e d i t ]</h1>

            {!uploadedFile && (
                <div style={{ marginTop: "10px" }}>
                    <p>Upload .srt subtitles, fren!</p>
                </div>
            )}

            {uploadedFile && (
                <div style={{ marginTop: "10px" }}>
                    <p>
                        What do you want to do with{" "}
                        <strong>{uploadedFile.filename}</strong>?
                    </p>
                </div>
            )}

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
                            color: "#dee2e6",
                            border: "0.1em transparent",
                            borderRadius: "2px",
                            backgroundColor: "#008000",
                            cursor: "pointer",
                            display: "inline-block",
                        }}
                    >
                        Upload
                    </label>
                </div>

                {/* Editor options */}
                <div style={{ display: "flex", gap: "10px" }}>
                    {["shift", "align", "clean", "translate"].map((option) => (
                        <button
                            key={option}
                            onClick={() =>
                                handleOptionSelect(option as OperationType)
                            }
                            disabled={!uploadedFile || isLoading}
                            style={{
                                padding: "10px 15px",
                                color:
                                    activeOption === option
                                        ? "#dee2e6"
                                        : !uploadedFile
                                          ? "#6c757d"
                                          : "#dee2e6",
                                border:
                                    activeOption === option
                                        ? "0.1em dashed"
                                        : "0.1em transparent",
                                borderRadius: "0px",
                                cursor: uploadedFile
                                    ? "pointer"
                                    : "not-allowed",
                            }}
                        >
                            <strong>
                                {option.charAt(0).toUpperCase() +
                                    option.slice(1)}
                            </strong>
                        </button>
                    ))}
                </div>
            </div>

            {/* Active option content */}
            {activeOption === "shift" && uploadedFile && (
                <ShiftOperation
                    onShift={shiftSubtitles}
                    onDownload={handleDownload}
                    hasProcessedFile={!!processedFile}
                    isLoading={isLoading}
                />
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
                        <SubtitlePreview preview={sourcePreview} />
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
                            <SubtitlePreview preview={resultPreview} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
