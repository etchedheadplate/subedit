import React, { useState, useEffect } from "react";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";

interface ShiftOperationProps {
    onShift: (delay: number, items?: number[]) => Promise<{ eta: number } | null | undefined>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
}

const ShiftOperation: React.FC<ShiftOperationProps> = ({
    onShift,
    sessionId,
    onDownload,
    sourceFile,
    processedFile,
}) => {
    // State to store the subtitle count from the preview
    const [subtitleCount, setSubtitleCount] = useState<number>(1);

    // State for setting up delay
    const [delay, setDelay] = useState<number>(1000);

    // State for using specific ranges
    const [rangeStart, setRangeStart] = useState<number>(1);
    const [rangeEnd, setRangeEnd] = useState<number>(subtitleCount > 1 ? subtitleCount : 2,);

    // Loading state to show animation while processing
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Update range end when subtitle count changes
    useEffect(() => {
        if (subtitleCount > 0) {
            setRangeEnd(subtitleCount);
            setRangeStart(1);
        }
    }, [subtitleCount]);

    // Callback to receive subtitle count from preview
    const handleSubtitleCountChange = (count: number) => {
        setSubtitleCount(count);
    };

    // Handler to store shifting results
    const handleShift = async () => {
        setIsLoading(true);
        const items = [rangeStart, rangeEnd];
        await onShift(delay, items);
        setIsLoading(false);
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
            fileType="Source"
            onSubtitleCountChange={handleSubtitleCountChange}
        />
    );

    // Preview of the shifted file
    const shiftedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType="Shifted"
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="shift-operation-section">

            {/* Description of Shift Operation */}
            <div className="operation-description">
                <p>You can shift subtitle timing by a fixed number of milliseconds (1 second = 1000 milliseconds).
                    The value can be positive or negative. By default, all subtitles in the file are shifted.
                    If you only want to shift a specific section, you can specify the range of subtitle lines to adjust.</p>
                <p>For gradual time shifting, use the Align option instead.</p>
            </div>

            {/* Shift controls section */}
            <div className="operation-controls-container">

                {/* Shift controls block */}
                <div className="operation-controls-items">

                    {/* Delay input control */}
                    <div className="control-item">
                        <p className="control-title">shift timing by</p>

                        <div className="select-range-items" title={!sourceFile ? 'Upload source file' : ''}>
                            <input
                                className={`range-form ${!sourceFile ? " disabled" : ""}`}
                                id="delay-input"
                                type="number"
                                step="1"
                                value={delay}
                                onChange={(e) => setDelay(Math.floor(Number(e.target.value)))}
                                style={{
                                    width: 100,
                                    color: !sourceFile
                                        ? '#6C757D'               // Gray if sourceFile is missing
                                        : delay === 0
                                            ? '#F25C54'           // Red if delay is 0
                                            : 'inherit',          // Default otherwise
                                }}
                                disabled={!sourceFile}
                            />
                            <label className="range-text" htmlFor="delay-input">ms</label>
                        </div>
                    </div>

                    {/* From input control */}
                    <div className="control-item">
                        <p className="control-title">from subtitle</p>

                        <div className="select-range-items" title={!sourceFile ? 'Upload source file' : ''}>
                            <label className="range-text" htmlFor="range-start">number</label>
                            <input
                                className={`range-form ${!sourceFile ? " disabled" : ""}`}
                                id="range-start"
                                type="number"
                                min={1}
                                max={rangeEnd - 1}
                                value={rangeStart}
                                onChange={(e) => setRangeStart(Math.floor(Number(e.target.value)))}
                                onBlur={(e) => {
                                    let newValue = Math.floor(Number(e.target.value));
                                    // Enforce minimum value of 1
                                    if (newValue < 1) newValue = 1;
                                    // Enforce maximum value of rangeEnd - 1
                                    if (newValue >= rangeEnd) newValue = rangeEnd - 1;
                                    setRangeStart(newValue);
                                }}
                                disabled={!sourceFile}
                            />
                        </div>
                    </div>

                    {/* To input control */}
                    <div className="control-item">
                        <p className="control-title">to subtitle</p>

                        <div className="select-range-items" title={!sourceFile ? 'Upload source file' : ''}>
                            <label className="range-text" htmlFor="range-end">number</label>
                            <input
                                className={`range-form ${!sourceFile ? " disabled" : ""}`}
                                id="range-end"
                                type="number"
                                min={rangeStart + 1}
                                max={subtitleCount}
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(Math.floor(Number(e.target.value)))}
                                onBlur={(e) => {
                                    let newValue = Math.floor(Number(e.target.value));
                                    // Enforce minimum value of rangeStart + 1
                                    if (newValue <= rangeStart) newValue = rangeStart + 1;
                                    // Enforce maximum value of subtitleCount
                                    if (newValue > subtitleCount) newValue = subtitleCount;
                                    setRangeEnd(newValue);
                                }}
                                disabled={!sourceFile}
                            />
                        </div>
                    </div>
                </div>
            </div>


            {/* File preview section */}
            <div className="file-preview-section">

                {/* Source file preview + Shift button */}
                <div className="source-file-preview-container" style={{ flex: 1 }}>

                    {/* Shift Button */}
                    <div
                        className="operation-controls-buttons"
                        title={
                            !sourceFile
                                ? "Upload source file"
                                : delay === 0
                                    ? "Delay can't be 0"
                                    : ""
                        }
                    >
                        <button
                            className={`operation-button${!sourceFile || delay == 0 ? " disabled" : ""}`}
                            onClick={handleShift}
                            disabled={!sourceFile || delay == 0}
                        >
                            Shift
                        </button>
                    </div>

                    {/* Source file preview */}
                    {sourceFilePreview}
                </div>

                {/* Shifted file preview + Download button */}
                {processedFile ? (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>
                        {/* Download Button */}
                        <div className="operation-controls-buttons">
                            <button className="download-button" onClick={onDownload}>Download</button>
                        </div>

                        {/* Shifted file preview */}
                        {shiftedFilePreview}
                    </div>
                ) : isLoading ? (
                    <>
                    </>
                ) : null}
            </div>
        </div >
    );
};

export default ShiftOperation;
