import React, { useState } from "react";

interface ShiftOperationProps {
    onShift: (delay: number) => Promise<any>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    isLoading: boolean;
}

const ShiftOperation: React.FC<ShiftOperationProps> = ({
    onShift,
    onDownload,
    hasProcessedFile,
    isLoading,
}) => {
    const [delay, setDelay] = useState<number>(0);

    const handleShift = () => {
        onShift(delay);
    };

    return (
        <div style={{ marginTop: "40px", marginBottom: "20px" }}>
            <div>
                <p>
                    Enter number of milliseconds (1 second = 1000 milliseconds)
                    to shift timing. Number can be positive or negative.
                </p>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    <button
                        onClick={handleShift}
                        disabled={isLoading}
                        style={{
                            padding: "8px 15px",
                            backgroundColor: "#dc2f02",
                            color: "#dee2e6",
                            border: "none",
                            borderRadius: "2px",
                            cursor: "pointer",
                        }}
                    >
                        Shift
                    </button>
                    <label htmlFor="delay-input">by</label>
                    <input
                        id="delay-input"
                        type="number"
                        value={delay}
                        onChange={(e) => setDelay(Number(e.target.value))}
                        style={{
                            padding: "8px",
                            width: "100px",
                            borderRadius: "2px",
                            border: "1px solid #ccc",
                        }}
                    />
                    <label htmlFor="delay-input">ms</label>
                </div>

                {hasProcessedFile && (
                    <button
                        onClick={onDownload}
                        style={{
                            padding: "8px 15px",
                            backgroundColor: "#5a189a",
                            color: "#dee2e6",
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

export default ShiftOperation;
