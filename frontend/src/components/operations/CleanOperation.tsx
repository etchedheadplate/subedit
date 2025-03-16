import React, { useState } from "react";

interface CleanOperationProps {
    onClean: (options: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikethrough: boolean;
        color: boolean;
        font: boolean;
    }) => Promise<void>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    isLoading: boolean;
}

const CleanOperation: React.FC<CleanOperationProps> = ({
    onClean,
    onDownload,
    hasProcessedFile,
    isLoading,
}) => {
    // Markup removal options
    const [options, setOptions] = useState({
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        color: true,
        font: true,
    });

    // Handle option change
    const handleOptionChange = (option: keyof typeof options) => {
        setOptions({
            ...options,
            [option]: !options[option],
        });
    };

    // Handle clean operation
    const handleClean = async () => {
        await onClean(options);
    };

    return (
        <div style={{ marginBottom: "20px" }}>
            <div style={{ marginBottom: "20px" }}>
                <h3>Select Markup to Remove</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                    {Object.entries(options).map(([key, value]) => (
                        <label
                            key={key}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                                minWidth: "120px",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={value}
                                onChange={() =>
                                    handleOptionChange(
                                        key as keyof typeof options,
                                    )
                                }
                                style={{ marginRight: "8px" }}
                            />
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
                <button
                    onClick={handleClean}
                    disabled={
                        isLoading ||
                        Object.values(options).every((option) => !option)
                    }
                    style={{
                        padding: "10px 15px",
                        backgroundColor: "#0000ff",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "2px",
                        cursor:
                            !isLoading &&
                            Object.values(options).some((option) => option)
                                ? "pointer"
                                : "not-allowed",
                    }}
                >
                    {isLoading ? "Processing..." : "Clean"}
                </button>

                {hasProcessedFile && (
                    <button
                        onClick={onDownload}
                        style={{
                            padding: "10px 15px",
                            backgroundColor: "#008000",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "2px",
                            cursor: "pointer",
                        }}
                    >
                        Download
                    </button>
                )}
            </div>
        </div>
    );
};

export default CleanOperation;
