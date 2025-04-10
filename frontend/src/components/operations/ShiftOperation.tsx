import React, { useState, useEffect } from "react";
import { UniversalSubtitlePreview } from "../subtitles/SubtitlePreview";
import { SubtitleFile } from "../../types";

interface ShiftOperationProps {
    onShift: (delay: number, items: number[]) => Promise<any>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    isLoading: boolean;
    subtitleCount: number;
    sessionId: string | null;
    sourceFile: SubtitleFile | null;
}

const ShiftOperation: React.FC<ShiftOperationProps> = ({
    onShift,
    onDownload,
    hasProcessedFile,
    processedFile,
    isLoading,
    subtitleCount,
    sessionId,
    sourceFile,
}) => {
    // State for the shifted file
    const [shiftedFile, setShiftedFile] = useState(null);

    // State for setting up delay
    const [delay, setDelay] = useState<number>(0);

    // State for using specific ranges
    const [useRange, setUseRange] = useState<boolean>(false);
    const [rangeStart, setRangeStart] = useState<number>(1);
    const [rangeEnd, setRangeEnd] = useState<number>(subtitleCount > 1 ? subtitleCount : 2,);
    const [rangeError, setRangeError] = useState<string | null>(null);

    // Update range end when subtitle count changes
    useEffect(() => {
        if (subtitleCount > 0) {
            setRangeEnd(subtitleCount);
            // Also reset rangeStart to 1 when subtitleCount changes
            setRangeStart(1);
        }
    }, [subtitleCount]);

    // Validate range inputs
    useEffect(() => {
        setRangeError(null);

        if (useRange) {
            if (rangeStart < 1 || rangeStart >= subtitleCount) {
                setRangeError(
                    `Start must be between 1 and ${subtitleCount - 1}`,
                );
                return;
            }

            if (rangeEnd <= rangeStart || rangeEnd > subtitleCount) {
                setRangeError(
                    `End must be between ${rangeStart + 1} and ${subtitleCount}`,
                );
                return;
            }
        }
    }, [rangeStart, rangeEnd, useRange, subtitleCount]);

    // Handler to store sfifting results
    const handleShift = async () => {
        const items = useRange ? [rangeStart, rangeEnd] : [];
        const result = await onShift(delay, items);
        console.log("Shift result:", result);
        setShiftedFile(result); // Store the result
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
    const shiftedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="shift-operation-section" style={{ marginTop: "40px", marginBottom: "20px" }}>

            {/* Description of Shift Operation */}
            <div className="shift-description">
                <p>
                    Enter number of milliseconds (1 second = 1000 milliseconds) to shift timing. Number can be positive or negative.
                </p>
            </div>

            {/* Bottom gap below shift button and delay input window */}
            <div className="shift-controls-section"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                }}
            >
                {/* Gaps between shift button and delay input form */}
                <div className="shift-controls-container"
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    {/* Shift button is disabled if file not loaded, delay set to 0 or items range set incorrectly */}
                    <button className="shift-subtitles-button"
                        onClick={handleShift}
                        disabled={isLoading || delay == 0 || (useRange && !!rangeError)}
                        style={{
                            padding: "8px 15px",
                            backgroundColor: "#dc2f02",
                            color: "#dee2e6",
                            border: "none",
                            borderRadius: "2px",
                            cursor:
                                isLoading || (useRange && !!rangeError) || delay == 0
                                    ? "not-allowed"
                                    : "pointer",
                            opacity:
                                isLoading || (useRange && !!rangeError) || delay == 0
                                    ? 0.7
                                    : 1,
                        }}
                    >
                        Shift
                    </button>

                    <label htmlFor="delay-input">by</label>

                    {/* Delay input form, accepts only whole numbers */}
                    <input className="delay-input-form"
                        id="delay-input"
                        type="number"
                        step="1"
                        value={delay}
                        onChange={(e) => setDelay(Math.floor(Number(e.target.value)))}
                        style={{
                            padding: "8px",
                            width: "100px",
                            borderRadius: "2px",
                            border: "1px solid #ccc",
                        }}
                    />
                    <label htmlFor="delay-input">ms</label>
                </div>

                {/* Download button is active only if Shift Operation was performed on a file */}
                {hasProcessedFile && (
                    <button className="download-shifted-file-button"
                        onClick={onDownload}
                        style={{
                            padding: "8px 15px",
                            backgroundColor: "#5a189a",
                            color: "#dee2e6",
                            border: "none",
                            borderRadius: "2px",
                            cursor: "pointer",
                        }}
                    >
                        Download
                    </button>
                )}
            </div>

            {/* Subtitle range selector */}
            <div className="range-controls-section" style={{ marginBottom: "20px" }}>

                {/* Gap between range checkbox and range description */}
                <div className="range-controls-container"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                    }}
                >
                    {/* Checkbox to toggle range selector */}
                    <input className="shift-range-checkbox"
                        type="checkbox"
                        id="use-range"
                        checked={useRange}
                        onChange={(e) => setUseRange(e.target.checked)}
                    />
                    <label htmlFor="use-range">
                        Apply to specific subtitle range
                    </label>
                </div>

                {/* If range checkbox toggled */}
                {useRange && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                        }}
                    >
                        {/* Gap between from range and to range forms */}
                        <div className="range-setting-container"
                            style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                            }}
                        >
                            <label htmlFor="range-start">From subtitle:</label>

                            {/* Range start form, accepts only whole numbers */}
                            <input className="range-start-form"
                                id="range-start"
                                type="number"
                                min={1}
                                max={subtitleCount - 1}
                                value={rangeStart}
                                onChange={(e) =>
                                    setRangeStart(Number(Math.floor(Number(e.target.value))))
                                }
                                style={{
                                    padding: "8px",
                                    width: "80px",
                                    borderRadius: "2px",
                                    border: "1px solid #ccc",
                                }}
                            />

                            <label htmlFor="range-end">To subtitle:</label>

                            {/* Range end form, accepts only whole numbers */}
                            <input className="range-end-form"
                                id="range-end"
                                type="number"
                                min={rangeStart + 1}
                                max={subtitleCount}
                                value={rangeEnd}
                                onChange={(e) =>
                                    setRangeEnd(Number(Math.floor(Number(e.target.value))))
                                }
                                style={{
                                    padding: "8px",
                                    width: "80px",
                                    borderRadius: "2px",
                                    border: "1px solid #ccc",
                                }}
                            />

                            {/* Total subtitles count reminder */}
                            <span
                                style={{ fontSize: "0.8em", color: "#6c757d" }}
                            >
                                (Total: {subtitleCount} subtitles)
                            </span>
                        </div>

                        {/* Show error message if ranges out of bounds */}
                        {rangeError && (
                            <div className="range-error-container"
                                style={{ color: "#cc0000", fontSize: "0.9em" }}
                            >
                                {rangeError}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* File preview section */}
            <div className="shift-preview-section" style={{
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
                    <div className="shifted-file-preview-container" style={{ flex: 1 }}>
                        {shiftedFilePreview}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftOperation;
