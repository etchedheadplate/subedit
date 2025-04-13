import React, { useState, useEffect } from "react";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";

interface ShiftOperationProps {
    onShift: (delay: number, items: number[]) => Promise<any>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    isLoading: boolean;
    subtitleCount: number;
}

const ShiftOperation: React.FC<ShiftOperationProps> = ({
    onShift,
    sessionId,
    onDownload,
    sourceFile,
    hasProcessedFile,
    processedFile,
    isLoading,
    subtitleCount,
}) => {
    // State for the shifted file
    const [shiftedFile, setShiftedFile] = useState(null);

    // State to store the subtitle count from the preview
    const [sourceSubtitleCount, setSourceSubtitleCount] = useState<number>(subtitleCount);

    // State for setting up delay
    const [delay, setDelay] = useState<number>(0);

    // State for using specific ranges
    const [rangeStart, setRangeStart] = useState<number>(1);
    const [rangeEnd, setRangeEnd] = useState<number>(subtitleCount > 1 ? subtitleCount : 2,);
    const [rangeError, setRangeError] = useState<string | null>(null);

    // Update range end when subtitle count changes
    useEffect(() => {
        if (sourceSubtitleCount > 0) {
            setRangeEnd(sourceSubtitleCount);
            setRangeStart(1);
        }
    }, [sourceSubtitleCount]);

    // Callback to receive subtitle count from preview
    const handleSubtitleCountChange = (count: number) => {
        setSourceSubtitleCount(count);
    };

    // Handler to store sfifting results
    const handleShift = async () => {
        const items = [rangeStart, rangeEnd];
        const result = await onShift(delay, items);
        setShiftedFile(result); // Store the result
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
        <div className="shift-operation-section" style={{ marginTop: "40px", marginBottom: "20px" }}>

            {/* Description of Shift Operation */}
            <div className="operation-description">
                <p>Enter number of milliseconds (1 second = 1000 milliseconds) to shift timing. Number can be positive or negative.</p>
            </div>

            {/* Shift controls section */}
            <div className="operation-controls-container">

                {/* Shift controls block */}
                <div className="operation-controls-items">

                    {/* Delay input control */}
                    <div className="control-item">
                        <p className="control-title">shift file by</p>

                        {/* Delay input form, accepts only whole numbers */}
                        <div className="range-selector">
                            <input className="range-form"
                                id="delay-input"
                                type="number"
                                step="1"
                                value={delay}
                                onChange={(e) => setDelay(Math.floor(Number(e.target.value)))}
                                style={{ width: 100 }}
                            />
                            <label className="range-text" htmlFor="delay-input">ms</label>
                        </div>
                    </div>

                    {/* From input control */}
                    <div className="control-item">
                        <p className="control-title">from subtitle</p>

                        {/* From input form, accepts only whole numbers */}
                        <label className="range-text" htmlFor="range-start">number</label>
                        <input className="range-form"
                            id="range-start"
                            type="number"
                            min={1}
                            max={rangeEnd - 1}
                            value={rangeStart}
                            onChange={(e) =>
                                setRangeStart(Number(Math.floor(Number(e.target.value))))
                            }
                        />
                    </div>

                    {/* To input control */}
                    <div className="control-item">
                        <p className="control-title">to subtitle</p>

                        {/* To input form, accepts only whole numbers */}
                        <label className="range-text" htmlFor="range-end">number</label>
                        <input className="range-form"
                            id="range-end"
                            type="number"
                            min={rangeStart + 1}
                            max={sourceSubtitleCount}
                            value={rangeEnd}
                            onChange={(e) =>
                                setRangeEnd(Number(Math.floor(Number(e.target.value))))
                            }
                        />
                    </div>
                </div>

                {/* Shift and Download buttons */}
                <div className="operation-controls-buttons">

                    {/* Shift button */}
                    <button
                        className="operation-button"
                        onClick={handleShift}
                        disabled={isLoading || delay == 0 || !!rangeError}
                    >
                        Shift
                    </button>

                    {/* If Shift button pressed */}
                    {hasProcessedFile && (
                        <>
                            {/* Download button */}
                            <button className="download-button" onClick={onDownload}>Download</button>
                        </>
                    )}
                </div>
            </div>


            {/* File preview section */}
            <div className="file-preview-section">

                {/* Source file preview */}
                <div className="source-file-preview-container" style={{ flex: 1 }}>
                    {sourceFilePreview}
                </div>

                {/* Shifted file preview - Only show if available */}
                {processedFile && (
                    <div className="modified-file-preview-container" style={{ flex: 1 }}>
                        {shiftedFilePreview}
                    </div>
                )}
            </div>
        </div >
    );
};

export default ShiftOperation;
