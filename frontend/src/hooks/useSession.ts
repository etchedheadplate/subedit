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
            } catch (err: any) {
                console.error("Error fetching session ID:", err);
                setError(
                    "Failed to initialize application. Please reload the page.",
                );
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, []);

    return { sessionId, isLoading, error };
};
