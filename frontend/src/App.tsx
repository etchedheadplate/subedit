import { useState } from "react";
import ShiftOperation from "./components/operations/ShiftOperation";
import AlignOperation from "./components/operations/AlignOperation";
import CleanOperation from "./components/operations/CleanOperation";
import TranslateOperation from "./components/operations/DuckTranslateOperation";
import DragAndDropArea from "./components/DragAndDropArea";
import { useSubtitleOperations } from "./hooks/useSubtitleOperations";
import { useSession } from "./hooks/useSession";
import { useFileUpload } from "./hooks/useFileUpload";
import { OperationType } from "./types";
import "./styles/OperationSection.css";
import "./styles/SubtitlePreview.css";
import "./styles/DragAndDropArea.css";
import "./styles/ErrorMessage.css";
import "./styles/App.css";

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
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        duckTranslateSubtitles,
        getDownloadLink,
        resetResults,
    } = useSubtitleOperations(sessionId, uploadedFile);

    // Local state
    const [activeOption, setActiveOption] = useState<OperationType | null>(null,);

    // Combine errors for display
    const errorMessage = sessionError || uploadError || processingError;
    const isLoading = isUploading || isProcessing;

    // Handle return to initial state when new file uploaded
    const handleFileUpload = async (file: File) => {
        await uploadFile(file);

        // Reset App to option choosing state, currently disabled
        // setActiveOption(null); // After upload completes, reset the active option
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

    const optionLabels: { label: string; key: keyof ProcessingOptions }[] = [
        { label: "Shift", key: "shift" },
        { label: "Align", key: "align" },
        { label: "Clean", key: "clean" },
        { label: "Translate", key: "translate" },
        { label: "Duck Translate", key: "ducktranslate" },
    ];

    return (
        <div className="main-app">

            {/* Header, always present */}
            <div className="main-header">

                {/* Main title */}
                <h1 className="main-title">[subedit]</h1>

                {/* Drag-and-drop Area */}
                <DragAndDropArea
                    onFileUpload={handleFileUpload}
                    isLoading={isLoading}
                    uploadedFile={uploadedFile}
                    className={!uploadedFile ? "blinking" : ""}
                />

                {/* Options Buttons */}
                <div className="main-options">
                    {optionLabels.map(({ label, key }) => (
                        <button
                            className={`main-option-button${activeOption === key ? " active" : ""}`}
                            key={key}
                            onClick={() => handleOptionSelect(key)}
                            disabled={isLoading}
                        >
                            <strong>{label}</strong>
                        </button>
                    ))}
                </div>
            </div>

            {/* Errors, if any */}
            {errorMessage && (
                <div className="error-message">
                    {errorMessage}
                </div>
            )}

            {/* Active option content */}
            {activeOption === "shift" && (
                <ShiftOperation
                    onShift={shiftSubtitles}
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                />
            )}

            {activeOption === "align" && (
                <AlignOperation
                    onAlign={alignSubtitles}
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                    resetResults={resetResults}
                />
            )}

            {activeOption === "clean" && (
                <CleanOperation
                    onClean={cleanSubtitles}
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                />
            )}

            {activeOption === "ducktranslate" && (
                <TranslateOperation
                    onDuckTranslate={duckTranslateSubtitles}
                    sessionId={sessionId}
                    onDownload={handleDownload}
                    sourceFile={uploadedFile}
                    hasProcessedFile={!!processedFile}
                    processedFile={processedFile}
                />
            )}
        </div>
    );
}

export default App;
