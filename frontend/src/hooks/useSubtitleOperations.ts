import { useState } from "react";
import { apiService } from "../services/apiService";
import { SubtitlePreview, SubtitleFile } from "../types";

export const useSubtitleOperations = (
    sessionId: string | null,
    uploadedFile: SubtitleFile | null,
) => {
    const [processedFile, setProcessedFile] = useState<SubtitleFile | null>(null,);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);


    // Shift operation
    const shiftSubtitles = async (delay: number, items: number[] = []) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.shiftSubtitles(
                sessionId,
                uploadedFile.filename,
                delay,
                items,
            );

            setProcessedFile({
                filename: result.processedFilename,
                session_id: sessionId || "",
                file_path: uploadedFile.file_path, // Same path as a source file
            });

        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Align operation
    const alignSubtitles = async (
        sourceFile: SubtitleFile,
        exampleFile: SubtitleFile,
        sourceRange: [number, number],
        exampleRange: [number, number],
    ) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.alignSubtitles(
                sessionId,
                sourceFile.filename,
                exampleFile.filename,
                sourceRange,
                exampleRange,
            );

            // Extract actual subtitle entries (excluding metadata)
            const subtitles: SubtitlePreview = {};
            for (const [key, value] of Object.entries(result.preview)) {
                if (!isNaN(Number(key))) {
                    subtitles[Number(key)] = value;
                }
            }

            setProcessedFile({
                filename: result.processedFilename,
                session_id: sessionId || "",
                file_path: sourceFile.file_path,
            });

            return subtitles;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Clean operation
    const cleanSubtitles = async () => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.cleanSubtitles(
                sessionId,
                uploadedFile.filename,
                {},
            );

            // Extract actual subtitle entries (excluding metadata)
            const subtitles: SubtitlePreview = {};
            for (const [key, value] of Object.entries(result.preview)) {
                if (!isNaN(Number(key))) {
                    subtitles[Number(key)] = value;
                }
            }

            // Set processed file name
            setProcessedFile({
                filename: result.processedFilename,
                session_id: sessionId || "",
                file_path: uploadedFile.file_path, // Same path as a source file
            });

            return subtitles;
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
        return apiService.downloadFile(sessionId, processedFile.filename);
    };

    // Reset operation results
    const resetResults = () => {
        setProcessedFile(null);
    };

    return {
        processedFile,
        isLoading,
        error,
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        getDownloadLink,
        resetResults,
    };
};
