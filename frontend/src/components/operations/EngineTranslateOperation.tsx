import React, { useState, useEffect } from "react";
import UniversalSubtitlePreview from "../SubtitlePreview";
import { SubtitleFile, SubtitleMetadata } from "../../types";
import engineTranslationData from "../../../../shared/engines.json";
import loadingAnimation from "../../assets/loading.gif";
import { TranslatedParagraph } from "../translation/LanguageParagraph.tsx";
import { useLanguage } from "../../hooks/useLanguage.ts";

interface EngineTranslateResult {
    eta: number;
}

interface EngineTranslateOperationProps {
    onEngineTranslate: (
        targetLanguage: string,
        originalLanguage: string,
        engine: string,
        cleanMarkup: boolean
    ) => Promise<EngineTranslateResult | null | undefined>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
}

const EngineTranslateOperation: React.FC<EngineTranslateOperationProps> = ({
    onEngineTranslate,
    sessionId,
    onDownload,
    sourceFile,
    processedFile,
}) => {
    // Get translation function from language context
    const { t } = useLanguage();

    // State for setting up target language
    const [targetLanguage, setTargetLanguage] = useState<string>("");

    // State for setting up original language
    const [originalLanguage, setOriginalLanguage] = useState<SubtitleMetadata["language"]>("");

    // State to store detected language metadata
    const [detectedLanguage,] = useState<string | null>(null);

    // Get first engine key for default selection
    const defaultEngine = Object.keys(engineTranslationData.engines)[0];

    // State for setting up engine
    const [engine, setEngine] = useState<string>(defaultEngine);

    // State for setting up cleanMarkup
    const [cleanMarkup, setCleanMarkup] = useState<boolean>(true);

    // State for tracking if translation is in progress
    const [isTranslating, setIsTranslating] = useState<boolean>(false);

    // State for tracking remaining time for translation
    const [remainingTime, setRemainingTime] = useState<number>(0);

    // State to store the ETA for translation
    const [, setTranslationEta] = useState<number>(0);

    // Effect to set the original language from the source file when metadata is available
    useEffect(() => {
        if (detectedLanguage &&
            detectedLanguage !== originalLanguage &&
            Object.keys(engineTranslationData.codes).includes(detectedLanguage)) {
            setOriginalLanguage(detectedLanguage);
        }
    }, [detectedLanguage, originalLanguage]);

    // Handler to receive language info from SubtitlePreview
    const handleSourceLanguageDetected = (metadata: SubtitleMetadata) => {
        if (metadata && metadata.language && originalLanguage === "") {
            setOriginalLanguage(metadata.language);
        }

        // Store the ETA for use when translation starts
        if (metadata && metadata.engine_eta) {
            setTranslationEta(metadata.engine_eta);
        }
    };

    // Handler for target language selection change
    const handleOriginalLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setOriginalLanguage(e.target.value);
    };

    // Handler for original language selection change
    const handleTargetLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTargetLanguage(e.target.value);
    };

    // Handler for engine selection change
    const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setEngine(e.target.value);
    };

    // Handle cleanMarkup flag
    const handleCleanMarkup = () => {
        setCleanMarkup(prevMarkup => !prevMarkup);
    };

    // Helper function to get compatible engines for the selected languages
    const getCompatibleEngines = (originalLang: string, targetLang: string): string[] => {
        return Object.keys(engineTranslationData.engines).filter(engineKey => {
            // Type assertion to tell TypeScript that engineKey is a valid key
            const engine = engineTranslationData.engines[engineKey as keyof typeof engineTranslationData.engines];
            const engineLanguages = engine.languages;

            // Get the original language name from the code
            const originalLanguageName = engineTranslationData.codes[originalLang as keyof typeof engineTranslationData.codes];

            // Get the target language name from the code
            const targetLanguageName = engineTranslationData.codes[targetLang as keyof typeof engineTranslationData.codes];

            // Check if both language names exist and are supported by this engine
            return originalLanguageName &&
                targetLanguageName &&
                Object.prototype.hasOwnProperty.call(engineLanguages, originalLanguageName) &&
                Object.prototype.hasOwnProperty.call(engineLanguages, targetLanguageName);
        });
    };

    // Handler to store translation results
    const handleEngineTranslate = async () => {
        // Set translation in progress
        setIsTranslating(true);

        try {
            // Start the translation and get ETA
            const result = await onEngineTranslate(targetLanguage, originalLanguage, engine, cleanMarkup);

            // If we got a result with ETA, use it for countdown
            if (result && result.eta) {
                setTranslationEta(result.eta);
                setRemainingTime(result.eta);
            }
        } catch (error) {
            console.error("Translation error:", error);
            setIsTranslating(false);
        }
        // isTranslating will be updated by the parent component when polling completes
    };

    // Effect to monitor processedFile and update isTranslating
    useEffect(() => {
        if (processedFile) {
            setIsTranslating(false);
        }
    }, [processedFile]);

    // Effect to handle the countdown timer
    useEffect(() => {
        let timerId: number | null = null;

        // Only run timer when translation is in progress and we have remaining time
        if (isTranslating && remainingTime > 0) {
            timerId = setInterval(() => {
                setRemainingTime(prevTime => {
                    // Decrease time by 1 second
                    const newTime = prevTime - 1;

                    // If time is up, clear the interval
                    if (newTime <= 0) {
                        if (timerId) clearInterval(timerId);
                        return 0;
                    }

                    return newTime;
                });
            }, 1000); // Update every second
        }

        // Clean up timer when component unmounts or translation completes
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [isTranslating, remainingTime]);

    /// Format the remaining time as approximate minutes
    const formatTime = (seconds: number): string => {
        const minutes = Math.ceil(seconds / 60); // Round up to nearest minute

        if (minutes > 1) {
            return `${minutes} ${t('eta.minutes')}`;
        } else if (minutes === 1) {
            return t('eta.oneMinute');
        } else {
            return t('eta.lessOneMinute');
        }
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
            fileType={t('preview.source')}
            onMetadataLoaded={handleSourceLanguageDetected}
        />
    );

    // Preview of the translated file
    const translatedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType={t('preview.translated')}
            isDownloadable={true}
        />
    ) : null;

    // Translation timer component with GIF image and approximate time
    const translationTimer = (
        <div className="translation-progress">
            <img src={loadingAnimation} alt="Translation in progress" />
            <p className="translation-progress-eta">{t('eta.etaTite')}: {formatTime(remainingTime)}</p>
            <p className="translation-progress-text">{t('eta.longerService')}</p>
        </div>
    );

    return (
        <div className="engine-translate-operation-section">

            {/* Description of Translate Operation */}
            <div className="operation-description">

                <TranslatedParagraph
                    path="operations.service.operationDescription1"
                    components={{
                        googleLink: <a href="https://support.google.com/translate/" target="_blank" rel="noopener noreferrer"></a>,
                        mymemoryLink: <a href="https://mymemory.translated.net/doc/" target="_blank" rel="noopener noreferrer"></a>,
                    }}
                />

                <TranslatedParagraph
                    path="operations.service.operationDescription2"
                />

                <TranslatedParagraph
                    path="operations.service.operationDescription3"
                />
            </div>

            {/* Translate controls section */}
            <div className="operation-controls-container">

                {/* Translate controls block */}
                <div className="operation-controls-items">

                    {/* Original language selector */}
                    <div className="control-item">
                        <p className="control-title">{t('operations.service.controlItems.translateFrom')}</p>

                        <div
                            className="select-drop-down-items"
                            title={
                                !sourceFile
                                    ? t('operations.service.errors.uploadSource')
                                    : isTranslating
                                        ? t('operations.service.errors.waitFinish')
                                        : ""
                            }
                        >
                            <select
                                className={`drop-down-items ${!sourceFile || isTranslating ? " disabled" : ""}`}
                                id="languages-list"
                                name="languages"
                                value={originalLanguage || ""}
                                onChange={handleOriginalLanguageChange}
                                disabled={!sourceFile || isTranslating}
                            >
                                <option value="">{t('operations.service.controlItems.selectLanguage')}</option>
                                {Object.entries(engineTranslationData.codes)
                                    .sort((a, b) => a[1].localeCompare(b[1])) // Sort alphabetically by language name
                                    .map(([code, name]) => (
                                        <option key={code} value={code}>
                                            {name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Target language selector */}
                    <div className="control-item">
                        <p className="control-title">{t('operations.service.controlItems.translateTo')}</p>

                        <div
                            className="select-drop-down-items"
                            title={
                                !sourceFile
                                    ? t('operations.service.errors.uploadSource')
                                    : isTranslating
                                        ? t('operations.service.errors.waitFinish')
                                        : ""
                            }
                        >
                            <select
                                className={`drop-down-items ${!sourceFile || isTranslating ? " disabled" : ""}`}
                                id="languages-list"
                                name="languages"
                                value={targetLanguage}
                                onChange={handleTargetLanguageChange}
                                disabled={!sourceFile || isTranslating}
                            >
                                <option value="">{t('operations.service.controlItems.selectLanguage')}</option>
                                {Object.entries(engineTranslationData.codes)
                                    .sort((a, b) => a[1].localeCompare(b[1])) // Sort alphabetically by language name
                                    .map(([code, name]) => (
                                        <option key={code} value={code}>
                                            {name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Engine selector */}
                    <div className="control-item">
                        <p className="control-title">{t('operations.service.controlItems.withService')}</p>

                        <div
                            className="select-drop-down-items"
                            title={
                                !sourceFile
                                    ? t('operations.service.errors.uploadSource')
                                    : isTranslating
                                        ? t('operations.service.errors.waitFinish')
                                        : ""
                            }
                        >
                            <select
                                className={`drop-down-items ${!sourceFile || isTranslating ? " disabled" : ""}`}
                                id="engines-list"
                                name="engines"
                                value={engine}
                                onChange={handleEngineChange}
                                disabled={!sourceFile || isTranslating}
                            >
                                {originalLanguage && targetLanguage ? (
                                    getCompatibleEngines(originalLanguage, targetLanguage).map((engineKey) => (
                                        <option key={engineKey} value={engineKey}>
                                            {engineKey}
                                        </option>
                                    ))
                                ) : (
                                    Object.keys(engineTranslationData.engines).map((engineKey) => (
                                        <option key={engineKey} value={engineKey}>
                                            {engineKey}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Controls for Markup flag */}
                    <div className="control-item">
                        <p className="control-title">{t('operations.service.controlItems.markup')}</p>
                        <div className="select-drop-down-items">
                            <div className="select-checkboxes">
                                <label
                                    className="range-text"
                                    title={
                                        !sourceFile
                                            ? t('operations.service.errors.uploadSource')
                                            : isTranslating
                                                ? t('operations.service.errors.waitFinish')
                                                : ""
                                    }
                                >
                                    <input
                                        className={`checkbox ${!sourceFile || isTranslating ? " disabled" : ""}`}
                                        type="checkbox"
                                        checked={cleanMarkup}
                                        onChange={handleCleanMarkup}
                                        style={{ marginRight: "8px" }}
                                        disabled={!sourceFile || isTranslating}
                                    />
                                    {t('operations.service.controlItems.clean')}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* File preview section */}
            <div className="file-preview-section">
                {/* Source file preview + Translate button */}
                <div className="source-file-preview-container" style={{ flex: (processedFile || isTranslating) ? 1 : 2 }}>
                    {/* Translate Button */}
                    <div
                        className="operation-controls-buttons"
                        title={
                            !sourceFile
                                ? t('operations.service.errors.uploadSource')
                                : originalLanguage === ""
                                    ? t('operations.service.errors.selectFrom')
                                    : targetLanguage === ""
                                        ? t('operations.service.errors.selectTo')
                                        : isTranslating
                                            ? t('operations.service.errors.waitFinish')
                                            : ""
                        }
                    >
                        <button
                            className={`operation-button${(!sourceFile || targetLanguage === "" || originalLanguage === "" || isTranslating) ? " disabled" : ""}`}
                            onClick={handleEngineTranslate}
                            disabled={!sourceFile || targetLanguage === "" || originalLanguage === "" || isTranslating}
                        >
                            {t('operations.service.serviceButton')}
                        </button>
                    </div>

                    {/* Source file preview */}
                    {sourceFilePreview}
                </div>

                {/* Timer + Invisible spacer or Translated file preview + Download button */}
                {(processedFile || isTranslating) && (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>

                        {isTranslating ? (
                            <>
                                {/* Invisible spacer to match Translate/Download buttons */}
                                <div className="operation-controls-buttons" style={{ visibility: "hidden" }}>
                                    <button className="operation-button">Invisible spacer</button>
                                </div>

                                {/* Timer */}
                                {translationTimer}
                            </>
                        ) : processedFile ? (
                            <>
                                {/* Download Button */}
                                <div className="operation-controls-buttons">
                                    <button className="download-button" onClick={onDownload}>{t('operations.service.downloadButton')}</button>
                                </div>

                                {/* Translated file preview */}
                                {translatedFilePreview}
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div >
    );
};

export default EngineTranslateOperation;
