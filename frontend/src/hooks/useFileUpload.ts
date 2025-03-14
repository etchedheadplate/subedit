import { useState } from "react";
import { apiService } from "../services/apiService";
import { SubtitleFile } from "../types";

export const useFileUpload = (sessionId: string | null) => {
    const [uploadedFile, setUploadedFile] = useState<SubtitleFile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = async (file: File) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await apiService.uploadFile(file, sessionId);
            setUploadedFile(result);
            return result;
        } catch (err: any) {
            setError(err.message);
            setUploadedFile(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const resetUpload = () => {
        setUploadedFile(null);
        setError(null);
    };

    return {
        uploadedFile,
        isLoading,
        error,
        uploadFile,
        resetUpload,
    };
};
