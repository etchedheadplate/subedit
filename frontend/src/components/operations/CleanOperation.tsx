import React, { useState } from "react";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";
import { TranslatedParagraph } from "../translation/LanguageParagraph.tsx";
import { useLanguage } from "../../hooks/useLanguage.ts";

interface CleanOperationProps {
    onClean: (options: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikethrough: boolean;
        color: boolean;
        font: boolean;
    }) => Promise<{ sourceFilename: string; status: string; } | null | undefined>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
}

const CleanOperation: React.FC<CleanOperationProps> = ({
    onClean,
    sessionId,
    onDownload,
    sourceFile,
    processedFile,
}) => {
    // Get translation function from language context
    const { t } = useLanguage();

    // State for choosing options - with default "All" checked
    const [options, setOptions] = useState({
        all: true,
        bold: false,
        color: false,
        strikethrough: false,
        italic: false,
        font: false,
        underline: false,
    });

    // Create mapping between option keys and translation paths
    const optionTranslationPaths = {
        all: 'operations.clean.controlItems.all',
        bold: 'operations.clean.controlItems.bold',
        italic: 'operations.clean.controlItems.italic',
        underline: 'operations.clean.controlItems.underline',
        strikethrough: 'operations.clean.controlItems.strikethrough',
        color: 'operations.clean.controlItems.color',
        font: 'operations.clean.controlItems.font',
    };

    // Loading state to show animation while processing
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Handle options change
    const handleOptionChange = (option: keyof typeof options) => {
        if (option === 'all') {
            // If "All" is being checked, uncheck all other options
            if (!options.all) {
                setOptions({
                    all: true,
                    bold: false,
                    color: false,
                    strikethrough: false,
                    italic: false,
                    font: false,
                    underline: false,
                });
            }
        } else {
            // If any other option is checked or unchecked
            const newOptions = {
                ...options,
                [option]: !options[option as keyof typeof options],
                all: false,
            };

            // Count how many individual options are checked
            const checkedCount = Object.entries(newOptions)
                .filter(([key]) => key !== 'all')
                .filter(([, value]) => value)
                .length;

            // Get total number of individual options
            const totalIndividualOptions = Object.keys(newOptions).filter(key => key !== 'all').length;

            // If all individual options become checked, switch to "All" mode
            if (checkedCount === totalIndividualOptions) {
                setOptions({
                    all: true,
                    bold: false,
                    color: false,
                    strikethrough: false,
                    italic: false,
                    font: false,
                    underline: false,
                });
                return;
            }

            // Check if all individual options are unchecked, then check "All"
            if (checkedCount === 0) {
                newOptions.all = true;
            }

            setOptions(newOptions);
        }
    };

    // Handle clean operation
    const handleClean = async () => {
        setIsLoading(true);
        await onClean(options);
        setIsLoading(false);
    };

    // Get style for option label based on state
    const getLabelStyle = (option: string) => {
        // When All is checked, all other options are grayed out
        if (options.all && option !== 'all') {
            return { fontSize: "0.8em", color: "#6C757D" };
        }

        // When All is unchecked but current option is unchecked
        if (!options.all && !options[option as keyof typeof options]) {
            if (option === 'all') {
                return { color: "#6C757D" };
            }
            return { fontSize: "0.8em", color: "#DEE2E6" };
        }

        // When All is unchecked and current option is checked, apply style based on option name
        if (!options.all && options[option as keyof typeof options]) {
            switch (option) {
                case 'bold':
                    return { fontSize: "0.8em", fontWeight: 'bold' };
                case 'italic':
                    return { fontSize: "0.8em", fontStyle: 'italic' };
                case 'underline':
                    return { fontSize: "0.8em", textDecoration: 'underline' };
                case 'strikethrough':
                    return { fontSize: "0.8em", textDecoration: 'line-through' };
                case 'color':
                    return { fontSize: "0.8em", color: '#5784FF' };
                case 'font':
                    return { fontSize: "0.8em", fontFamily: 'serif' };
                default:
                    return { fontSize: "0.8em" };
            }
        }

        return {};
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            fileType={t('preview.source')}
            isDownloadable={false}
        />
    );

    // Preview of the cleaned file
    const cleanedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType={t('preview.cleaned')}
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="clean-operation-section">

            {/* Description of Clean Operation */}
            <div className="operation-description">
                <TranslatedParagraph
                    path="operations.clean.operationDescription1"
                />

                <TranslatedParagraph
                    path="operations.clean.operationDescription2"
                    components={{
                        all: <b></b>,
                    }}
                />
            </div>

            {/* Clean controls section */}
            <div className="operation-controls-container">

                {/* Clean controls block */}
                <div className="operation-controls-items" title={!sourceFile ? t('operations.clean.errors.uploadSource') : ''}>

                    {/* All checkbox first */}
                    <label className="control-item" style={getLabelStyle('all')}>
                        <input
                            className={`options-checkboxes ${!sourceFile ? " disabled" : ""}`}
                            type="checkbox"
                            checked={options.all}
                            onChange={() => handleOptionChange('all')}
                            style={{ marginRight: "8px" }}
                            disabled={!sourceFile}
                        />
                        {t(optionTranslationPaths.all)}
                    </label>

                    {/* Other checkboxes */}
                    <div className="checkboxes-grid">
                        {Object.entries(options)
                            .filter(([key]) => key !== 'all')
                            .map(([key, value]) => (
                                <label
                                    className="control-item"
                                    key={key}
                                    style={{
                                        ...getLabelStyle(key),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start'
                                    }}
                                >
                                    <input
                                        className={`options-checkboxes ${!sourceFile ? " disabled" : ""}`}
                                        type="checkbox"
                                        checked={value}
                                        onChange={() =>
                                            handleOptionChange(key as keyof typeof options)
                                        }
                                        style={{ marginRight: "8px" }}
                                        disabled={!sourceFile}
                                    />
                                    {t(optionTranslationPaths[key as keyof typeof optionTranslationPaths])}
                                </label>
                            ))}
                    </div>
                </div>
            </div>

            {/* File preview section */}
            <div className="file-preview-section">

                {/* Source file preview + Clean button */}
                <div className="source-file-preview-container" style={{ flex: 1 }}>

                    {/* Clean Button */}
                    <div className="operation-controls-buttons" title={!sourceFile ? t('operations.clean.errors.uploadSource') : ''}>
                        <button
                            className={`operation-button ${(!sourceFile) ? " disabled" : ""}`}
                            onClick={handleClean}
                            disabled={!sourceFile}
                        >
                            {t('operations.clean.cleanButton')}
                        </button>
                    </div>

                    {/* Source file preview */}
                    {sourceFilePreview}
                </div>

                {/* Cleaned file preview + Download button */}
                {processedFile ? (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>
                        {/* Download Button */}
                        <div className="operation-controls-buttons">
                            <button className="download-button" onClick={onDownload}>{t('operations.clean.downloadButton')}</button>
                        </div>

                        {/* Cleaned file preview */}
                        {cleanedFilePreview}
                    </div>
                ) : isLoading ? (
                    <>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default CleanOperation;
