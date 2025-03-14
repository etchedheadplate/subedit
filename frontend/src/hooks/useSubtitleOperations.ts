import { useState } from "react";
import { apiService } from "../services/apiService";
import { SubtitlePreview, SubtitleFile, SubtitleMetadata } from "../types";

export const useSubtitleOperations = (
    sessionId: string | null,
    uploadedFile: SubtitleFile | null,
) => {
    const [sourcePreview, setSourcePreview] = useState<SubtitlePreview | null>(
        null,
    );
    const [sourceMeta, setSourceMeta] = useState<SubtitleMetadata | null>(null);
    const [resultPreview, setResultPreview] = useState<SubtitlePreview | null>(
        null,
    );
    const [processedFile, setProcessedFile] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [subtitleCount, setSubtitleCount] = useState<number>(0);

    // Fetch preview of source file
    const fetchSourcePreview = async () => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.shiftSubtitles(
                sessionId,
                uploadedFile.filename,
                0,
                [], // Empty items array for preview
            );

            setSourcePreview(result.preview);
            console.log(result.preview);

            // Calculate the number of subtitles in the file
            if (result.preview) {
                const count = Object.keys(result.preview).length;
                setSubtitleCount(count);
            }

            // In a real implementation, get this from a dedicated endpoint
            setSourceMeta({
                encoding: result.encoding,
                confidence: 100,
                language: result.language,
            });

            return result.preview;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Shift operation
    const shiftSubtitles = async (delay: number, items: number[] = []) => {
        if (!uploadedFile || !sessionId) return;

        // Validate items if provided
        if (items.length > 0 && items.length !== 2) {
            setError("Items must contain exactly 2 values if specified");
            return;
        }

        if (items.length === 2) {
            const [start, end] = items;

            // Validate range
            if (start < 1 || start >= subtitleCount) {
                setError(
                    `Start index must be between 1 and ${subtitleCount - 1}`,
                );
                return;
            }

            if (end <= start || end > subtitleCount) {
                setError(
                    `End index must be between ${start + 1} and ${subtitleCount}`,
                );
                return;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.shiftSubtitles(
                sessionId,
                uploadedFile.filename,
                delay,
                items,
            );

            setResultPreview(result.preview);

            // Construct filename based on range if specified
            let filenameModifier = `shifted_by_${delay}_ms`;
            if (items.length === 2) {
                filenameModifier += `_from_${items[0]}_to_${items[1]}`;
            }

            setProcessedFile(
                `${uploadedFile.filename.split(".")[0]}_${filenameModifier}.srt`,
            );

            return result.preview;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // For downloading processed file
    const getDownloadLink = () => {
        if (!processedFile || !sessionId) return "";
        return apiService.downloadFile(sessionId, processedFile);
    };

    // Reset operation results
    const resetResults = () => {
        setResultPreview(null);
        setProcessedFile(null);
    };

    return {
        sourcePreview,
        sourceMeta,
        resultPreview,
        processedFile,
        isLoading,
        error,
        subtitleCount,
        fetchSourcePreview,
        shiftSubtitles,
        getDownloadLink,
        resetResults,
    };
};
