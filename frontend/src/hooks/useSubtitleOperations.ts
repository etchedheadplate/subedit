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
    const [resultMeta, setResultMeta] = useState<SubtitleMetadata | null>(null);
    const [examplePreview, setExamplePreview] =
        useState<SubtitlePreview | null>(null);
    const [exampleMeta, setExampleMeta] = useState<SubtitleMetadata | null>(
        null,
    );
    const [processedFile, setProcessedFile] = useState<SubtitleFile | null>(
        null,
    );
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [subtitleCount, setSubtitleCount] = useState<number>(0);
    const [exampleSubtitleCount, setExampleSubtitleCount] = useState<number>(0);

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

            // Extract actual subtitle entries (excluding metadata)
            const subtitles: SubtitlePreview = {};
            for (const [key, value] of Object.entries(result.preview)) {
                if (!isNaN(Number(key))) {
                    subtitles[Number(key)] = value;
                }
            }

            setSourcePreview(subtitles);

            // Calculate the number of subtitles in the file
            const count = Object.keys(subtitles).length;
            setSubtitleCount(count);

            // Set metadata separately
            setSourceMeta({
                encoding: result.encoding || "Unknown",
                confidence: 100,
                language: result.language || "Unknown",
            });

            return subtitles;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch preview of example file
    const fetchExamplePreview = async (filename: string) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.getSubtitlePreview(
                sessionId,
                filename,
            );

            // Extract actual subtitle entries (excluding metadata)
            const subtitles: SubtitlePreview = {};
            for (const [key, value] of Object.entries(result.preview)) {
                if (!isNaN(Number(key))) {
                    subtitles[Number(key)] = value;
                }
            }

            setExamplePreview(subtitles);

            // Calculate the number of subtitles in the file
            const count = Object.keys(subtitles).length;
            setExampleSubtitleCount(count);

            // Set metadata separately
            setExampleMeta({
                encoding: result.encoding || "Unknown",
                confidence: 100,
                language: result.language || "Unknown",
                filename: filename,
            });

            return subtitles;
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

            // Extract actual subtitle entries (excluding metadata)
            const subtitles: SubtitlePreview = {};
            for (const [key, value] of Object.entries(result.preview)) {
                if (!isNaN(Number(key))) {
                    subtitles[Number(key)] = value;
                }
            }

            setResultPreview(subtitles);

            // Set metadata for result
            setResultMeta({
                encoding: result.encoding || "Unknown",
                confidence: 100,
                language: result.language || "Unknown",
            });

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

            return subtitles;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Align operation
    const alignSubtitles = async (
        exampleFilename: string,
        sourceRange?: [number, number],
        exampleRange?: [number, number],
    ) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.alignSubtitles(
                sessionId,
                uploadedFile.filename,
                exampleFilename,
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

            setResultPreview(subtitles);

            // Set metadata for result
            setResultMeta({
                encoding: result.encoding || "Unknown",
                confidence: 100,
                language: result.language || "Unknown",
            });

            // Construct filename
            let filenameModifier = "aligned";
            if (sourceRange && exampleRange) {
                filenameModifier += `-src-${sourceRange[0]}-to-${sourceRange[1]}-ex-${exampleRange[0]}-to-${exampleRange[1]}`;
            }

            setProcessedFile(
                `${uploadedFile.filename.split(".srt")[0]}-${filenameModifier}.srt`,
            );

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

            setResultPreview(subtitles);

            // Set metadata for result
            setResultMeta({
                encoding: result.encoding || "Unknown",
                confidence: 100,
                language: result.language || "Unknown",
            });

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
        setResultPreview(null);
        setResultMeta(null);
        setProcessedFile(null);
    };

    return {
        sourcePreview,
        sourceMeta,
        resultPreview,
        resultMeta,
        examplePreview,
        exampleMeta,
        exampleSubtitleCount,
        processedFile,
        isLoading,
        error,
        subtitleCount,
        fetchSourcePreview,
        fetchExamplePreview,
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        getDownloadLink,
        resetResults,
    };
};
