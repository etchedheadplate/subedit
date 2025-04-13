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
    const [subtitleCount, setSubtitleCount] = useState<number>(0);

    // Generic function to fetch subtitle preview
    const countSubtitles = async (filename: string) => {
        if (!sessionId) return null;

        setIsLoading(true);
        setError(null);

        try {
            // Request appropriate API method
            const result = await apiService.showSubtitles(
                sessionId,
                filename,
            )

            // Calculate the number of subtitles in the file
            const count = Object.keys(result.preview).filter(key => !isNaN(Number(key))).length;

            // Update state
            setSubtitleCount(count);

            return count;
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

        setIsLoading(true);
        setError(null);

        try {
            await apiService.shiftSubtitles(
                sessionId,
                uploadedFile.filename,
                delay,
                items,
            );

            // Construct filename based on range if specified
            let filenameModifier = `shifted-by-${delay}-ms`;
            if (items.length === 2) {
                filenameModifier += `-from-${items[0]}-to-${items[1]}`;
            }

            setProcessedFile({
                filename: `${uploadedFile.filename.split(".srt")[0]}-${filenameModifier}.srt`,
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
        sourceRange?: [number, number],
        exampleRange?: [number, number],
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

            // Construct filename
            let filenameModifier = "aligned";
            if (sourceRange && exampleRange) {
                filenameModifier += `-src-${sourceRange[0]}-to-${sourceRange[1]}-ex-${exampleRange[0]}-to-${exampleRange[1]}`;
            }

            setProcessedFile({
                filename: `${sourceFile.filename.split(".srt")[0]}-${filenameModifier}.srt`,
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
                filename: `${uploadedFile.filename.split(".srt")[0]}-cleaned.srt`,
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
        subtitleCount,
        countSubtitles,
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        getDownloadLink,
        resetResults,
    };
};
