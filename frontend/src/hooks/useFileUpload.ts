import { useState } from "react";
import { apiService } from "../services/apiService";
import { SubtitleFile } from "../types";

export const useFileUpload = (sessionId: string | null) => {
    const [uploadedFile, setUploadedFile] = useState<SubtitleFile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await apiService.uploadFile(file, sessionId || "");
            setUploadedFile(result);
            return result; // Return the uploaded file info
        } catch (err: any) {
            setError(err.message);
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
