import React, { useState } from "react";
import ShiftOperation from "./components/operations/ShiftOperation";
import DualSubtitlePreview from "./components/subtitles/DualSubtitlePreview";
import { useSubtitleOperations } from "./hooks/useSubtitleOperations";
import { useSession } from "./hooks/useSession";
import { useFileUpload } from "./hooks/useFileUpload";
import { OperationType } from "./types";
import "./SubtitlePreview.css";

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
        resultMeta,
        processedFile,
        isLoading: isProcessing,
        error: processingError,
        subtitleCount,
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

    // Rendering the metadata separately
    const renderMetadataSection = () => {
        if (!uploadedFile || !sourcePreview) return null;

        return (
            <div className="metadata-sections">
                {/* Source file metadata */}
                <div className="metadata-container">
                    {sourceMeta && (
                        <div className="metadata-content">
                            <p>
                                <strong>Filename:</strong>{" "}
                                {uploadedFile?.filename}
                            </p>
                            <p>
                                <strong>Language:</strong>{" "}
                                {sourceMeta.language || "Unknown"}
                            </p>
                            <p>
                                <strong>Encoding:</strong>{" "}
                                {sourceMeta.encoding || "Unknown"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Result file metadata, only shown if there's a result */}
                {resultPreview && resultMeta && (
                    <div className="metadata-container">
                        <h3>
                            {activeOption &&
                                `${activeOption.charAt(0).toUpperCase() + activeOption.slice(1)}ed File Metadata`}
                        </h3>
                        <div className="metadata-content">
                            <p>
                                <strong>Filename:</strong> {processedFile}
                            </p>
                            <p>
                                <strong>Language:</strong>{" "}
                                {resultMeta.language || "Unknown"}
                            </p>
                            <p>
                                <strong>Encoding:</strong>{" "}
                                {resultMeta.encoding || "Unknown"}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
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
                    subtitleCount={subtitleCount}
                />
            )}

            {/* Metadata section */}
            {activeOption && sourcePreview && renderMetadataSection()}

            {/* Subtitle preview section */}
            {activeOption && sourcePreview && (
                <DualSubtitlePreview
                    sourcePreview={sourcePreview}
                    sourceMeta={sourceMeta}
                    resultPreview={resultPreview}
                    resultMeta={resultMeta}
                    sourceTitle="Original Subtitles"
                    resultTitle={
                        resultPreview
                            ? `${
                                  activeOption.charAt(0).toUpperCase() +
                                  activeOption.slice(1)
                              }ed Subtitles`
                            : ""
                    }
                />
            )}
        </div>
    );
}

export default App;
