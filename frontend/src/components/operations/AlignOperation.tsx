import React, { useState, useEffect } from "react";
import DragAndDropArea from "../../components/DragAndDropArea";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";
import { useFileUpload } from "../../hooks/useFileUpload";

interface AlignOperationProps {
    onAlign: (sourceFile: SubtitleFile, exampleFile: SubtitleFile, sourceRange?: [number, number], exampleRange?: [number, number]) => Promise<any>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    isLoading: boolean;
    sourceSubtitleCount: number;
    exampleSubtitleCount: number;
}

const AlignOperation: React.FC<AlignOperationProps> = ({
    onAlign,
    onDownload,
    hasProcessedFile,
    processedFile,
    isLoading,
    sourceSubtitleCount,
    exampleSubtitleCount,
    sessionId,
    sourceFile,
}) => {
    // State for the example file
    const {
        uploadedFile: exampleFile,
        uploadFile: uploadExampleFile,
        isLoading: isExampleFileUploading,
    } = useFileUpload(sessionId);

    // State for the aligned file
    const [alignedFile, setAlignedFile] = useState(null);

    // State to store the subtitle count from the preview
    const [sourceSubtitleCnt, setSourceSubtitleCnt] = useState<number>(sourceSubtitleCount);
    const [exampleSubtitleCnt, setExampleSubtitleCnt] = useState<number>(exampleSubtitleCount);

    // State for ranges with proper defaults
    const [sourceStart, setSourceStart] = useState<number>(1);
    const [sourceEnd, setSourceEnd] = useState<number>(sourceSubtitleCnt > 0 ? sourceSubtitleCnt : 1);
    const [exampleStart, setExampleStart] = useState<number>(1);
    const [exampleEnd, setExampleEnd] = useState<number>(exampleSubtitleCnt > 0 ? exampleSubtitleCnt : 2);
    const [rangeError, setRangeError] = useState<string | null>(null);

    // Handle file upload
    const handleFileUpload = async (file) => {
        await uploadExampleFile(file);
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
    const handleSourceSubtitleCntChange = (count: number) => {
        setSourceSubtitleCnt(count);
    };

    // Callback to receive example subtitle count from preview
    const handleExampleSubtitleCntChange = (count: number) => {
        setExampleSubtitleCnt(count);
    };

    // Handle align operation
    const handleAlign = async () => {
        if (!exampleFile) return;

        // Properly declare the ranges
        const sourceRange: [number, number] = [sourceStart, sourceEnd];
        const exampleRange: [number, number] = [exampleStart, exampleEnd];

        const result = await onAlign(sourceFile, exampleFile, sourceRange, exampleRange);
        setAlignedFile(result); // Store the result
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
        <div className="align-operation-section" style={{ marginTop: "40px", marginBottom: "20px" }}>

            {/* Description of Align operation */}
            <div className="operation-description">
                <p>You can align timing of your subtitles by example file. This might be needed if you have rip with subtitles in another language, and subtitles in desired language for other rip.</p>
            </div>

            <DragAndDropArea
                onFileUpload={handleFileUpload}
                isLoading={isLoading || isExampleFileUploading}
                uploadedFile={exampleFile}
                preUploadInstructionText="Upload example subtitles, fren!"
                postUploadIntroFileText="Uploaded example file:"
                postUploadSubInstructionText="Tweak alignment option below or upload new file"
                className={!exampleFile ? "blinking" : ""}
            />

            {/* Display range error if any */}
            {rangeError && (
                <div className="error-message" style={{ marginBottom: "15px", color: "red" }}>
                    {rangeError}
                </div>
            )}

            {/* If Example file uploaded */}
            {exampleFile && (
                <>
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
                                        <div className="range-selector">
                                            <label className="range-text" htmlFor="source-start">from</label>
                                            <input
                                                className="range-form"
                                                id="source-start"
                                                type="number"
                                                min={1}
                                                max={sourceSubtitleCnt > 0 ? sourceEnd - 1 : 1}
                                                value={sourceStart}
                                                onChange={(e) => setSourceStart(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="range-selector">
                                            <label className="range-text" htmlFor="source-end">to</label>
                                            <input
                                                className="range-form"
                                                id="source-end"
                                                type="number"
                                                min={sourceStart + 1}
                                                max={sourceSubtitleCnt}
                                                value={sourceEnd}
                                                onChange={(e) => setSourceEnd(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Controls for Example file */}
                                <div className="control-item">
                                    <p className="control-title">by example subtitles</p>

                                    {/* Select Example file range */}
                                    <div className="select-range-items">
                                        <div className="range-selector">
                                            <label className="range-text" htmlFor="example-start">from</label>
                                            <input
                                                className="range-form"
                                                id="example-start"
                                                type="number"
                                                min={1}
                                                max={exampleSubtitleCnt > 0 ? exampleEnd - 1 : 1}
                                                value={exampleStart}
                                                onChange={(e) => setExampleStart(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="range-selector">
                                            <label className="range-text" htmlFor="example-end">to</label>
                                            <input
                                                className="range-form"
                                                id="example-end"
                                                type="number"
                                                min={exampleStart + 1}
                                                max={exampleSubtitleCnt}
                                                value={exampleEnd}
                                                onChange={(e) => setExampleEnd(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Align and Download buttons */}
                            <div className="operation-controls-buttons">
                                {/* Align button */}
                                <button
                                    className="operation-button"
                                    onClick={handleAlign}
                                    disabled={!!rangeError}
                                >
                                    Align
                                </button>

                                {/* If Align button pressed */}
                                {hasProcessedFile && (
                                    <>
                                        {/* Download button */}
                                        <button className="download-button" onClick={onDownload}>Download</button>
                                    </>
                                )}
                            </div>
                        </>
                    </div>

                    {/* File preview section */}
                    <div className="file-preview-section">

                        {/* Source file preview */}
                        <div className="source-file-preview-container" style={{ flex: 1 }}>
                            {sourceFilePreview}
                        </div>

                        {/* Example file preview */}
                        <div className="modified-file-preview-container" style={{ flex: 1 }}>
                            {exampleFilePreview}
                        </div>

                        {/* Aligned file preview - Only show if available */}
                        {processedFile && (
                            <div className="modified-file-preview-container" style={{ flex: 1 }}>
                                {alignedFilePreview}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AlignOperation;
