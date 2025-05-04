import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { SubtitlePreview, SubtitleFile, SubtitleMetadata } from "../types";

interface SubtitlePreviewProps {
    sessionId: string | null;
    subtitleFile: SubtitleFile | null;
    isDownloadable: boolean | null;
    fileType?: string;
    onSubtitleCountChange?: (count: number) => void;
    onMetadataLoaded?: (metadata: SubtitleMetadata) => void;
}

const UniversalSubtitlePreview: React.FC<SubtitlePreviewProps> = ({
    sessionId,
    subtitleFile,
    fileType = "Source",
    onSubtitleCountChange,
    onMetadataLoaded,
}) => {
    const [subtitleMeta, setSubtitleMeta] = useState<SubtitleMetadata | null>(null);
    const [subtitlePreview, setSubtitlePreview] = useState<SubtitlePreview | null>(null);
    const [subtitleCount, setSubtitleCount] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // Get all subtitles set
    const allSubtitles = new Set<number>();
    if (subtitlePreview) {
        Object.keys(subtitlePreview).forEach((key) => allSubtitles.add(Number(key)));
    }

    // Convert subtitles set to array and sort
    const sortedSubtitles = Array.from(allSubtitles).sort((a, b) => a - b);

    // Helper function to sanitize subtitle text and only allow SRT-compatible tags
    const sanitizeSubtitleText = (text: string): string => {
        if (!text) return '';

        // Create a temporary div element to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;

        // Recursive function to sanitize nodes
        const sanitizeNode = (node: Node): void => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const tagName = element.tagName.toLowerCase();

                // List of allowed tags according to SubRip spec
                const allowedTags = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'font'];

                if (!allowedTags.includes(tagName)) {
                    // Replace disallowed tags with their text content
                    const textNode = document.createTextNode(element.textContent || '');
                    element.parentNode?.replaceChild(textNode, element);
                } else if (tagName === 'font') {
                    // For font tags, only allow color attribute
                    const colorAttr = element.getAttribute('color');

                    // Remove all attributes
                    while (element.attributes.length > 0) {
                        element.removeAttribute(element.attributes[0].name);
                    }

                    // Add back only the color attribute if it existed
                    if (colorAttr) {
                        element.setAttribute('color', colorAttr);
                    }
                } else {
                    // For allowed tags, remove all attributes
                    while (element.attributes.length > 0) {
                        element.removeAttribute(element.attributes[0].name);
                    }
                }

                // Process child nodes
                Array.from(element.childNodes).forEach(sanitizeNode);
            }
        };

        // Process all nodes
        Array.from(tempDiv.childNodes).forEach(sanitizeNode);

        return tempDiv.innerHTML;
    };

    // Helper function to safely render sanitized HTML markup in subtitles
    const renderSubtitleWithMarkup = (text: string) => {
        // Sanitize the text before rendering
        const sanitizedText = sanitizeSubtitleText(text);
        return { __html: sanitizedText };
    };

    // Fetch preview of source file
    useEffect(() => {
        const fetchFilePreview = async () => {
            if (!subtitleFile || !sessionId) return;

            setError(null);

            try {
                // Make API empty shift request to get preview elements
                const result = await apiService.fetchSubtitlesInfo(
                    sessionId,
                    subtitleFile.filename,
                );

                // Extract file metadata
                const meta: SubtitleMetadata = {
                    encoding: result.encoding,
                    confidence: result.confidence * 100, // Probability -> Percentage
                    language: result.language,
                    eta: result.eta,
                    filename: subtitleFile.filename,
                }
                setSubtitleMeta(meta);

                // Call the callback with metadata if provided
                if (onMetadataLoaded) {
                    onMetadataLoaded(meta);
                }

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

                // Call the callback with the count if provided
                if (onSubtitleCountChange) {
                    onSubtitleCountChange(count);
                }

            } catch (err: unknown) {
                // Narrow the error type to `Error` before accessing properties
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("An unexpected error occurred.");
                }
                return null;
            }
        };
        fetchFilePreview();
    }, [sessionId, subtitleFile, onSubtitleCountChange, onMetadataLoaded]);

    return (
        <>
            {/* Metadata content rendered only if file uploaded and metadata fetched */}
            {!error ? (
                <div className="metadata-and-subtitle-preview-section">
                    {/* Container for file metadata */}
                    <div className="metadata-preview-container">
                        {/* Metadata content rendered only if file uploaded and metadata fetched */}
                        {subtitleFile && subtitleMeta && (
                            <div className="metadata-content">
                                <center>
                                    <p style={{ fontSize: "0.8em", color: "#6c757d" }}>
                                        <strong>{fileType} file</strong>
                                        {" | "}{subtitleMeta.language || "? lang"} {subtitleMeta.confidence || ""}%
                                        {" | "}{subtitleMeta.encoding || "? encoding"}
                                        {" | "}{subtitleCount || "? num of"} subtitles
                                    </p>
                                    <p>
                                        {subtitleMeta.filename || "Unknown Filename"}
                                    </p>
                                </center>
                            </div>
                        )}
                    </div>
                    {/* Container for file subtitles */}
                    <div className="subtitle-preview-container">
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
                                                <div
                                                    dangerouslySetInnerHTML={renderSubtitleWithMarkup(subtitlePreview[key].text)}
                                                />
                                            </>
                                        ) : (
                                            <div>-</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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

export default UniversalSubtitlePreview;
