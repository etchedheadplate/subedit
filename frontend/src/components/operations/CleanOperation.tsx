import React, { useState } from "react";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";

interface CleanOperationProps {
    onClean: (options: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikethrough: boolean;
        color: boolean;
        font: boolean;
    }) => Promise<{ eta: number } | null | undefined>;
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
        await onClean(options);
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
                    return { fontSize: "0.8em", color: '#00b4d8' };
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
            fileType="Source"
            isDownloadable={false}
        />
    );

    // Preview of the cleaned file
    const cleanedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType="Cleaned"
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="clean-operation-section">

            {/* Description of Clean Operation */}
            <div className="operation-description">
                <p>You can clean a subtitle file by removing markup tags. By default, all markup is removed.
                    If you only want to remove specific tags, you can select the ones to target on the right.</p>
                <p>Please note that the <i>All</i> checkbox will remove all markup, not just the tags listed on the right.</p>
            </div>

            {/* Clean controls section */}
            <div className="operation-controls-container">

                {/* Clean controls block */}
                <div className="operation-controls-items">

                    {/* All checkbox first */}
                    <label className="control-item" style={getLabelStyle('all')}>
                        <input className="options-checkboxes"
                            type="checkbox"
                            checked={options.all}
                            onChange={() => handleOptionChange('all')}
                            style={{ marginRight: "8px" }}
                        />
                        All
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
                                    <input className="options-checkboxes"
                                        type="checkbox"
                                        checked={value}
                                        onChange={() =>
                                            handleOptionChange(
                                                key as keyof typeof options,
                                            )
                                        }
                                        style={{ marginRight: "8px" }}
                                    />
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
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
                    <div className="operation-controls-buttons">
                        <button
                            className="operation-button"
                            onClick={handleClean}
                        >
                            Clean
                        </button>
                    </div>

                    {/* Source file preview */}
                    {sourceFilePreview}
                </div>

                {/* Shifted file preview + Download button */}
                {processedFile && (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>
                        {/* Download Button */}
                        <div className="operation-controls-buttons">
                            <button className="download-button" onClick={onDownload}>Download</button>
                        </div>

                        {/* Shifted file preview */}
                        {cleanedFilePreview}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CleanOperation;
