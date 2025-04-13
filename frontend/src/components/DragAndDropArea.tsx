import React, { useState, useCallback, useRef } from "react";

interface DragAndDropAreaProps {
    onFileUpload: (file: File) => Promise<void>;
    isLoading: boolean;
    uploadedFile: { filename: string } | null;
    preUploadInstructionText?: string;
    preUploadSubInstructionText?: string;
    postUploadIntroFileText?: string;
    postUploadSubInstructionText?: string;
    className?: string;
}

const DragAndDropArea: React.FC<DragAndDropAreaProps> = ({
    onFileUpload,
    isLoading,
    uploadedFile,
    preUploadInstructionText = "Upload subtitles, fren!",
    preUploadSubInstructionText = "Drag & drop .srt file or click anywhere in this area",
    postUploadIntroFileText = "Uploaded source file:",
    postUploadSubInstructionText = "Select option below or upload new file",
    className = "",
}) => {
    const [dragActive, setDragActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle drag events
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    // Handle drop event
    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith(".srt")) {
                    await onFileUpload(file);
                } else {
                    console.error("Only .srt files are allowed");
                }
            }
        },
        [onFileUpload]
    );

    // Handle click on the area
    const handleClick = () => {
        if (!isLoading && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Handle file input change
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        await onFileUpload(e.target.files[0]);
    };

    return (
        <>
            {/* Hidden file input */}
            <input
                className="drag-and-drop-input"
                type="file"
                accept=".srt"
                onChange={handleFileUpload}
                disabled={isLoading}
                style={{ display: "none" }}
                id="file-upload"
                ref={fileInputRef}
            />

            {/* Drag and Drop Zone */}
            <div
                className={`drag-and-drop-area ${dragActive ? 'drag-active' : ''} ${isLoading ? 'loading' : ''} ${className}`}
                onClick={handleClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {!uploadedFile ? (
                    <>
                        <p className="drag-and-drop-area-main-text">{preUploadInstructionText}</p>
                        <p className="drag-and-drop-area-sub-text" style={{ fontSize: "0.8em", color: "#6c757d" }}>
                            {preUploadSubInstructionText}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="drag-and-drop-area-sub-text">{postUploadIntroFileText}</p>
                        <p className="drag-and-drop-area-main-text"><strong>{uploadedFile.filename}</strong></p>
                        <p className="drag-and-drop-area-sub-text" style={{ fontSize: "0.8em", color: "#6c757d" }}>
                            {postUploadSubInstructionText}
                        </p>
                    </>
                )}
            </div>
        </>
    );
};

export default DragAndDropArea;
