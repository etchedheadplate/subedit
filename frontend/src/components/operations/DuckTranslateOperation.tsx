import React, { useState, useEffect } from "react";
import UniversalSubtitlePreview from "../SubtitlePreview";
import { SubtitleFile, SubtitleMetadata } from "../../types";
import duckTranslationData from "../../../../shared/duck.json";
import loadingAnimation from "../../assets/loading.gif";

const DEBUG: boolean = import.meta.env.VITE_DEBUG === "true";

interface DuckTranslateResult {
    eta: number;
}

interface DuckTranslateOperationProps {
    onDuckTranslate: (
        targetLanguage: string,
        originalLanguage: string,
        modelName: string,
        modelThrottle: number
    ) => Promise<DuckTranslateResult | null | undefined>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
}

const DuckTranslateOperation: React.FC<DuckTranslateOperationProps> = ({
    onDuckTranslate,
    sessionId,
    onDownload,
    sourceFile,
    processedFile,
}) => {
    // State for setting up target language
    const [targetLanguage, setTargetLanguage] = useState<string>("");

    // State for setting up original language
    const [originalLanguage, setOriginalLanguage] = useState<SubtitleMetadata["language"]>("");

    // State to store detected language metadata
    const [detectedLanguage,] = useState<string | null>(null);

    // Get first model key for default selection
    const defaultModel = Object.keys(duckTranslationData.models)[0];

    // State for setting up model
    const [model, setModel] = useState<string>(defaultModel);

    // State for setting up throttle
    const [throttle, setThrottle] = useState<number>(0.5);

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
            Object.keys(duckTranslationData.codes).includes(detectedLanguage)) {
            setOriginalLanguage(detectedLanguage);
        }
    }, [detectedLanguage, originalLanguage]);

    // Handler to receive language info from SubtitlePreview
    const handleSourceLanguageDetected = (metadata: SubtitleMetadata) => {
        if (metadata && metadata.language && originalLanguage === "") {
            setOriginalLanguage(metadata.language);
        }

        // Store the ETA for use when translation starts
        if (metadata && metadata.duck_eta) {
            setTranslationEta(metadata.duck_eta);
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

    // Handler for model selection change
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setModel(e.target.value);
    };

    // Handler to store translation results
    const handleDuckTranslate = async () => {
        // Set translation in progress
        setIsTranslating(true);

        try {
            // Start the translation and get ETA
            const result = await onDuckTranslate(targetLanguage, originalLanguage, model, throttle);

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
            return `${minutes} minutes`;
        } else if (minutes === 1) {
            return "1 minute";
        } else {
            return "less than 1 minute";
        }
    };

    // Change label titles based on throttle value
    const percentage = (throttle * 100).toFixed(0);
    const isLowAccuracy = throttle > 0.75;
    const isLowSpeed = throttle < 0.25;
    const accuracyLabelClass = `slider-label${isLowAccuracy ? ' slider-label-danger' : ''}`;
    const speedLabelClass = `slider-label${isLowSpeed ? ' slider-label-danger' : ''}`;

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
            fileType="Source"
            onMetadataLoaded={handleSourceLanguageDetected}
        />
    );

    // Preview of the translated file
    const translatedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType="Translated"
            isDownloadable={true}
        />
    ) : null;

    // Translation timer component with GIF image and approximate time
    const translationTimer = (
        <div className="translation-progress">
            <img src={loadingAnimation} alt="Translation in progress" />
            <p className="translation-progress-eta">ETA: {formatTime(remainingTime)}</p>
            <p className="translation-progress-text">This may take longer for Claude and Mistral.</p>
        </div>
    );

    return (
        <div className="duck-translate-operation-section">

            {/* Description of Translate Operation */}
            <div className="operation-description">
                {!DEBUG && (
                    <p className="debug-message">
                        This feature is available only in{' '}
                        <a href="https://github.com/etchedheadplate/subedit" target="_blank" rel="noopener noreferrer"><b>self-hosting</b></a>{' '}
                        mode.
                    </p>
                )}

                {/* Conditionally apply muted styling */}
                <div className={!DEBUG ? 'muted-text' : ''}>
                    <p>
                        You can translate subtitles using AI models provided by{' '}
                        <a href="https://duckduckgo.com/duckduckgo-help-pages/duckai" target="_blank" rel="noopener noreferrer">Duck.ai</a>.
                    </p>

                    <p>
                        Since most models have limited context windows, your subtitles will usually be divided into multiple parts and translated one part
                        at a time. The size of the context window varies by model: GPT-4o mini, o3-mini, and Llama 3.3 70B support up to 2048 tokens, while
                        Claude 3 Haiku is estimated to handle around 1024, and Mistral Small 3 24B only 256.
                    </p>

                    <p>
                        To comply with usage limits and respect DuckDuckGo's free service, there is a 15-second delay between each request to translate a
                        part of the subtitles. You can try to speed up the process by adjusting the <i>adjusted by</i> slider. This slider controls how many
                        subtitle lines are packed into each request sent to the model.
                    </p>

                    <p>
                        <b>
                            For the safest and most reliable option, use GPT-4o. Try to avoid Claude and Mistral, as they are more prone to errors due to their
                            limited context. If you encounter errors during the translation process, try adjusting the slider toward the <i>accuracy</i> side
                            for smaller, more manageable chunks.
                        </b>
                    </p>
                </div>
            </div>

            {/* Translate controls section */}
            <div className="operation-controls-container">

                {/* Translate controls block */}
                <div className="operation-controls-items">

                    {/* Original language selector */}
                    <div className="control-item">
                        <p className="control-title">translate from</p>

                        <div
                            className="select-drop-down-items"
                            title={
                                !DEBUG
                                    ? "Available only when self-hosting"
                                    : !sourceFile
                                        ? "Upload source file"
                                        : isTranslating
                                            ? "Wait for translation to finish"
                                            : ""
                            }
                        >
                            <select
                                className={`drop-down-items ${!DEBUG || !sourceFile || isTranslating ? " disabled" : ""}`}
                                id="languages-list"
                                name="languages"
                                value={originalLanguage || ""}
                                onChange={handleOriginalLanguageChange}
                                disabled={!DEBUG || !sourceFile || isTranslating}
                            >
                                <option value="">Select a language</option>
                                {Object.entries(duckTranslationData.codes)
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
                        <p className="control-title">translate to</p>

                        <div
                            className="select-drop-down-items"
                            title={
                                !DEBUG
                                    ? "Available only when self-hosting"
                                    : !sourceFile
                                        ? "Upload source file"
                                        : isTranslating
                                            ? "Wait for translation to finish"
                                            : ""
                            }
                        >
                            <select
                                className={`drop-down-items ${!DEBUG || !sourceFile || isTranslating ? " disabled" : ""}`}
                                id="languages-list"
                                name="languages"
                                value={targetLanguage}
                                onChange={handleTargetLanguageChange}
                                disabled={!DEBUG || !sourceFile || isTranslating}
                            >
                                <option value="">Select a language</option>
                                {Object.entries(duckTranslationData.codes)
                                    .sort((a, b) => a[1].localeCompare(b[1])) // Sort alphabetically by language name
                                    .map(([code, name]) => (
                                        <option key={code} value={code}>
                                            {name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Model selector */}
                    <div className="control-item">
                        <p className="control-title">with model</p>

                        <div
                            className="select-drop-down-items"
                            title={
                                !DEBUG
                                    ? "Available only when self-hosting"
                                    : !sourceFile
                                        ? "Upload source file"
                                        : isTranslating
                                            ? "Wait for translation to finish"
                                            : ""
                            }
                        >
                            <select
                                className={`drop-down-items ${!DEBUG || !sourceFile || isTranslating ? " disabled" : ""}`}
                                id="models-list"
                                name="models"
                                value={model}
                                onChange={handleModelChange}
                                disabled={!DEBUG || !sourceFile || isTranslating}
                            >
                                {Object.keys(duckTranslationData.models).map((modelKey) => (
                                    <option key={modelKey} value={modelKey}>
                                        {modelKey}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Throttle selector */}
                    <div className="control-item">
                        <p className="control-title">adjusted by</p>

                        <div
                            className="select-slider-items"
                            title={
                                !DEBUG
                                    ? "Available only when self-hosting"
                                    : !sourceFile
                                        ? "Upload source file"
                                        : isTranslating
                                            ? "Wait for translation to finish"
                                            : ""
                            }
                        >
                            {/* Slider */}
                            <input
                                className={`slider ${!DEBUG || !sourceFile || isTranslating ? " disabled" : ""}`}
                                type="range"
                                min="0.01"
                                max="0.99"
                                step="0.01"
                                defaultValue="0.50"
                                onChange={(e) => setThrottle(parseFloat(e.target.value))}
                                disabled={!DEBUG || !sourceFile || isTranslating}
                            />

                            {/* Bottom row: left label, value, right label */}
                            <div className="slider-info-row">
                                <span className={accuracyLabelClass}>accuracy {100 - Number(percentage)}%</span>
                                <span className={speedLabelClass}>{percentage}% speed</span>
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
                                ? "Upload source file"
                                : originalLanguage === ""
                                    ? "Select 'from' language"
                                    : targetLanguage === ""
                                        ? "Select 'to' language"
                                        : isTranslating
                                            ? "Wait for translation to finish"
                                            : ""
                        }
                    >
                        <button
                            className={`operation-button${(!sourceFile || targetLanguage === "" || originalLanguage === "" || isTranslating) ? " disabled" : ""}`}
                            onClick={handleDuckTranslate}
                            disabled={!sourceFile || targetLanguage === "" || originalLanguage === "" || isTranslating}
                        >
                            Translate
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
                                    <button className="download-button" onClick={onDownload}>Download</button>
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

export default DuckTranslateOperation;
