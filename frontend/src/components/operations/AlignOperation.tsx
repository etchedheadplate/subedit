import React, { useState } from "react";
import { useFileUpload } from "../../hooks/useFileUpload";

interface AlignOperationProps {
    onAlign: (
        exampleFilename: string,
        sourceRange?: [number, number],
        exampleRange?: [number, number],
    ) => Promise<void>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    isLoading: boolean;
    subtitleCount: number;
    exampleSubtitleCount: number;
    sessionId: string | null;
}

const AlignOperation: React.FC<AlignOperationProps> = ({
    onAlign,
    onDownload,
    hasProcessedFile,
    isLoading,
    subtitleCount,
    exampleSubtitleCount,
    sessionId,
}) => {
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
    const [sourceEnd, setSourceEnd] = useState<number>(subtitleCount);
    const [exampleStart, setExampleStart] = useState<number>(1);
    const [exampleEnd, setExampleEnd] = useState<number>(exampleSubtitleCount);

    // Handle align operation
    const handleAlign = async () => {
        if (!exampleFile) return;

        let sourceRange: [number, number] | undefined;
        let exampleRange: [number, number] | undefined;

        if (useRange) {
            sourceRange = [sourceStart, sourceEnd];
            exampleRange = [exampleStart, exampleEnd];
        }

        await onAlign(exampleFile.filename, sourceRange, exampleRange);
    };

    return (
        <div style={{ marginBottom: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
                <h3>Upload Example File</h3>
                <p>
                    Upload an example file that contains the timing you want to
                    match.
                </p>

                <input
                    type="file"
                    accept=".srt"
                    onChange={(e) => {
                        if (e.target.files) {
                            uploadExampleFile(e.target.files[0]);
                        }
                    }}
                    disabled={isExampleFileUploading || isLoading}
                    style={{ display: "none" }}
                    id="example-file-upload"
                />
                <label
                    htmlFor="example-file-upload"
                    style={{
                        padding: "10px 15px",
                        color: "#dee2e6",
                        border: "0.1em transparent",
                        borderRadius: "2px",
                        backgroundColor: "#008000",
                        cursor: "pointer",
                        display: "inline-block",
                        marginRight: "10px",
                    }}
                >
                    Upload Example
                </label>

                {exampleFile && (
                    <span>
                        Example file: <strong>{exampleFile.filename}</strong>
                    </span>
                )}

                {exampleFileError && (
                    <div style={{ color: "red", marginTop: "10px" }}>
                        {exampleFileError}
                    </div>
                )}
            </div>

            {exampleFile && (
                <>
                    <div style={{ marginBottom: "20px" }}>
                        <label
                            style={{ display: "flex", alignItems: "center" }}
                        >
                            <input
                                type="checkbox"
                                checked={useRange}
                                onChange={(e) => setUseRange(e.target.checked)}
                                style={{ marginRight: "10px" }}
                            />
                            Apply to specific subtitle ranges
                        </label>
                    </div>

                    {useRange && (
                        <div
                            style={{
                                marginBottom: "20px",
                                display: "flex",
                                gap: "20px",
                            }}
                        >
                            <div>
                                <h4>Source Range</h4>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <div>
                                        <label htmlFor="source-start">
                                            From:
                                        </label>
                                        <input
                                            id="source-start"
                                            type="number"
                                            min={1}
                                            max={subtitleCount}
                                            value={sourceStart}
                                            onChange={(e) =>
                                                setSourceStart(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={{
                                                width: "60px",
                                                marginLeft: "5px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="source-end">To:</label>
                                        <input
                                            id="source-end"
                                            type="number"
                                            min={sourceStart + 1}
                                            max={subtitleCount}
                                            value={sourceEnd}
                                            onChange={(e) =>
                                                setSourceEnd(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={{
                                                width: "60px",
                                                marginLeft: "5px",
                                            }}
                                        />
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.8em",
                                        marginTop: "5px",
                                    }}
                                >
                                    (Total: {subtitleCount} subtitles)
                                </div>
                            </div>

                            <div>
                                <h4>Example Range</h4>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <div>
                                        <label htmlFor="example-start">
                                            From:
                                        </label>
                                        <input
                                            id="example-start"
                                            type="number"
                                            min={1}
                                            max={exampleSubtitleCount}
                                            value={exampleStart}
                                            onChange={(e) =>
                                                setExampleStart(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={{
                                                width: "60px",
                                                marginLeft: "5px",
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="example-end">To:</label>
                                        <input
                                            id="example-end"
                                            type="number"
                                            min={exampleStart + 1}
                                            max={exampleSubtitleCount}
                                            value={exampleEnd}
                                            onChange={(e) =>
                                                setExampleEnd(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={{
                                                width: "60px",
                                                marginLeft: "5px",
                                            }}
                                        />
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.8em",
                                        marginTop: "5px",
                                    }}
                                >
                                    (Total: {exampleSubtitleCount} subtitles)
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            onClick={handleAlign}
                            disabled={!exampleFile || isLoading}
                            style={{
                                padding: "10px 15px",
                                backgroundColor: "#0000ff",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "2px",
                                cursor:
                                    exampleFile && !isLoading
                                        ? "pointer"
                                        : "not-allowed",
                            }}
                        >
                            {isLoading ? "Processing..." : "Align"}
                        </button>

                        {hasProcessedFile && (
                            <button
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
    );
};

export default AlignOperation;
