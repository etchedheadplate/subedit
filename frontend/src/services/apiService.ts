import { SubtitleFile, SubtitlePreview, SubtitleMetadata } from "../types";

const API_BASE_URL = "http://localhost:8000";

export const apiService = {
    // Session management
    getSession: async (): Promise<string> => {
        const response = await fetch(`${API_BASE_URL}/get-session/`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.session_id;
    },

    // File operations
    uploadFile: async (
        file: File,
        sessionId: string,
    ): Promise<SubtitleFile> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_id", sessionId);

        const response = await fetch(`${API_BASE_URL}/upload/`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Upload failed");
        }

        return {
            filename: data.filename,
            session_id: data.session_id,
            file_path: data.file_path,
        };
    },

    downloadFile: (sessionId: string, filename: string): string => {
        return `${API_BASE_URL}/download/?session_id=${sessionId}&filename=${filename}`;
    },

    // Subtitle operations
    shiftSubtitles: async (
        sessionId: string,
        filename: string,
        delay: number,
        items: number[],
    ): Promise<{
        filename: string;
        preview: SubtitlePreview;
        language: string;
        encoding: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/shift/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
                delay: delay,
                ...(items.length > 0 && { items }), // Only include `items` if it's not null
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Shift operation failed");
        }

        return {
            filename: data.filename,
            preview: data.preview,
            language: data.language || "Unknown",
            encoding: data.encoding || "Unknown",
        };
    },

    // Other operations with metadata
    alignSubtitles: async (
        sessionId: string,
        filename: string,
        exampleFilename: string,
        sourceSlice?: number[],
        exampleSlice?: number[],
    ): Promise<{
        filename: string;
        preview: SubtitlePreview;
        language: string;
        encoding: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/align/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
                example_filename: exampleFilename,
                source_slice: sourceSlice,
                example_slice: exampleSlice,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Align operation failed");
        }

        return {
            filename: data.filename,
            preview: data.preview,
            language: data.language || "Unknown",
            encoding: data.encoding || "Unknown",
        };
    },

    cleanSubtitles: async (
        sessionId: string,
        filename: string,
        options: {
            bold?: boolean;
            italic?: boolean;
            underline?: boolean;
            strikethrough?: boolean;
            color?: boolean;
            font?: boolean;
        },
    ): Promise<{
        filename: string;
        preview: SubtitlePreview;
        language: string;
        encoding: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/clean/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
                ...options,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Clean operation failed");
        }

        return {
            filename: data.filename,
            preview: data.preview,
            language: data.language || "Unknown",
            encoding: data.encoding || "Unknown",
        };
    },

    translateSubtitles: async (
        sessionId: string,
        filename: string,
        targetLanguage: string,
        modelName: string = "GPT-4o",
        modelThrottle: number = 0.5,
    ): Promise<{
        filename: string;
        preview: SubtitlePreview;
        language: string;
        encoding: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/translate/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
                target_language: targetLanguage,
                model_name: modelName,
                model_throttle: modelThrottle,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Translation operation failed");
        }

        return {
            filename: data.filename,
            preview: data.preview,
            language: targetLanguage,
            encoding: data.encoding || "Unknown",
        };
    },
};
