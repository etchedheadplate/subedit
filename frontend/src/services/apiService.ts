import { SubtitleFile, SubtitlePreview } from "../types";

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "");
const DEBUG: boolean = import.meta.env.VITE_DEBUG === "true";

if (DEBUG) {
    API_BASE_URL = "http://localhost:8000";
}

export const apiService = {
    // Errors logger
    logClientError: async (message: string) => {
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/frontend-error`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                }),
            });
        } catch (err) {
            console.error("Failed to log client error:", err);
        }
    },

    // Session management
    getSession: async (): Promise<string> => {
        const response = await fetch(`${API_BASE_URL}/get-session`, {
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

        const response = await fetch(`${API_BASE_URL}/upload`, {
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

    downloadFile: (sessionId: string, filename: string): void => {
        const url = `${API_BASE_URL}/download?session_id=${sessionId}&filename=${filename}`;

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename; // Optional: helps some browsers
        anchor.style.display = "none";

        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    },

    // Subtitle operations
    fetchSubtitlesInfo: async (
        sessionId: string,
        filename: string,
    ): Promise<{
        filename: string;
        preview: SubtitlePreview;
        encoding: string;
        confidence: number;
        language: string;
        engine_eta: number;
        duck_eta: number;
    }> => {
        const response = await fetch(`${API_BASE_URL}/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Fetch Info operation failed");
        }

        return {
            filename: data.filename,
            preview: data.preview,
            encoding: data.encoding,
            confidence: data.confidence,
            language: data.language,
            engine_eta: data.engine_eta,
            duck_eta: data.duck_eta,
        };
    },

    getStatistics: async (): Promise<{
        uploaded: number;
        downloaded: number;
        total: number;
        shifted: number;
        aligned: number;
        cleaned: number;
        translated: number;
    }> => {
        const response = await fetch(`${API_BASE_URL}/statistics`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // The FastAPI endpoint returns the data in the exact format we need
        return {
            uploaded: data.uploaded,
            downloaded: data.downloaded,
            total: data.total,
            shifted: data.shifted,
            aligned: data.aligned,
            cleaned: data.cleaned,
            translated: data.translated,
        };
    },

    // Check task status
    checkTaskStatus: async (
        sessionId: string,
        filename: string,
    ): Promise<{
        status: string;
        processed_filename?: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/task-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                filename: filename,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Status check failed");
        }

        return {
            status: data.status,
            processed_filename: data.processed_filename,
        };
    },

    shiftSubtitles: async (
        sessionId: string,
        sourceFilename: string,
        delay: number,
        items: number[],
    ): Promise<{
        sourceFilename: string;
        status: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/shift`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                source_filename: sourceFilename,
                delay: delay,
                ...(items.length > 0 && { items }), // Only include `items` if it's not null
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Shift operation failed");
        }

        return {
            sourceFilename: data.source_filename || data.filename,
            status: data.status,
        };
    },

    alignSubtitles: async (
        sessionId: string,
        sourceFilename: string,
        exampleFilename: string,
        sourceSlice?: number[],
        exampleSlice?: number[],
        trimStart?: boolean,
        trimEnd?: boolean,
    ): Promise<{
        sourceFilename: string;
        status: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/align`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                source_filename: sourceFilename,
                example_filename: exampleFilename,
                source_slice: sourceSlice,
                example_slice: exampleSlice,
                trim_start: trimStart,
                trim_end: trimEnd,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Align operation failed");
        }

        return {
            sourceFilename: data.filename || data.source_filename,
            status: data.status,
        };
    },

    cleanSubtitles: async (
        sessionId: string,
        sourceFilename: string,
        options: {
            bold?: boolean;
            italic?: boolean;
            underline?: boolean;
            strikethrough?: boolean;
            color?: boolean;
            font?: boolean;
        },
    ): Promise<{
        sourceFilename: string;
        status: string;
    }> => {
        const response = await fetch(`${API_BASE_URL}/clean`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                source_filename: sourceFilename,
                ...options,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Clean operation failed");
        }

        return {
            sourceFilename: data.filename || data.source_filename,
            status: data.status,
        };
    },

    engineTranslateSubtitles: async (
        sessionId: string,
        sourceFilename: string,
        targetLanguage: string,
        originalLanguage: string,
        engine: string,
        cleanMarkup: boolean,
    ): Promise<{
        sourceFilename: string;
        status: string;
        engine_eta: number;
    }> => {
        const response = await fetch(`${API_BASE_URL}/engine`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                source_filename: sourceFilename,
                target_language: targetLanguage,
                original_language: originalLanguage,
                engine: engine,
                clean_markup: cleanMarkup,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Engine translation operation failed");
        }

        return {
            sourceFilename: data.source_filename,
            status: data.status,
            engine_eta: data.engine_eta,
        };
    },

    duckTranslateSubtitles: async (
        sessionId: string,
        sourceFilename: string,
        targetLanguage: string,
        originalLanguage: string,
        modelName: string = "GPT-4o",
        modelThrottle: number = 0.5,
        requestTimeout: number = 10,
        responseTimeout: number = 45,
    ): Promise<{
        sourceFilename: string;
        status: string;
        duck_eta: number;
    }> => {
        const response = await fetch(`${API_BASE_URL}/duck`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                source_filename: sourceFilename,
                target_language: targetLanguage,
                original_language: originalLanguage,
                model_name: modelName,
                model_throttle: modelThrottle,
                request_timeout: requestTimeout,
                response_timeout: responseTimeout,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Duck translation operation failed");
        }

        return {
            sourceFilename: data.source_filename,
            status: data.status,
            duck_eta: data.duck_eta,
        };
    },
};
