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
    const [processedFile, setProcessedFile] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [subtitleCount, setSubtitleCount] = useState<number>(0);

    // For align mode
    const [examplePreview, setExamplePreview] =
        useState<SubtitlePreview | null>(null);
    const [exampleMeta, setExampleMeta] = useState<SubtitleMetadata | null>(
        null,
    );
    const [exampleSubtitleCount, setExampleSubtitleCount] = useState<number>(0);

    // For clean mode
    const [previewHtml, setPreviewHtml] = useState<SubtitlePreview | null>(
        null,
    );

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

            // Calculate the number of subtitles in the file
            if (result.preview) {
                const count = Object.keys(result.preview).length;
                setSubtitleCount(count);
            }

            // Set source metadata
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

    // Fetch preview of example file for align mode
    const fetchExamplePreview = async (exampleFilename: string) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.shiftSubtitles(
                sessionId,
                exampleFilename,
                0,
                [], // Empty items array for preview
            );

            setExamplePreview(result.preview);

            // Calculate the number of subtitles in the file
            if (result.preview) {
                const count = Object.keys(result.preview).length;
                setExampleSubtitleCount(count);
            }

            // Set example metadata
            setExampleMeta({
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

            // Set result metadata
            setResultMeta({
                encoding: result.encoding,
                confidence: 100,
                language: result.language,
            });

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

            setResultPreview(result.preview);

            // Set result metadata
            setResultMeta({
                encoding: result.encoding,
                confidence: 100,
                language: result.language,
            });

            // Construct filename
            let filenameModifier = `aligned_with_${exampleFilename.split(".")[0]}`;
            if (sourceRange && exampleRange) {
                filenameModifier += `_source_${sourceRange[0]}_to_${sourceRange[1]}_example_${exampleRange[0]}_to_${exampleRange[1]}`;
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

    // Clean operation
    const cleanSubtitles = async (options: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikethrough: boolean;
        color: boolean;
        font: boolean;
    }) => {
        if (!uploadedFile || !sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.cleanSubtitles(
                sessionId,
                uploadedFile.filename,
                options,
            );

            setResultPreview(result.preview);

            // Set result metadata
            setResultMeta({
                encoding: result.encoding,
                confidence: 100,
                language: result.language,
            });

            // Generate HTML preview version
            // This is a simplistic approach, in a real implementation you'd want
            // to properly parse the subtitle markup and convert to HTML
            const htmlPreview = { ...result.preview };
            if (options.bold) {
                // Convert <b> tags to actual HTML tags for preview
                Object.keys(htmlPreview).forEach((key) => {
                    const num = Number(key);
                    htmlPreview[num] = {
                        ...htmlPreview[num],
                        text: htmlPreview[num].text
                            .replace(/<b>/g, "<strong>")
                            .replace(/<\/b>/g, "</strong>"),
                    };
                });
            }

            if (options.italic) {
                // Convert <i> tags to actual HTML tags for preview
                Object.keys(htmlPreview).forEach((key) => {
                    const num = Number(key);
                    htmlPreview[num] = {
                        ...htmlPreview[num],
                        text: htmlPreview[num].text
                            .replace(/<i>/g, "<em>")
                            .replace(/<\/i>/g, "</em>"),
                    };
                });
            }

            setPreviewHtml(htmlPreview);

            // Create filename based on options
            const optionNames = Object.entries(options)
                .filter(([_, value]) => value)
                .map(([key]) => key)
                .join("_");

            setProcessedFile(
                `${uploadedFile.filename.split(".")[0]}_cleaned_${optionNames}.srt`,
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
        setResultMeta(null);
        setProcessedFile(null);
        setExamplePreview(null);
        setExampleMeta(null);
        setExampleSubtitleCount(0);
        setPreviewHtml(null);
    };

    return {
        sourcePreview,
        sourceMeta,
        resultPreview,
        resultMeta,
        examplePreview,
        exampleMeta,
        exampleSubtitleCount,
        previewHtml,
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
