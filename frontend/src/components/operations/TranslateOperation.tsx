import React, { useState } from "react";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";
import translationData from "../../../../shared/translate.json";

interface TranslateOperationProps {
    onTranslate: (targetLanguage: string, modelName: string, modelThrottle: number) => Promise<any>;
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
    // State for setting up language
    const [language, setLanguage] = useState<string>("");

    // Get first model key for default selection
    const defaultModel = Object.keys(translationData.models)[0];

    // State for setting up model
    const [model, setModel] = useState<string>(defaultModel);

    // State for setting up throttle
    const [throttle, setThrottle] = useState<number>(0.4);

    const percentage = (throttle * 100).toFixed(0);
    const isLowAccuracy = throttle > 0.75;
    const isLowSpeed = throttle < 0.25;

    const accuracyLabelClass = `slider-label${isLowAccuracy ? ' slider-label-danger' : ''}`;
    const speedLabelClass = `slider-label${isLowSpeed ? ' slider-label-danger' : ''}`;

    // Handler for language selection change
    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value);
    };

    // Handler for model selection change
    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setModel(e.target.value);
    };

    // Handler to store translation results
    const handleTranslate = async () => {
        // Get the model name based on selected model key
        await onTranslate(language, model, throttle);
        console.log(throttle)
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
            fileType="Source"
        />
    );

    // Preview of the shifted file
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

            {/* Description of Shift Operation */}
            <div className="operation-description">
                <p>Select language to translate.</p>
            </div>

            {/* Translate controls section */}
            <div className="operation-controls-container">

                {/* Translate controls block */}
                <div className="operation-controls-items">

                    {/* Language selector */}
                    <div className="control-item">
                        <p className="control-title">translate to</p>

                        <div className="select-drop-down-items">
                            <select
                                id="languages-list"
                                name="languages"
                                value={language}
                                onChange={handleLanguageChange}
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

                    {/* Shift Button */}
                    <div className="operation-controls-buttons">
                        <button
                            className="operation-button"
                            onClick={handleTranslate}
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
