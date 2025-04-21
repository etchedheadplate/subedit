import React, { useState, useEffect } from "react";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile, SubtitleMetadata } from "../../types";
import translationData from "../../../../shared/translate.json";

interface TranslateOperationProps {
    onTranslate: (targetLanguage: string, originalLanguage: string, modelName: string, modelThrottle: number) => Promise<any>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
}

const TranslateOperation: React.FC<TranslateOperationProps> = ({
    onTranslate,
    sessionId,
    onDownload,
    sourceFile,
    processedFile,
}) => {
    // State for setting up target language
    const [targetLanguage, setTargetLanguage] = useState<string>("");

    // State for setting up original language
    const [originalLanguage, setOriginalLanguage] = useState<SubtitleMetadata["language"] | null>(null);

    // State to store detected language metadata
    const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

    // Get first model key for default selection
    const defaultModel = Object.keys(translationData.models)[0];

    // State for setting up model
    const [model, setModel] = useState<string>(defaultModel);

    // State for setting up throttle
    const [throttle, setThrottle] = useState<number>(0.5);

    // Effect to set the original language from the source file when metadata is available
    useEffect(() => {
        if (detectedLanguage &&
            detectedLanguage !== originalLanguage &&
            Object.keys(translationData.codes).includes(detectedLanguage)) {
            setOriginalLanguage(detectedLanguage);
        }
    }, [detectedLanguage, originalLanguage]);

    // Handler to receive language info from SubtitlePreview
    const handleSourceLanguageDetected = (metadata: SubtitleMetadata) => {
        if (metadata && metadata.language && originalLanguage === null) {
            setOriginalLanguage(metadata.language);
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
    const handleTranslate = async () => {
        // Get the model name based on selected model key
        await onTranslate(targetLanguage, originalLanguage, model, throttle);
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

    return (
        <div className="translate-operation-section">

            {/* Description of Translate Operation */}
            <div className="operation-description">
                <p>You can translate subtitles using AI models provided by <a href="https://duckduckgo.com/duckduckgo-help-pages/duckai" target="_blank" rel="noopener noreferrer">Duck.ai</a>.</p>

                <p>Since most models have limited context windows, your subtitles will usually be divided into multiple parts and translated one part
                    at a time. The size of the context window varies by model: GPT-4o mini, o3-mini, and Llama 3.3 70B support up to 2048 tokens, while Claude 3 Haiku is
                    estimated to handle around 1024, and Mistral Small 3 24B only 256.</p>

                <p>To comply with usage limits and respect DuckDuckGo's free service, there is a 15-second delay between each request to translate a
                    part of the subtitles. You can try to speed up the process by adjusting the <i>adjusted by</i> slider. This slider controls how many
                    subtitle lines are packed into each request sent to the model.</p>

                <p><b>For the safest and most reliable option, use GPT-4o. Try to avoid Claude and Mistral, as they are more prone to errors due to their limited context.
                    If you encounter errors during the translation process, try adjusting the slider toward the <i>accuracy</i> side for smaller, more manageable chunks.</b></p>
            </div>

            {/* Translate controls section */}
            <div className="operation-controls-container">

                {/* Translate controls block */}
                <div className="operation-controls-items">

                    {/* Original language selector */}
                    <div className="control-item">
                        <p className="control-title">translate from</p>

                        <div className="select-drop-down-items">
                            <select
                                id="languages-list"
                                name="languages"
                                value={originalLanguage || ""}
                                onChange={handleOriginalLanguageChange}
                            >
                                <option value="">Select a language</option>
                                {Object.entries(translationData.codes)
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

                        <div className="select-drop-down-items">
                            <select
                                id="languages-list"
                                name="languages"
                                value={targetLanguage}
                                onChange={handleTargetLanguageChange}
                            >
                                <option value="">Select a language</option>
                                {Object.entries(translationData.codes)
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

                        <div className="select-drop-down-items">
                            <select
                                id="models-list"
                                name="models"
                                value={model}
                                onChange={handleModelChange}
                            >
                                {Object.keys(translationData.models).map((modelKey) => (
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

                        <div className="select-slider-items">
                            {/* Slider */}
                            <input
                                type="range"
                                min="0.01"
                                max="0.99"
                                step="0.01"
                                defaultValue="0.50"
                                className="slider"
                                onChange={(e) => setThrottle(parseFloat(e.target.value))}
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
                <div className="source-file-preview-container" style={{ flex: 1 }}>

                    {/* Translate Button */}
                    <div className="operation-controls-buttons">
                        <button
                            className={`operation-button${(targetLanguage === "" || originalLanguage === "") ? " disabled" : ""}`}
                            onClick={handleTranslate}
                            disabled={targetLanguage == ""}
                        >
                            Translate
                        </button>
                    </div>

                    {/* Source file preview */}
                    {sourceFilePreview}
                </div>

                {/* Translated file preview + Download button */}
                {processedFile && (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>
                        {/* Download Button */}
                        <div className="operation-controls-buttons">
                            <button className="download-button" onClick={onDownload}>Download</button>
                        </div>

                        {/* Translated file preview */}
                        {translatedFilePreview}
                    </div>
                )}
            </div>
        </div >
    );
};

export default TranslateOperation;
