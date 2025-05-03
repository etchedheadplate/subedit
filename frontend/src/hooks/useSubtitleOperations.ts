import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { SubtitlePreview, SubtitleFile } from "../types";

export const useSubtitleOperations = (
    sessionId: string | null,
    uploadedFile: SubtitleFile | null,
) => {
    const [processedFile, setProcessedFile] = useState<SubtitleFile | null>(null,);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState<boolean>(false);
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

    // Shift operation
    const shiftSubtitles = async (delay: number, items: number[] = []) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Start the background task
            const result = await apiService.shiftSubtitles(
                sessionId,
                uploadedFile.filename,
                delay,
                items,
            );

            // Start polling for task completion
            setIsPolling(true);
            const interval = setInterval(async () => {
                try {
                    const status = await apiService.checkTaskStatus(
                        sessionId,
                        uploadedFile.filename
                    );

                    if (status.status === "completed" && status.processed_filename) {
                        // Task completed, clear polling
                        clearInterval(interval);
                        setIsPolling(false);

                        // Set processed file
                        setProcessedFile({
                            filename: status.processed_filename,
                            session_id: sessionId,
                            file_path: uploadedFile.file_path,
                        });

                        setIsLoading(false);
                    }
                } catch (err: any) {
                    clearInterval(interval);
                    setIsPolling(false);
                    setError(err.message);
                    setIsLoading(false);
                }
            }, 500); // Poll every 0.5 seconds

            setPollInterval(interval);

            return {
                eta: result.eta,
            };
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return null;
        }
    };

    // Align operation
    const alignSubtitles = async (
        sourceFile: SubtitleFile,
        exampleFile: SubtitleFile,
        sourceRange: [number, number],
        exampleRange: [number, number],
    ) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Start the background task
            const result = await apiService.alignSubtitles(
                sessionId,
                sourceFile.filename,
                exampleFile.filename,
                sourceRange,
                exampleRange,
            );

            // Start polling for task completion
            setIsPolling(true);
            const interval = setInterval(async () => {
                try {
                    const status = await apiService.checkTaskStatus(
                        sessionId,
                        sourceFile.filename
                    );

                    if (status.status === "completed" && status.processed_filename) {
                        // Task completed, clear polling
                        clearInterval(interval);
                        setIsPolling(false);

                        // Set processed file
                        setProcessedFile({
                            filename: status.processed_filename,
                            session_id: sessionId,
                            file_path: sourceFile.file_path,
                        });

                        setIsLoading(false);
                    }
                } catch (err: any) {
                    clearInterval(interval);
                    setIsPolling(false);
                    setError(err.message);
                    setIsLoading(false);
                }
            }, 500); // Poll every 0.5 seconds

            setPollInterval(interval);

            return {
                eta: result.eta,
            };
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return null;
        }
    };

    // Clean operation
    const cleanSubtitles = async (options: {
        bold: boolean,
        italic: boolean,
        underline: boolean,
        strikethrough: boolean,
        color: boolean,
        font: boolean,
    },) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Start the background task
            const result = await apiService.cleanSubtitles(
                sessionId,
                uploadedFile.filename,
                options,
            );

            // Start polling for task completion
            setIsPolling(true);
            const interval = setInterval(async () => {
                try {
                    const status = await apiService.checkTaskStatus(
                        sessionId,
                        uploadedFile.filename
                    );

                    if (status.status === "completed" && status.processed_filename) {
                        // Task completed, clear polling
                        clearInterval(interval);
                        setIsPolling(false);

                        // Set processed file
                        setProcessedFile({
                            filename: status.processed_filename,
                            session_id: sessionId,
                            file_path: uploadedFile.file_path,
                        });

                        setIsLoading(false);
                    }
                } catch (err: any) {
                    clearInterval(interval);
                    setIsPolling(false);
                    setError(err.message);
                    setIsLoading(false);
                }
            }, 500); // Poll every 0.5 seconds

            setPollInterval(interval);

            return {
                eta: result.eta,
            };
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return null;
        }
    };

    // Translate operation
    const translateSubtitles = async (
        targetLanguage: string,
        originalLanguage: string,
        modelName: string,
        modelThrottle: number,
    ) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Start the background task
            const result = await apiService.translateSubtitles(
                sessionId,
                uploadedFile.filename,
                targetLanguage,
                originalLanguage,
                modelName,
                modelThrottle,
            );

            // Start polling for task completion
            setIsPolling(true);
            const interval = setInterval(async () => {
                try {
                    const status = await apiService.checkTaskStatus(
                        sessionId,
                        uploadedFile.filename
                    );

                    if (status.status === "completed" && status.processed_filename) {
                        // Task completed, clear polling
                        clearInterval(interval);
                        setIsPolling(false);

                        // Set processed file
                        setProcessedFile({
                            filename: status.processed_filename,
                            session_id: sessionId,
                            file_path: uploadedFile.file_path,
                        });

                        setIsLoading(false);
                    }
                } catch (err: any) {
                    clearInterval(interval);
                    setIsPolling(false);
                    setError(err.message);
                    setIsLoading(false);
                }
            }, 3000); // Poll every 3 seconds

            setPollInterval(interval);

            return {
                eta: result.eta,
            };
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
            return null;
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

    // Cleanup function for the polling
    useEffect(() => {
        return () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [pollInterval]);

    return {
        processedFile,
        isLoading,
        error,
        shiftSubtitles,
        alignSubtitles,
        cleanSubtitles,
        translateSubtitles,
        getDownloadLink,
        resetResults,
    };
};
