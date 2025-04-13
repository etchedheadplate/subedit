import { useState } from "react";
import ShiftOperation from "./components/operations/ShiftOperation";
import AlignOperation from "./components/operations/AlignOperation";
import CleanOperation from "./components/operations/CleanOperation";
import DragAndDropArea from "./components/DragAndDropArea";
import { useSubtitleOperations } from "./hooks/useSubtitleOperations";
import { useSession } from "./hooks/useSession";
import { useFileUpload } from "./hooks/useFileUpload";
import { OperationType } from "./types";
import "./styles/OperationSection.css";
import "./styles/SubtitlePreview.css";
import "./styles/DragAndDropArea.css";
import "./styles/ErrorMessage.css";

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
        processedFile,
        isLoading: isProcessing,
        error: processingError,
        subtitleCount,
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        getDownloadLink,
        resetResults,
    } = useSubtitleOperations(sessionId, uploadedFile);

    // Local state
    const [activeOption, setActiveOption] = useState<OperationType | null>(null,);

    // Combine errors for display
    const errorMessage = sessionError || uploadError || processingError;
    const isLoading = isUploading || isProcessing;

    // Handle return to initial state when new file uploaded
    const handleFileUpload = async (file) => {
        await uploadFile(file);
        setActiveOption(null); // After upload completes, reset the active option
    };

    // Handle option selection
    const handleOptionSelect = (option: OperationType) => {
        setActiveOption(option);
        resetResults();
    };

    // Handle download
    const handleDownload = () => {
        if (processedFile && sessionId) {
            window.location.href = getDownloadLink();
        }
    };

    return (
        <div style={{ padding: "20px" }}>

            {/* Centered Header */}
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
                <h1>[ s u b e d i t ]</h1>

                <DragAndDropArea
                    onFileUpload={handleFileUpload}
                    isLoading={isLoading}
                    uploadedFile={uploadedFile}
                    className=""
                />
            </div>

            {errorMessage && (
                <div className="error-message">
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
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                    isLoading={isLoading}
                    subtitleCount={subtitleCount}
                    exampleSubtitleCount={exampleSubtitleCount}
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
