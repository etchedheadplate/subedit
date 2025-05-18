import React, { useState, useCallback, useRef } from "react";
import { useLanguage } from "../hooks/useLanguage";

interface DragAndDropAreaProps {
    onFileUpload: (file: File) => Promise<void>;
    isLoading: boolean;
    uploadedFile: { filename: string } | null;
    preUploadInstructionText?: string;
    preUploadSubInstructionText?: string;
    postUploadIntroFileText?: string;
    postUploadSubInstructionText?: string;
    className?: string;
    disabled?: boolean;
}

const DragAndDropArea: React.FC<DragAndDropAreaProps> = ({
    onFileUpload,
    isLoading,
    uploadedFile,
    className = "",
    preUploadInstructionText,
    preUploadSubInstructionText,
    postUploadIntroFileText,
    postUploadSubInstructionText,
    disabled = false,
}) => {
    // Get translation function from language context
    const { t } = useLanguage();

    const [dragActive, setDragActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fallback to translation only if props aren't explicitly provided
    const instructionText = preUploadInstructionText ?? t('drag-and-drop.preUploadInstructionText');
    const subInstructionText = preUploadSubInstructionText ?? t('drag-and-drop.preUploadSubInstructionText');
    const postFileText = postUploadIntroFileText ?? t('drag-and-drop.postUploadIntroFileText');
    const postSubText = postUploadSubInstructionText ?? t('drag-and-drop.postUploadSubInstructionText');


    // Handle drag events
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled) return;

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, [disabled]);

    // Handle drop event
    const handleDrop = useCallback(
        async (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (disabled) return;

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith(".srt")) {
                    await onFileUpload(file);
                } else {
                    console.error("Only .srt files are allowed");
                }
            }
        },
        [onFileUpload, disabled]
    );

    // Handle click on the area
    const handleClick = () => {
        if (!isLoading && !disabled && fileInputRef.current) {
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
                className={`drag-and-drop-area ${dragActive ? 'drag-active' : ''} ${isLoading ? 'loading' : ''} ${disabled ? 'disabled' : ''} ${className}`}
                onClick={handleClick}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {!uploadedFile ? (
                    <>
                        <p className="drag-and-drop-area-main-text">{instructionText}</p>
                        <p className="drag-and-drop-area-sub-text" style={{ fontSize: "0.8em", color: "#6c757d" }}>
                            {subInstructionText}
                        </p>
                    </>
                ) : (
                    <>
                        <p className="drag-and-drop-area-sub-text">{postFileText}</p>
                        <p className="drag-and-drop-area-main-text"><strong>{uploadedFile.filename}</strong></p>
                        <p className="drag-and-drop-area-sub-text" style={{ fontSize: "0.8em", color: "#6c757d" }}>
                            {postSubText}
                        </p>
                    </>
                )}
            </div>
        </>
    );
};

export default DragAndDropArea;
