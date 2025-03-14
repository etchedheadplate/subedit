import React, { useState, useEffect } from "react";

interface ShiftOperationProps {
    onShift: (delay: number, items: number[]) => Promise<any>;
    onDownload: () => void;
    hasProcessedFile: boolean;
    isLoading: boolean;
    subtitleCount: number;
}

const ShiftOperation: React.FC<ShiftOperationProps> = ({
    onShift,
    onDownload,
    hasProcessedFile,
    isLoading,
    subtitleCount,
}) => {
    const [delay, setDelay] = useState<number>(0);
    const [useRange, setUseRange] = useState<boolean>(false);
    const [rangeStart, setRangeStart] = useState<number>(1);
    const [rangeEnd, setRangeEnd] = useState<number>(
        subtitleCount > 1 ? subtitleCount : 2,
    );
    const [rangeError, setRangeError] = useState<string | null>(null);

    // Update range end when subtitle count changes
    useEffect(() => {
        if (subtitleCount > 0) {
            setRangeEnd(subtitleCount);
            // Also reset rangeStart to 1 when subtitleCount changes
            setRangeStart(1);
        }
    }, [subtitleCount]);

    // Validate range inputs
    useEffect(() => {
        setRangeError(null);

        if (useRange) {
            if (rangeStart < 1 || rangeStart >= subtitleCount) {
                setRangeError(
                    `Start must be between 1 and ${subtitleCount - 1}`,
                );
                return;
            }

            if (rangeEnd <= rangeStart || rangeEnd > subtitleCount) {
                setRangeError(
                    `End must be between ${rangeStart + 1} and ${subtitleCount}`,
                );
                return;
            }
        }
    }, [rangeStart, rangeEnd, useRange, subtitleCount]);

    const handleShift = () => {
        const items = useRange ? [rangeStart, rangeEnd] : [];
        onShift(delay, items);
    };

    return (
        <div style={{ marginTop: "40px", marginBottom: "20px" }}>
            <div>
                <p>
                    Enter number of milliseconds (1 second = 1000 milliseconds)
                    to shift timing. Number can be positive or negative.
                </p>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    <button
                        onClick={handleShift}
                        disabled={isLoading || (useRange && !!rangeError)}
                        style={{
                            padding: "8px 15px",
                            backgroundColor: "#dc2f02",
                            color: "#dee2e6",
                            border: "none",
                            borderRadius: "2px",
                            cursor:
                                isLoading || (useRange && !!rangeError)
                                    ? "not-allowed"
                                    : "pointer",
                            opacity:
                                isLoading || (useRange && !!rangeError)
                                    ? 0.7
                                    : 1,
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

            {/* Subtitle range selector */}
            <div style={{ marginBottom: "20px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                    }}
                >
                    <input
                        type="checkbox"
                        id="use-range"
                        checked={useRange}
                        onChange={(e) => setUseRange(e.target.checked)}
                    />
                    <label htmlFor="use-range">
                        Apply to specific subtitle range
                    </label>
                </div>

                {useRange && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                            }}
                        >
                            <label htmlFor="range-start">From subtitle:</label>
                            <input
                                id="range-start"
                                type="number"
                                min={1}
                                max={subtitleCount - 1}
                                value={rangeStart}
                                onChange={(e) =>
                                    setRangeStart(Number(e.target.value))
                                }
                                style={{
                                    padding: "8px",
                                    width: "80px",
                                    borderRadius: "2px",
                                    border: "1px solid #ccc",
                                }}
                            />

                            <label htmlFor="range-end">To subtitle:</label>
                            <input
                                id="range-end"
                                type="number"
                                min={rangeStart + 1}
                                max={subtitleCount}
                                value={rangeEnd}
                                onChange={(e) =>
                                    setRangeEnd(Number(e.target.value))
                                }
                                style={{
                                    padding: "8px",
                                    width: "80px",
                                    borderRadius: "2px",
                                    border: "1px solid #ccc",
                                }}
                            />

                            <span
                                style={{ fontSize: "0.8em", color: "#6c757d" }}
                            >
                                (Total: {subtitleCount} subtitles)
                            </span>
                        </div>

                        {rangeError && (
                            <div
                                style={{ color: "#cc0000", fontSize: "0.9em" }}
                            >
                                {rangeError}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftOperation;
