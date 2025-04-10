import { useState, useEffect } from "react";
import { apiService } from "../../services/apiService";
import { SubtitlePreview, SubtitleFile, SubtitleMetadata } from "../../types";

/* I think all posible arguments that affects preview should be place here */
interface SubtitlePreviewProps {
    sessionId: string | null;
    subtitleFile: SubtitleFile | null;
    isDownloadable: boolean | null;
}

export const UniversalSubtitlePreview: React.FC<SubtitlePreviewProps> = ({
    sessionId,
    subtitleFile,
}) => {
    const [subtitleMeta, setSubtitleMeta] = useState<SubtitleMetadata | null>(null);
    const [subtitlePreview, setSubtitlePreview] = useState<SubtitlePreview | null>(null);
    const [subtitleCount, setSubtitleCount] = useState<number>(0);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Get all subtitles set
    const allSubtitles = new Set<number>();
    if (subtitlePreview) {
        Object.keys(subtitlePreview).forEach((key) => allSubtitles.add(Number(key)));
    }

    // Convert subtitles set to array and sort
    const sortedSubtitles = Array.from(allSubtitles).sort((a, b) => a - b);

    // Fetch preview of source file
    useEffect(() => {
        const fetchFilePreview = async () => {
            if (!subtitleFile || !sessionId) return;

            setIsLoading(true);
            setError(null);

            try {
                // Make API empty shift request to get preview elements
                const result = await apiService.shiftSubtitles(
                    sessionId,
                    subtitleFile.filename,
                    0,
                    [], // Empty items array for preview
                );

                // Extract file metadata
                const meta: SubtitleMetadata = {
                    encoding: result.encoding || "Unknown",
                    confidence: 100,
                    language: result.language || "Unknown",
                    filename: subtitleFile.filename,
                }
                setSubtitleMeta(meta);

                // Extract subtitle entries
                const subtitles: SubtitlePreview = {};
                for (const [key, value] of Object.entries(result.preview)) {
                    if (!isNaN(Number(key))) {
                        subtitles[Number(key)] = value;
                    }
                }
                setSubtitlePreview(subtitles);

                // Calculate the number of subtitles in the file
                const count = Object.keys(subtitles).length;
                setSubtitleCount(count);

            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsLoading(false);
            }
        };
        fetchFilePreview();
    }, [sessionId, subtitleFile]); // Empty dependency array ensures fetchFilePreview runs once

    return (
        <>
            {/* Metadata content rendered only if file uploaded and metadata fetched */}
            {!error ? (
                < div className="metadata-and-subtitle-preview-section">
                    {/* Container for file metadata */}
                    <div className="metadata-preview-container" style={{ display: "flex", gap: "20px" }}>
                        {/* Metadata content rendered only if file uploaded and metadata fetched */}
                        {subtitleFile && subtitleMeta && (
                            <div className="metadata-content">
                                <p>
                                    <strong>Filename:</strong>{" "}
                                    {subtitleMeta.filename || "Source"}
                                </p>
                                <p>
                                    <strong>Language:</strong>{" "}
                                    {subtitleMeta.language || "Unknown"}
                                </p>
                                <p>
                                    <strong>Encoding:</strong>{" "}
                                    {subtitleMeta.encoding || "Unknown"}
                                </p>
                                <p>
                                    <strong>Subtitles:</strong>{" "}
                                    {subtitleCount || "Unknown"}
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Container for file subtitles */}
                    <div className="subtitle-preview-container" style={{ display: "flex", gap: "20px" }}>
                        {/* Subtitle content rendered only if file uploaded and subtitles fetched */}
                        {subtitleFile && subtitlePreview && (
                            <div className="subtitle-content">
                                {/* Subtitle entries rendered one-by-one in ascending order */}
                                {sortedSubtitles.map((key) => (
                                    <div key={`source-${key}`} className="subtitle-entry">
                                        {/* Subtitle rendered only if it's found in subtitlePreview by key index */}
                                        {subtitlePreview[key] ? (
                                            <>
                                                <div>{key}</div>
                                                <div>
                                                    {subtitlePreview[key].start}{" --> "}
                                                    {subtitlePreview[key].end}
                                                </div>
                                                <div>{subtitlePreview[key].text}</div>
                                            </>
                                        ) : (
                                            <div>-</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div >
            ) : (
                <div className="error-content">
                    <p>
                        <strong>Error:</strong>{" "}
                        {error || "Unknown error"}
                    </p>
                </div>
            )}
        </>
    )
};
