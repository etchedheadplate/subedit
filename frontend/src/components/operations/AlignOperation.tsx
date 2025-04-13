import React, { useState, useEffect, useCallback } from "react";
import { UniversalSubtitlePreview } from "../subtitles/SubtitlePreview";
import { SubtitleFile } from "../../types";
import { useFileUpload } from "../../hooks/useFileUpload";

interface AlignOperationProps {
    onAlign: (
        sourceFilen: SubtitleFile,
        exampleFilen: SubtitleFile,
        sourceRange?: [number, number],
        exampleRange?: [number, number],
    ) => Promise<any>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    isLoading: boolean;
    sourceFile: SubtitleFile;
    exampleFile: SubtitleFile;
    sourceSubtitleCount: number;
    exampleSubtitleCount: number;
    sessionId: string | null;
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
    // State for the aligned file
    //   const [alignedFile, setAlignedFile] = useState(null);

    // State for the example file
    const {
        uploadedFile: exampleFile,
        uploadFile: uploadExampleFile,
        error: exampleFileError,
        isLoading: isExampleFileUploading,
    } = useFileUpload(sessionId);

    // State for using specific ranges
    const [useRange, setUseRange] = useState<boolean>(false);
    const [sourceStart, setSourceStart] = useState<number>(1);
    const [sourceEnd, setSourceEnd] = useState<number>(sourceSubtitleCount > 1 ? sourceSubtitleCount : 2,);
    const [exampleStart, setExampleStart] = useState<number>(1);
    const [exampleEnd, setExampleEnd] = useState<number>(exampleSubtitleCount > 1 ? exampleSubtitleCount : 2,);
    const [rangeError, setRangeError] = useState<string | null>(null);

    // State for drag-and-drop area
    const [dragActive, setDragActive] = useState<boolean>(false);

    // References to the example file inputs
    const exampleFileInputRef = React.useRef<HTMLInputElement>(null);

    // Handle file upload
    const handleFileUpload = async (file) => {
        await uploadExampleFile(file);
    };

    // Handle file upload via input element
    const handleUpload = async (inputRef) => {
        if (!inputRef.target.files) return;
        await handleFileUpload(inputRef.target.files[0]);
    };

    // Handle click on the drag-and-drop area
    const handleClick = (inputRef) => {
        if (!isLoading && inputRef.current) {
            inputRef.current.click();
        }
    };

    // Handle drag on the drag-and-drop area
    const handleDrag = useCallback((e: React.DragEvent, setDragActiveState: React.Dispatch<React.SetStateAction<boolean>>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActiveState(true);
        } else if (e.type === "dragleave") {
            setDragActiveState(false);
        }
    }, []);

    // Handle drop on the drag-and-drop area
    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith(".srt")) {
                    await handleFileUpload(file);
                } else {
                    console.error("Only .srt files are allowed"); // Show error for non-srt files
                }
            }
        },
        [exampleFile],
    );

    // Handle file upload of the source file
    const handleExampleFileUpload = (e) => handleUpload(e);

    // Handle drag-and-drop area for the source file
    const handleExampleAreaClick = () => handleClick(exampleFileInputRef);
    const handleExampleAreaDrag = (e: React.DragEvent) => handleDrag(e, setDragActive);
    const handleExampleAreaDrop = (e: React.DragEvent) => handleDrop(e);

    // Update source file range end when subtitle count changes
    useEffect(() => {
        if (sourceSubtitleCount > 0) {
            setSourceEnd(sourceSubtitleCount);
            // Also reset rangeStart to 1 when subtitleCount changes
            setSourceStart(1);
        }
    }, [sourceSubtitleCount]);

    // Update example file range end when subtitle count changes
    useEffect(() => {
        if (exampleSubtitleCount > 0) {
            setExampleEnd(exampleSubtitleCount);
            // Also reset rangeStart to 1 when subtitleCount changes
            setExampleStart(1);
        }
    }, [exampleSubtitleCount]);

    // Validate source file range inputs
    useEffect(() => {
        setRangeError(null);

        if (useRange) {
            if (sourceStart < 1 || sourceStart >= sourceSubtitleCount) {
                setRangeError(
                    `Start must be between 1 and ${sourceSubtitleCount - 1}`,
                );
                return;
            }

            if (sourceEnd <= sourceStart || sourceEnd > sourceSubtitleCount) {
                setRangeError(
                    `End must be between ${sourceStart + 1} and ${sourceSubtitleCount}`,
                );
                return;
            }
        }
    }, [sourceStart, sourceEnd, useRange, sourceSubtitleCount]);

    // Validate example file range inputs
    useEffect(() => {
        setRangeError(null);

        if (useRange) {
            if (exampleStart < 1 || exampleStart >= exampleSubtitleCount) {
                setRangeError(
                    `Start must be between 1 and ${exampleSubtitleCount - 1}`,
                );
                return;
            }

            if (exampleEnd <= exampleStart || exampleEnd > exampleSubtitleCount) {
                setRangeError(
                    `End must be between ${exampleStart + 1} and ${exampleSubtitleCount}`,
                );
                return;
            }
        }
    }, [exampleStart, exampleEnd, useRange, exampleSubtitleCount]);

    // Handle align operation
    const handleAlign = async () => {
        if (!exampleFile) return;

        let sourceRange: [number, number] | undefined;
        let exampleRange: [number, number] | undefined;

        if (useRange) {
            sourceRange = [sourceStart, sourceEnd];
            exampleRange = [exampleStart, exampleEnd];
        }
        await onAlign(sourceFile, exampleFile, sourceRange, exampleRange);
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
        />
    );

    // Preview of the example file
    const exampleFilePreview = exampleFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={exampleFile}
            isDownloadable={false}
        />
    ) : null;

    // Preview of the aligned file
    const alignedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            isDownloadable={true}
        />
    ) : null;


    return (
        <div className="align-operation-section" style={{ marginTop: "40px", marginBottom: "20px" }}>

            {/* Description of Align operation */}
            <div className="operation-description">
                <p>You can align timing of your subtitles by example file. This might be needed if you have rip with subtitles in another language, and subtitles in desired language for other rip.</p>
            </div>

            {/* Hidden file input */}
            <input className="drag-and-drop-input"
                type="file"
                accept=".srt"
                onChange={handleExampleFileUpload}
                disabled={isLoading}
                style={{ display: "none" }}
                id="file-upload"
                ref={exampleFileInputRef}
            />

            {/* Drag and Drop Zone - Entire area is clickable */}
            <div
                className={`drag-and-drop-area ${dragActive ? 'drag-active' : ''} ${isLoading ? 'loading' : ''}`}
                onClick={handleExampleAreaClick}
                onDragEnter={handleExampleAreaDrag}
                onDragLeave={handleExampleAreaDrag}
                onDragOver={handleExampleAreaDrag}
                onDrop={handleExampleAreaDrop}
                style={{ textAlign: "center", marginBottom: "30px" }}
            >
                {!exampleFile ? (
                    <>
                        <p>Upload example subtitles, fren!</p>
                        <p style={{ fontSize: "0.8em", color: "#6c757d" }}>
                            Drag & drop .srt file or click anywhere in this
                            area
                        </p>
                    </>
                ) : (
                    <>
                        <p>
                            What do you want to do with{" "}
                            <strong>{exampleFile.filename}</strong>?
                        </p>
                        <p style={{ fontSize: "0.8em", color: "#6c757d" }}>
                            Select option below or upload new file
                        </p>
                    </>
                )}
            </div>

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
                                                max={sourceEnd - 1}
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
                                                max={sourceSubtitleCount}
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
                                                max={exampleEnd - 1}
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
                                                max={exampleSubtitleCount}
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
                                <button className="operation-button" onClick={handleAlign}>Align</button>

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
        </div >
    );
};

export default AlignOperation;
