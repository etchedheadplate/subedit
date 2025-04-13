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
    }) => Promise<any>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    isLoading: boolean;
    subtitleCount: number;
    sessionId: string | null;
    sourceFile: SubtitleFile | null;
}

const CleanOperation: React.FC<CleanOperationProps> = ({
    onClean,
    onDownload,
    hasProcessedFile,
    processedFile,
    isLoading,
    subtitleCount,
    sessionId,
    sourceFile,
}) => {
    // State for the cleaned file
    const [cleanedFile, setCleanedFile] = useState(null);

    // State for choosing options
    const [options, setOptions] = useState({
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        color: true,
        font: true,
    });

    // Handle options change
    const handleOptionChange = (option: keyof typeof options) => {
        setOptions({
            ...options,
            [option]: !options[option],
        });
    };

    // Handle clean operation
    const handleClean = async () => {
        const result = await onClean(options);
        setCleanedFile(result); // Store the result
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
        />
    );

    // Preview of the shifted file
    const cleanedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="clean-operation-section" style={{ marginTop: "40px", marginBottom: "20px" }}>

            {/* Description of Clean Operation */}
            <div className="clean-description">
                <p>
                    Select markups to remove
                </p>
            </div>

            {/* Bottom gap below clean button and option checkboxes */}
            <div className="clean-options-container"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                }}
            >
                {/* Option names mapping */}
                <div className="clean-options-titles" style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                    {Object.entries(options).map(([key, value]) => (
                        <label
                            key={key}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                                minWidth: "120px",
                            }}
                        >
                            {/* Checkboxes for option names */}
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

            <div className="clean-subtitles-button" style={{ display: "flex", gap: "10px" }}>
                <button
                    onClick={handleClean}
                    disabled={
                        isLoading ||
                        Object.values(options).every((option) => !option)
                    }
                    style={{
                        padding: "10px 15px",
                        backgroundColor: "#0000ff",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "2px",
                        cursor:
                            !isLoading &&
                                Object.values(options).some((option) => option)
                                ? "pointer"
                                : "not-allowed",
                        opacity:
                            !isLoading &&
                                Object.values(options).some((option) => option)
                                ? 1
                                : 0.7,
                    }}
                >
                    {isLoading ? "Processing..." : "Clean"}
                </button>

                {/* Download button is active only if Clean Operation was performed on a file */}
                {hasProcessedFile && (
                    <button className="download-cleaned-file-button"
                        onClick={onDownload}
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#008000",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "2px",
                            cursor: "pointer",
                        }}
                    >
                        Download
                    </button>
                )}
            </div>

            {/* File preview section */}
            <div className="file-preview-section" style={{
                display: "flex",
                gap: "20px",
                marginTop: "20px"  // Add some spacing
            }}>
                {/* Source file preview section */}
                <div className="source-file-preview-container" style={{ flex: 1 }}>
                    {sourceFilePreview}
                </div>

                {/* Shifted file preview section - Only show if available */}
                {processedFile && (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>
                        {cleanedFilePreview}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CleanOperation;
