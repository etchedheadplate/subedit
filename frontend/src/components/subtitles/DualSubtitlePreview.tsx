import React from "react";
import {
    SubtitlePreview as SubtitlePreviewType,
    SubtitleMetadata,
} from "../../types";
import "../../SubtitlePreview.css";

interface DualSubtitlePreviewProps {
    sourcePreview: SubtitlePreviewType | null;
    sourceMeta: SubtitleMetadata | null;
    resultPreview: SubtitlePreviewType | null;
    resultMeta: SubtitleMetadata | null;
    sourceTitle?: string;
    resultTitle?: string;
}

const DualSubtitlePreview: React.FC<DualSubtitlePreviewProps> = ({
    sourcePreview,
    sourceMeta,
    resultPreview,
    resultMeta,
    sourceTitle = "Original File",
    resultTitle = "Modified File",
}) => {
    if (!sourcePreview) return <p>No source preview available</p>;

    // Get all unique keys from both previews
    const allKeys = new Set<number>();
    if (sourcePreview) {
        Object.keys(sourcePreview).forEach((key) => allKeys.add(Number(key)));
    }
    if (resultPreview) {
        Object.keys(resultPreview).forEach((key) => allKeys.add(Number(key)));
    }

    // Convert to array and sort
    const sortedKeys = Array.from(allKeys).sort((a, b) => a - b);

    return (
        <div className="dual-subtitle-preview">
            {/* Source Preview */}
            <div className="subtitle-preview-container">
                <h3>{sourceTitle}</h3>
                <pre style={{ margin: 0 }}>
                    {sortedKeys.map((key) => (
                        <div key={`source-${key}`} className="subtitle-entry">
                            {sourcePreview[key] ? (
                                <>
                                    <div>{key}</div>
                                    <div>
                                        {sourcePreview[key].start} --{" "}
                                        {sourcePreview[key].end}
                                    </div>
                                    <div>{sourcePreview[key].text}</div>
                                </>
                            ) : (
                                <div>-</div>
                            )}
                        </div>
                    ))}
                </pre>
            </div>

            {/* Result Preview (if available) */}
            {resultPreview && (
                <div className="subtitle-preview-container">
                    <h3>{resultTitle}</h3>
                    <pre style={{ margin: 0 }}>
                        {sortedKeys.map((key) => (
                            <div
                                key={`result-${key}`}
                                className="subtitle-entry"
                            >
                                {resultPreview[key] ? (
                                    <>
                                        <div>{key}</div>
                                        <div>
                                            {resultPreview[key].start} --{" "}
                                            {resultPreview[key].end}
                                        </div>
                                        <div>{resultPreview[key].text}</div>
                                    </>
                                ) : (
                                    <div>-</div>
                                )}
                            </div>
                        ))}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default DualSubtitlePreview;
