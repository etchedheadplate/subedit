import React, { useState, useCallback } from "react";
import ShiftOperation from "./components/operations/ShiftOperation";
import AlignOperation from "./components/operations/AlignOperation";
import CleanOperation from "./components/operations/CleanOperation";
import { useSubtitleOperations } from "./hooks/useSubtitleOperations";
import { useSession } from "./hooks/useSession";
import { useFileUpload } from "./hooks/useFileUpload";
import { OperationType } from "./types";
import "./SubtitlePreview.css";

function App() {
    // Session hook
    const { sessionId, error: sessionError } = useSession();

    // File upload hook
    const {
        uploadedFile,
        isLoading: isUploading,
        error: uploadError,
        uploadFile,
    } = useFileUpload(sessionId);

    // Subtitle operations hook
    const {
        sourcePreview,
        exampleSubtitleCount,
        processedFile,
        isLoading: isProcessing,
        error: processingError,
        subtitleCount,
        fetchSourcePreview,
        fetchExamplePreview,
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        getDownloadLink,
        resetResults,
    } = useSubtitleOperations(sessionId, uploadedFile);

    // Local state
    const [activeOption, setActiveOption] = useState<OperationType | null>(
        null,
    );
    const [dragActive, setDragActive] = useState<boolean>(false);
    // const [exampleDragActive, setExampleDragActive] = useState<boolean>(false);

    // Example file upload state (for Align operation)
    const [uploadedExampleFile, setUploadedExampleFile] = useState<{
        filename: string;
    } | null>(null);
    const [isUploadingExample, setIsUploadingExample] =
        useState<boolean>(false);
    const [exampleUploadError, setExampleUploadError] = useState<string | null>(
        null,
    );

    // References to the file inputs
    const sourceFileInputRef = React.useRef<HTMLInputElement>(null);
    // const exampleFileInputRef = React.useRef<HTMLInputElement>(null);

    // Combine errors for display
    const errorMessage =
        sessionError || uploadError || processingError || exampleUploadError;
    const isLoading = isUploading || isProcessing || isUploadingExample;

    // Handle return to initial state when new file uploaded
    const handleFileUpload = async (file) => {
        await uploadFile(file);

        // After upload completes, reset the active option
        setActiveOption(null);
    };

    // Handle file upload via input element
    const handleUpload = async (inputRef) => {
        if (!inputRef.target.files) return;
        await handleFileUpload(inputRef.target.files[0]);
    };

    // Handle click on the drag-and-drop area
    const handleClick = (inputRef) => {
        if (!isLoading && inputRef.current) {
            inputRef.current.click();
        }
    };

    // Handle drag on the drag-and-drop area
    const handleDrag = useCallback((e: React.DragEvent, setDragActiveState: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActiveState(true);
        } else if (e.type === "dragleave") {
            setDragActiveState(false);
        }
    }, []);

    // Handle drop on the drag-and-drop area
    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith(".srt")) {
                    await handleFileUpload(file);
                } else {
                    // Show error for non-srt files
                    console.error("Only .srt files are allowed");
                }
            }
        },
        [uploadFile],
    );

    // Handle option selection
    const handleOptionSelect = (option: OperationType) => {
        setActiveOption(option);
        resetResults();

        // Reset example file if changing operation type
        if (option !== "align") {
            setUploadedExampleFile(null);
        }

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

    // Handle file upload of the source and example files
    const handleSourceFileUpload = (e) => handleUpload(e);
    // const handleExampleFileUpload = (e) => handleUpload(e);

    // Handle click on the source and example drag-and-drop areas
    const handleSourceAreaClick = () => handleClick(sourceFileInputRef);
    // const handleExampleAreaClick = () => handleClick(exampleFileInputRef);

    // Handle drag on the source and example drag-and-drop areas
    const handleSourceAreaDrag = (e: React.DragEvent) => handleDrag(e, setDragActive);
    // const handleExampleAreaDrag = (e: React.DragEvent) => handleDrag(e, setExampleDragActive);

    // Handle drop on the source and example drag-and-drop areas
    const handleSourceAreaDrop = (e: React.DragEvent) => handleDrop(e);
    // const handleExampleAreaDrop = (e: React.DragEvent) => handleDrop(e);

    // Function to render file metadata and subtitles
    /* const renderFilePreviews = () => {
        return (
            <div className="preview-section" style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                <div className="source-preview">
                    <UniversalSubtitlePreview
                        sessionId={sessionId}
                        subtitleFile={uploadedFile}
                        isDownloadable={false}
                    />
                </div>
                {processedFile && (
                    <div className="processed-preview">
                        <UniversalSubtitlePreview
                            sessionId={sessionId}
                            subtitleFile={processedFile}
                            isDownloadable={true}
                        />
                    </div>
                )}
            </div>
        );
    };*/

    return (
        <div style={{ padding: "20px" }}>
            {/* Centered Header */}
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <h1>[ s u b e d i t ]</h1>

                {/* Hidden file input */}
                <input
                    type="file"
                    accept=".srt"
                    onChange={handleSourceFileUpload}
                    disabled={isLoading}
                    style={{ display: "none" }}
                    id="file-upload"
                    ref={sourceFileInputRef}
                />

                {/* Drag and Drop Zone - Entire area is clickable */}
                <div
                    onClick={handleSourceAreaClick}
                    onDragEnter={handleSourceAreaDrag}
                    onDragLeave={handleSourceAreaDrag}
                    onDragOver={handleSourceAreaDrag}
                    onDrop={handleSourceAreaDrop}
                    style={{
                        width: "50%",
                        margin: "0 auto",
                        height: "120px",
                        border: dragActive
                            ? "2px dashed #646cff"
                            : "2px dashed #dee2e6",
                        borderRadius: "0px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: dragActive
                            ? "rgba(100, 108, 255, 0.08)"
                            : "transparent",
                        transition: "all 0.3s ease",
                        marginBottom: "20px",
                        cursor: isLoading ? "wait" : "pointer",
                    }}
                >
                    {!uploadedFile ? (
                        <>
                            <p>Upload subtitles, fren!</p>
                            <p style={{ fontSize: "0.8em", color: "#6c757d" }}>
                                Drag & drop .srt file or click anywhere in this
                                area
                            </p>
                        </>
                    ) : (
                        <>
                            <p>
                                What do you want to do with{" "}
                                <strong>{uploadedFile.filename}</strong>?
                            </p>
                            <p style={{ fontSize: "0.8em", color: "#6c757d" }}>
                                Select option below or upload new file
                            </p>
                        </>
                    )}
                </div>
            </div>

            {errorMessage && (
                <div
                    style={{
                        backgroundColor: "#ffcccc",
                        color: "#cc0000",
                        padding: "10px",
                        borderRadius: "5px",
                        marginBottom: "20px",
                        textAlign: "center",
                    }}
                >
                    {errorMessage}
                </div>
            )}

            {/* Centered Option Buttons */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginBottom: "20px",
                }}
            >
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
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                    isLoading={isLoading}
                    subtitleCount={subtitleCount}
                />
            )}

            {activeOption === "align" && uploadedFile && (
                <AlignOperation
                    onAlign={alignSubtitles}
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                    isLoading={isLoading}
                    subtitleCount={subtitleCount}
                    exampleSubtitleCount={exampleSubtitleCount}
                    fetchExamplePreview={fetchExamplePreview}
                    hasExampleFile={!!uploadedExampleFile}
                />
            )}

            {activeOption === "clean" && uploadedFile && (
                <CleanOperation
                    onClean={cleanSubtitles}
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                    isLoading={isLoading}
                    subtitleCount={subtitleCount}
                />
            )}
        </div>
    );
}

export default App;
