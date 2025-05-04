import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";

export const useSession = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initSession = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const id = await apiService.getSession();
                setSessionId(id);
            } catch (err: unknown) {
                // Narrow the error type to `Error` before accessing properties
                if (err instanceof Error) {
                    console.error("Error fetching session ID:", err.message);
                    setError("Failed to initialize application. Please reload the page.");
                } else {
                    console.error("Unknown error:", err);
                    setError("An unexpected error occurred.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, []);

    return { sessionId, isLoading, error };
};
