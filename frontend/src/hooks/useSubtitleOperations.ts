import { useState } from "react";
import { apiService } from "../services/api";
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
            );

            setSourcePreview(result.preview);

            // In a real implementation, get this from a dedicated endpoint
            setSourceMeta({
                encoding: "UTF-8",
                confidence: 100,
                language: "en",
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
    const shiftSubtitles = async (delay: number) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.shiftSubtitles(
                sessionId,
                uploadedFile.filename,
                delay,
            );

            setResultPreview(result.preview);
            setProcessedFile(
                `${uploadedFile.filename.split(".")[0]}_shifted_by_${delay}_ms.srt`,
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
        fetchSourcePreview,
        shiftSubtitles,
        getDownloadLink,
        resetResults,
    };
};
