import { SubtitleFile, SubtitlePreview } from "../types";

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
    ): Promise<{ preview: SubtitlePreview }> => {
        const response = await fetch(`${API_BASE_URL}/shift/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
                delay: delay,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Shift operation failed");
        }

        return {
            preview: data.preview,
        };
    },

    // Other operations would be implemented here (align, clean, translate)
};
