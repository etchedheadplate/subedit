import React, { useState, useEffect } from "react";
import DragAndDropArea from "../../components/DragAndDropArea";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";
import { useFileUpload } from "../../hooks/useFileUpload";

interface AlignOperationProps {
    onAlign: (
        sourceFile: SubtitleFile,
        exampleFile: SubtitleFile,
        sourceRange: [number, number],
        exampleRange: [number, number]
    ) => Promise<{ eta: number } | null | undefined>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    resetResults: () => void;
}

const AlignOperation: React.FC<AlignOperationProps> = ({
    onAlign,
    onDownload,
    processedFile,
    sessionId,
    sourceFile,
    resetResults,
}) => {
    // State for the example file
    const {
        uploadedFile: exampleFile,
        uploadFile: uploadExampleFile,
        isLoading: isExampleFileUploading,
    } = useFileUpload(sessionId);

    // State to store the subtitle count from the preview
    const [sourceSubtitleCnt, setSourceSubtitleCnt] = useState<number>(1);
    const [exampleSubtitleCnt, setExampleSubtitleCnt] = useState<number>(1);

    // State for ranges with proper defaults
    const [sourceStart, setSourceStart] = useState<number>(1);
    const [sourceEnd, setSourceEnd] = useState<number>(sourceSubtitleCnt > 0 ? sourceSubtitleCnt : 1);
    const [exampleStart, setExampleStart] = useState<number>(1);
    const [exampleEnd, setExampleEnd] = useState<number>(exampleSubtitleCnt > 0 ? exampleSubtitleCnt : 2);

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        await uploadExampleFile(file);
        resetResults();
    };

    // Update source file range end when subtitle count changes
    useEffect(() => {
        if (sourceSubtitleCnt > 0) {
            setSourceEnd(sourceSubtitleCnt);
            // Keep rangeStart at 1
            setSourceStart(1);
        }
    }, [sourceSubtitleCnt]);

    // Update example file range end when subtitle count changes
    useEffect(() => {
        if (exampleSubtitleCnt > 0) {
            setExampleEnd(exampleSubtitleCnt);
            // Keep rangeStart at 1
            setExampleStart(1);
        }
    }, [exampleSubtitleCnt]);

    // Callback to receive source subtitle count from preview
    const handleSourceSubtitleCntChange = (sourceCount: number) => {
        setSourceSubtitleCnt(sourceCount);
    };

    // Callback to receive example subtitle count from preview
    const handleExampleSubtitleCntChange = (exampleCount: number) => {
        setExampleSubtitleCnt(exampleCount);
    };

    // Handle align operation
    const handleAlign = async () => {
        if (!exampleFile) return;

        // Properly declare the ranges
        const sourceRange: [number, number] = [sourceStart, sourceEnd];
        const exampleRange: [number, number] = [exampleStart, exampleEnd];

        if (sourceFile !== null) {
            await onAlign(sourceFile, exampleFile, sourceRange, exampleRange);
        }
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
            fileType="Source"
            onSubtitleCountChange={handleSourceSubtitleCntChange}
        />
    );

    // Preview of the example file
    const exampleFilePreview = exampleFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={exampleFile}
            isDownloadable={false}
            fileType="Example"
            onSubtitleCountChange={handleExampleSubtitleCntChange}
        />
    ) : null;

    // Preview of the aligned file
    const alignedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType="Aligned"
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="align-operation-section">

            {/* Description of Align operation */}
            <div className="operation-description">
                <p>You can align timing of your subtitles by example file. This might be needed if you have rip with subtitles in another language, and subtitles in desired language for other rip.</p>
            </div>

            <DragAndDropArea
                onFileUpload={handleFileUpload}
                isLoading={isExampleFileUploading}
                uploadedFile={exampleFile}
                preUploadInstructionText={sourceFile ? "Upload example subtitles, fren!" : "Source file required first"}
                preUploadSubInstructionText={sourceFile ? "Drag & drop .srt file or click anywhere in this area" : "Upload source file before adding example file"}
                postUploadIntroFileText="Uploaded example file:"
                postUploadSubInstructionText="Tweak alignment option below or upload new file"
                className={!exampleFile ? "blinking" : ""}
                disabled={!sourceFile}
            />

            {/* If Example file uploaded */}
            {/* Align controls section */}
            <div className="operation-controls-container">
                <>
                    {/* Description of Align controls */}
                    <div className="operation-controls-description">
                        <p>Select source and example subtitles to align. Text of first and last source subtitles should correspond to text of first and last selected example subtitles.</p>
                    </div>

                    {/* Align controls block */}
                    <div className="operation-controls-items">

                        {/* Controls for Source file */}
                        <div className="control-item">
                            <p className="control-title">align source subtitles</p>

                            {/* Select Source file range */}
                            <div className="select-range-items">
                                <label className="range-text" htmlFor="source-start">from</label>
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    id="source-start"
                                    type="number"
                                    min={1}
                                    max={sourceSubtitleCnt > 0 ? sourceEnd - 1 : 1}
                                    value={sourceStart}
                                    onChange={(e) => setSourceStart(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of 1
                                        if (newValue < 1) newValue = 1;
                                        // Enforce maximum value of sourceEnd - 1
                                        if (newValue >= sourceEnd) newValue = sourceEnd - 1;
                                        setSourceStart(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />
                                <label className="range-text" htmlFor="source-end">to</label>
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    id="source-end"
                                    type="number"
                                    min={sourceStart + 1}
                                    max={sourceSubtitleCnt}
                                    value={sourceEnd}
                                    onChange={(e) => setSourceEnd(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of sourceStart + 1
                                        if (newValue <= sourceStart) newValue = sourceStart + 1;
                                        // Enforce maximum value of sourceSubtitleCnt
                                        if (newValue > sourceSubtitleCnt) newValue = sourceSubtitleCnt;
                                        setSourceEnd(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />
                            </div>
                        </div>

                        {/* Controls for Example file */}
                        <div className="control-item">
                            <p className="control-title">by example subtitles</p>

                            {/* Select Example file range */}
                            <div className="select-range-items">
                                {/* 'from' label */}
                                <label className="range-text" htmlFor="example-start">from</label>

                                {/* Start input */}
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    id="example-start"
                                    type="number"
                                    min={1}
                                    max={exampleSubtitleCnt > 0 ? exampleEnd - 1 : 1}
                                    value={exampleStart}
                                    onChange={(e) => setExampleStart(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of 1
                                        if (newValue < 1) newValue = 1;
                                        // Enforce maximum value of exampleEnd - 1
                                        if (newValue >= exampleEnd) newValue = exampleEnd - 1;
                                        setExampleStart(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />

                                {/* 'to' label */}
                                <label className="range-text" htmlFor="example-end">to</label>

                                {/* End input */}
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    id="example-end"
                                    type="number"
                                    min={exampleStart + 1}
                                    max={exampleSubtitleCnt}
                                    value={exampleEnd}
                                    onChange={(e) => setExampleEnd(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of exampleStart + 1
                                        if (newValue <= exampleStart) newValue = exampleStart + 1;
                                        // Enforce maximum value of exampleSubtitleCnt
                                        if (newValue > exampleSubtitleCnt) newValue = exampleSubtitleCnt;
                                        setExampleEnd(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />
                            </div>
                        </div>
                    </div>
                </>
            </div>

            {/* File preview section */}
            <div className="file-preview-section">

                {/* If only Source file uploaded: Source file preview + Align button */}
                {!sourceFile && !exampleFile && (
                    <div className="source-file-preview-container" style={{ flex: 1 }}>
                        {/* Align Button */}
                        <div className="operation-controls-buttons">
                            <button
                                className={`operation-button ${" disabled"}`}
                                onClick={handleAlign}
                                disabled={true}
                            >
                                Align
                            </button>
                        </div>
                    </div>
                )}
                {/* If only Source file uploaded: Source file preview + Align button */}
                {sourceFile && !exampleFile && (
                    <div className="source-file-preview-container" style={{ flex: 1 }}>
                        {/* Align Button */}
                        <div className="operation-controls-buttons">
                            <button
                                className={`operation-button ${" disabled"}`}
                                onClick={handleAlign}
                                disabled={true}
                            >
                                Align
                            </button>
                        </div>
                        {/* Source file preview */}
                        {sourceFilePreview}
                    </div>
                )}
                {/* If Source and Example files uploaded */}
                {sourceFile && exampleFile && (
                    <div className="files-container">
                        {/* Align button */}
                        <div className="operation-controls-buttons">
                            <button
                                className="operation-button"
                                onClick={handleAlign}
                                disabled={false}
                            >
                                Align
                            </button>
                        </div>
                        <div className="uploaded-files-preview-container">
                            {/* Source file preview + Align button */}
                            <div className="source-file-preview-container">
                                {sourceFilePreview}
                            </div>
                            {/* Example file preview (no buttons) */}
                            <div className="modified-file-preview-container">
                                {exampleFilePreview}
                            </div>
                        </div>
                    </div>
                )}

                <div className="files-container">
                    {/* Aligned file preview + Download button */}
                    {processedFile && (
                        <div className="modified-file-preview-container">
                            {/* Download button */}
                            <div className="operation-controls-buttons">
                                <button className="download-button" onClick={onDownload}>Download</button>
                            </div>

                            {alignedFilePreview}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlignOperation;
