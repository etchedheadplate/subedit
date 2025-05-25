import { useState, useEffect } from "react";
import { useSubtitleOperations } from "./hooks/useSubtitleOperations";
import { useSession } from "./hooks/useSession";
import { useFileUpload } from "./hooks/useFileUpload";
import { useLanguage } from "./hooks/useLanguage";
import { apiService } from "./services/apiService";
import LanguageSelector from "./components/translation/LanguageSelector";
import InfoPopup from "./components/InfoPopup";
import ShiftOperation from "./components/operations/ShiftOperation";
import AlignOperation from "./components/operations/AlignOperation";
import CleanOperation from "./components/operations/CleanOperation";
import EngineTranslateOperation from "./components/operations/EngineTranslateOperation";
import DuckTranslateOperation from "./components/operations/DuckTranslateOperation";
import DragAndDropArea from "./components/DragAndDropArea";
import { OperationType, TranslateType } from "./types";
import GitHubLogo from "./assets/github-mark.svg?react";
import engineLogo from "./assets/engine_logo.png";
import ddgLogo from "./assets/ddg_logo.png";
import "./styles/OperationSection.css";
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
        engineTranslateSubtitles,
        duckTranslateSubtitles,
        resetResults,
    } = useSubtitleOperations(sessionId, uploadedFile);

    // State for info button
    const [isInfoPopupOpen, setIsInfoPopupOpen] = useState(false);

    // Get translation function from language context
    const { t } = useLanguage();

    // Local state
    const [activeOption, setActiveOption] = useState<OperationType | null>(null);
    const [activeTranslateType, setActiveTranslateType] = useState<TranslateType>("enginetranslate");

    // Combine errors for display
    const errorMessage = sessionError || uploadError || processingError;
    const isLoading = isUploading || isProcessing;

    // Handle info button clics
    const handleInfoButtonClick = () => {
        setIsInfoPopupOpen(!isInfoPopupOpen);
    };
    const handleCloseInfoPopup = () => {
        setIsInfoPopupOpen(false);
    };

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

    // Handle translate type selection
    const handleTranslateTypeSelect = (type: TranslateType) => {
        setActiveTranslateType(type);
        resetResults();
    };

    // Handle download
    const handleDownload = () => {
        if (processedFile && sessionId) {
            apiService.downloadFile(sessionId, processedFile.filename);
        }
    };

    // Send client erros to backend for logging
    useEffect(() => {
        if (errorMessage) {
            apiService.logClientError(errorMessage);
        }
    }, [errorMessage]);

    const optionLabels: { label: string; key: OperationType; icon?: string }[] = [
        { label: `${t('optionLabels.shift')}`, key: "shift" },
        { label: t('optionLabels.align'), key: "align" },
        { label: t('optionLabels.clean'), key: "clean" },
        { label: t('optionLabels.translate'), key: "translate" },
    ];

    const translateOptionLabels: { label: string; key: TranslateType; icon?: string }[] = [
        { label: t('optionLabels.service'), key: "enginetranslate", icon: engineLogo, },
        { label: t('optionLabels.duck'), key: "ducktranslate", icon: ddgLogo, },
    ];

    // Is any translation option active
    const isTranslateActive = activeOption === "translate";

    return (
        <div className="main-app">

            <div className="background-container">
                <div className="tile-layer" />
                <div className="overlay-image" />
            </div>
            <div className="main-header">
                <button
                    className="info-button"
                    onClick={handleInfoButtonClick}
                    title="Information"
                >
                    i
                </button>

                <div className="github-icon-wrapper">
                    <a href="https://github.com/etchedheadplate/subedit" target="_blank" rel="noopener noreferrer">
                        <GitHubLogo className="github-icon" />
                    </a>
                </div>

                <div className="language-selector-container">
                    <LanguageSelector />
                </div>
            </div>
            {/* Header, always present */}
            <div className="main-block">

                {/* Main title and language selector */}
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
                    {optionLabels.map(({ label, key, icon }) => (
                        <button
                            className={`main-option-button${activeOption === key ? " active" : ""}`}
                            key={key}
                            onClick={() => handleOptionSelect(key)}
                            disabled={isLoading}
                        >
                            {icon && (
                                <img
                                    src={icon}
                                    alt={`${label} icon`}
                                    className="option-icon"
                                />
                            )}
                            <strong>{label}</strong>
                        </button>
                    ))}
                </div>

                {/* Translation Submenu */}
                {isTranslateActive && (
                    <div className="main-options">
                        {translateOptionLabels.map(({ label, key, icon }) => (
                            <button
                                className={`main-option-button${activeTranslateType === key ? " active" : ""}`}
                                key={key}
                                onClick={() => handleTranslateTypeSelect(key)}
                                disabled={isLoading}
                            >
                                {icon && (
                                    <img
                                        src={icon}
                                        alt={`${label} icon`}
                                        className="option-icon"
                                    />
                                )}
                                <strong>{label}</strong>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Errors, if any */}
            {
                errorMessage && (
                    <div className="error-message">
                        <p>
                            <strong>{t('defaultErrorMessage') || "An error occurred. Please try again later."}</strong>
                        </p>
                    </div>
                )
            }

            {/* Active option content */}
            {
                activeOption === "shift" && (
                    <ShiftOperation
                        onShift={shiftSubtitles}
                        sessionId={sessionId}
                        onDownload={handleDownload}
                        sourceFile={uploadedFile}
                        hasProcessedFile={!!processedFile}
                        processedFile={processedFile}
                    />
                )
            }

            {
                activeOption === "align" && (
                    <AlignOperation
                        onAlign={alignSubtitles}
                        sessionId={sessionId}
                        onDownload={handleDownload}
                        sourceFile={uploadedFile}
                        hasProcessedFile={!!processedFile}
                        processedFile={processedFile}
                        resetResults={resetResults}
                    />
                )
            }

            {
                activeOption === "clean" && (
                    <CleanOperation
                        onClean={cleanSubtitles}
                        sessionId={sessionId}
                        onDownload={handleDownload}
                        sourceFile={uploadedFile}
                        hasProcessedFile={!!processedFile}
                        processedFile={processedFile}
                    />
                )
            }

            {
                isTranslateActive && activeTranslateType === "enginetranslate" && (
                    <EngineTranslateOperation
                        onEngineTranslate={engineTranslateSubtitles}
                        sessionId={sessionId}
                        onDownload={handleDownload}
                        sourceFile={uploadedFile}
                        hasProcessedFile={!!processedFile}
                        processedFile={processedFile}
                    />
                )
            }

            {
                isTranslateActive && activeTranslateType === "ducktranslate" && (
                    <DuckTranslateOperation
                        onDuckTranslate={duckTranslateSubtitles}
                        sessionId={sessionId}
                        onDownload={handleDownload}
                        sourceFile={uploadedFile}
                        hasProcessedFile={!!processedFile}
                        processedFile={processedFile}
                    />
                )
            }

            <InfoPopup
                isOpen={isInfoPopupOpen}
                onClose={handleCloseInfoPopup}
            />
        </div >
    );
}

export default App;
