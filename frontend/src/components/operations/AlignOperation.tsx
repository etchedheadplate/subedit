import React, { useState, useEffect, useCallback } from "react";
import { UniversalSubtitlePreview } from "../subtitles/SubtitlePreview";
import { useFileUpload } from "../../hooks/useFileUpload";

interface AlignOperationProps {
    onAlign: (
        sourceFilename: string,
        exampleFilename: string,
        sourceRange?: [number, number],
        exampleRange?: [number, number],
    ) => Promise<void>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    isLoading: boolean;
    sourceSubtitleCount: number;
    exampleSubtitleCount: number;
    sessionId: string | null;
    /* fetchExamplePreview: (filename: string) => void; */
}

const AlignOperation: React.FC<AlignOperationProps> = ({
    onAlign,
    onDownload,
    hasProcessedFile,
    isLoading,
    sourceSubtitleCount,
    exampleSubtitleCount,
    sessionId,
    /* fetchExamplePreview, */
}) => {
    // State for the source file
    const { uploadedFile: sourceFile } = useFileUpload(sessionId);

    // State for the example file
    const {
        uploadedFile: exampleFile,
        uploadFile: uploadExampleFile,
        error: exampleFileError,
        isLoading: isExampleFileUploading,
    } = useFileUpload(sessionId);

    // State for using specific ranges
    const [sourceFilename, setSourceFilename] = useState<string | null>(null);
    const [exampleFilename, setExampleFilename] = useState<string | null>(null);
    const [useRange, setUseRange] = useState<boolean>(false);
    const [sourceStart, setSourceStart] = useState<number>(1);
    const [sourceEnd, setSourceEnd] = useState<number>(sourceSubtitleCount > 1 ? sourceSubtitleCount : 2,);
    const [exampleStart, setExampleStart] = useState<number>(1);
    const [exampleEnd, setExampleEnd] = useState<number>(exampleSubtitleCount > 1 ? exampleSubtitleCount : 2,);
    const [rangeError, setRangeError] = useState<string | null>(null);

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
        setSourceFilename(sourceFile?.filename ?? ""); // Default to empty string if null
        setExampleFilename(exampleFile?.filename ?? ""); // Default to empty string if null

        if (!exampleFilename) return;

        let sourceRange: [number, number] | undefined;
        let exampleRange: [number, number] | undefined;

        if (useRange) {
            sourceRange = [sourceStart, sourceEnd];
            exampleRange = [exampleStart, exampleEnd];
        }

        await onAlign(
            sourceFilename ?? "", // Fallback to empty string if null
            exampleFilename ?? "", // Fallback to empty string if null
            sourceRange,
            exampleRange,
        );
    };

    // Drag and drop state
    const [dragActive, setDragActive] = useState<boolean>(false);

    // Reference to the file input
    const exampleFileInputRef = React.useRef<HTMLInputElement>(null);

    // Drag and drop event handlers
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith(".srt")) {
                    const result = await uploadExampleFile(file);
                    if (result && sessionId) {
                        fetchExamplePreview(file.name);
                    }
                } else {
                    // Show error for non-srt files
                    console.error("Only .srt files are allowed");
                }
            }
        },
        [uploadExampleFile, sessionId, fetchExamplePreview],
    );

    // Handle file upload via input element
    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const file = event.target.files[0];
        const result = await uploadExampleFile(file);
        if (result && sessionId) {
            fetchExamplePreview(file.name);
        }
    };

    // Handle click on the drag-drop area
    const handleAreaClick = () => {
        if (!isExampleFileUploading && exampleFileInputRef.current) {
            exampleFileInputRef.current.click();
        }
    };

    return (
        <div className="align-operation-section" style={{ marginTop: "40px", marginBottom: "20px" }}>
            {/* Description of Align Operation */}
            <div className="align-description-section">
                {!exampleFilename ? (
                    <div className="align-description-container" style={{ marginBottom: "20px" }}>
                        <p>Upload an example file that contains the timing you want to match.</p>
                    </div>
                ) : (
                    <>
                        {/* Range controls section */}
                        <div className="range-controls-section" style={{ marginBottom: "20px" }}>
                            <label style={{ display: "flex", alignItems: "center" }}>
                                <input
                                    className="range-controls-checkbox"
                                    type="checkbox"
                                    checked={useRange}
                                    onChange={(e) => setUseRange(e.target.checked)}
                                    style={{ marginRight: "10px" }}
                                />
                                Apply to specific subtitle ranges
                            </label>
                        </div>

                        {/* If range control checked */}
                        {useRange && (
                            <div
                                className="range-controls-container"
                                style={{
                                    marginBottom: "20px",
                                    display: "flex",
                                    gap: "20px",
                                }}
                            >
                                <p>
                                    Select source and example subtitles to align. Text of first and last source subtitles should correspond to text of first and last selected example subtitles.
                                </p>

                                {/* Select source file range */}
                                <div className="source-range-controls-container">
                                    <div className="source-range-selector-line" style={{ display: "flex", gap: "10px" }}>
                                        <div className="source-start">
                                            <label htmlFor="source-start">Align source text from</label>
                                            <input
                                                className="source-start-form"
                                                id="source-start"
                                                type="number"
                                                min={1}
                                                max={sourceEnd - 1}
                                                value={sourceStart}
                                                onChange={(e) => setSourceStart(Number(e.target.value))}
                                                style={{ width: "60px", marginLeft: "5px" }}
                                            />
                                        </div>
                                        <div className="source-end">
                                            <label htmlFor="source-end">to</label>
                                            <input
                                                className="source-end-form"
                                                id="source-end"
                                                type="number"
                                                min={sourceStart + 1}
                                                max={sourceSubtitleCount}
                                                value={sourceEnd}
                                                onChange={(e) => setSourceEnd(Number(e.target.value))}
                                                style={{ width: "60px", marginLeft: "5px" }}
                                            />
                                        </div>
                                    </div>
                                    <div className="source-count" style={{ fontSize: "0.8em", marginTop: "5px" }}>
                                        (Total: {sourceSubtitleCount} subtitles)
                                    </div>
                                </div>

                                {/* Select example file range */}
                                <div className="example-range-controls-container">
                                    <div className="example-range-selector-line" style={{ display: "flex", gap: "10px" }}>
                                        <div className="example-start">
                                            <label htmlFor="example-start">By example text from</label>
                                            <input
                                                className="example-start-form"
                                                id="example-start"
                                                type="number"
                                                min={1}
                                                max={exampleEnd - 1}
                                                value={exampleStart}
                                                onChange={(e) => setExampleStart(Number(e.target.value))}
                                                style={{ width: "60px", marginLeft: "5px" }}
                                            />
                                        </div>
                                        <div className="example-end">
                                            <label htmlFor="example-end">to</label>
                                            <input
                                                className="example-end-form"
                                                id="example-end"
                                                type="number"
                                                min={exampleStart + 1}
                                                max={exampleSubtitleCount}
                                                value={exampleEnd}
                                                onChange={(e) => setExampleEnd(Number(e.target.value))}
                                                style={{ width: "60px", marginLeft: "5px" }}
                                            />
                                        </div>
                                    </div>
                                    <div className="example-count" style={{ fontSize: "0.8em", marginTop: "5px" }}>
                                        (Total: {exampleSubtitleCount} subtitles)
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Align and Download buttons container */}
                        <div className="buttons-container" style={{ display: "flex", gap: "10px" }}>
                            {/* Align button */}
                            <button
                                className="align-button"
                                onClick={handleAlign}
                                disabled={!exampleFile || isLoading}
                                style={{
                                    padding: "10px 15px",
                                    backgroundColor: "#0000ff",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "2px",
                                    cursor: exampleFile && !isLoading ? "pointer" : "not-allowed",
                                }}
                            >
                                Align
                            </button>

                            {/* Download button */}
                            {hasProcessedFile && (
                                <button
                                    className="download-button"
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
                    </>
                )}
            </div>

            {/* File preview section */}
            <div className="align-preview-section" style={{ display: "flex", gap: "20px" }}>
                {/* Source file preview section */}
                <div className="source-file-preview-container">{sourceFilePreview}</div>

                {/* Drag-and-drop zone if Example file is not uploaded */}
                {exampleFile ? (
                    <>
                        <input
                            className="drag-and-drop-input"
                            type="file"
                            accept=".srt"
                            onChange={handleUpload}
                            disabled={isExampleFileUploading || isLoading}
                            style={{ display: "none" }}
                            ref={exampleFileInputRef}
                        />

                        {/* Drag and Drop Area */}
                        <div className="drag-and-drop-section" style={{ display: "flex", gap: "20px" }}>
                            <div className="drag-and-drop-container">
                                <div
                                    className="drag-and-drop-area"
                                    onClick={handleAreaClick}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    style={{
                                        flexShrink: 0,
                                        width: "50%",
                                        margin: "0 auto",
                                        height: "120px",
                                        border: dragActive ? "2px dashed #646cff" : "2px dashed #dee2e6",
                                        borderRadius: "0px",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        backgroundColor: dragActive ? "rgba(100, 108, 255, 0.08)" : "transparent",
                                        transition: "all 0.3s ease",
                                        marginBottom: "20px",
                                        cursor: isLoading ? "wait" : "pointer",
                                    }}
                                >
                                    <p>Upload Example File (drag-and-drop in AlignOperation.tsx)</p>
                                    <p style={{ fontSize: "0.8em", color: "#6c757d" }}>
                                        Drag & drop .srt file or click anywhere in this area
                                    </p>
                                </div>
                                {exampleFileError && (
                                    <div className="drag-and-drop-error-container" style={{ color: "red", marginTop: "10px" }}>
                                        {exampleFileError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="example-file-preview-container" style={{ display: "flex", gap: "20px" }}>
                        {exampleFilePreview}
                        {alignedFile && <div className="aligned-file-preview-container">{alignedFilePreview}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlignOperation;
