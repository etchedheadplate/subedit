import React, { useState, useEffect } from "react";
import DragAndDropArea from "../../components/DragAndDropArea";
import UniversalSubtitlePreview from "../../components/SubtitlePreview";
import { SubtitleFile } from "../../types";
import { useFileUpload } from "../../hooks/useFileUpload";
import AlignHint from "../AlignHint"
import { TranslatedParagraph } from "../translation/LanguageParagraph";
import { useLanguage } from "../../hooks/useLanguage";

interface AlignOperationProps {
    onAlign: (
        sourceFile: SubtitleFile,
        exampleFile: SubtitleFile,
        sourceRange: [number, number],
        exampleRange: [number, number],
        trimStart: boolean,
        trimEnd: boolean,
    ) => Promise<{ sourceFilename: string; status: string; } | null | undefined>;
    sessionId: string | null;
    onDownload: () => void;
    sourceFile: SubtitleFile | null;
    hasProcessedFile: boolean;
    processedFile: SubtitleFile | null;
    resetResults: () => void;
}

const AlignOperation: React.FC<AlignOperationProps> = ({
    onAlign,
    onDownload,
    processedFile,
    sessionId,
    sourceFile,
    resetResults,
}) => {
    // Get translation function from language context
    const { t } = useLanguage();

    // State for the example file
    const {
        uploadedFile: exampleFile,
        uploadFile: uploadExampleFile,
        isLoading: isExampleFileUploading,
    } = useFileUpload(sessionId);

    // State to store the subtitle count from the preview
    const [sourceSubtitleCnt, setSourceSubtitleCnt] = useState<number>(1);
    const [exampleSubtitleCnt, setExampleSubtitleCnt] = useState<number>(1);

    // State for ranges with proper defaults
    const [sourceStart, setSourceStart] = useState<number>(1);
    const [sourceEnd, setSourceEnd] = useState<number>(sourceSubtitleCnt > 0 ? sourceSubtitleCnt : 1);
    const [exampleStart, setExampleStart] = useState<number>(1);
    const [exampleEnd, setExampleEnd] = useState<number>(exampleSubtitleCnt > 0 ? exampleSubtitleCnt : 2);

    // State for trim flags:
    const [trimStart, setTrimStart] = useState<boolean>(true);
    const [trimEnd, setTrimEnd] = useState<boolean>(true);

    // State to show hint
    const [showHint, setShowHint] = useState<boolean>(false);

    // Loading state to show animation while processing
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        await uploadExampleFile(file);
        resetResults();
    };

    // Update source file range end when subtitle count changes
    useEffect(() => {
        if (sourceSubtitleCnt > 0) {
            setSourceEnd(sourceSubtitleCnt);
            // Keep rangeStart at 1
            setSourceStart(1);
        }
    }, [sourceSubtitleCnt]);

    // Update example file range end when subtitle count changes
    useEffect(() => {
        if (exampleSubtitleCnt > 0) {
            setExampleEnd(exampleSubtitleCnt);
            // Keep rangeStart at 1
            setExampleStart(1);
        }
    }, [exampleSubtitleCnt]);

    // Callback to receive source subtitle count from preview
    const handleSourceSubtitleCntChange = (sourceCount: number) => {
        setSourceSubtitleCnt(sourceCount);
    };

    // Callback to receive example subtitle count from preview
    const handleExampleSubtitleCntChange = (exampleCount: number) => {
        setExampleSubtitleCnt(exampleCount);
    };

    // Handle trim options change
    const handleTrimChange = (flag: string) => {
        if (flag == 'start') {
            setTrimStart(!trimStart);
        }
        if (flag == 'end') {
            setTrimEnd(!trimEnd);
        }
    };

    // Handle cleanMarkup flag
    const handleShowHint = () => {
        setShowHint(prevMarkup => !prevMarkup);
    };

    // Handle align operation
    const handleAlign = async () => {
        if (!exampleFile) return;
        setIsLoading(true);

        // Properly declare the ranges
        const sourceRange: [number, number] = [sourceStart, sourceEnd];
        const exampleRange: [number, number] = [exampleStart, exampleEnd];

        if (sourceFile !== null) {
            await onAlign(sourceFile, exampleFile, sourceRange, exampleRange, trimStart, trimEnd);
        }
        setIsLoading(false);
    };

    // Preview of the source file
    const sourceFilePreview = (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={sourceFile}
            isDownloadable={false}
            fileType={t('preview.source')}
            onSubtitleCountChange={handleSourceSubtitleCntChange}
        />
    );

    // Preview of the example file
    const exampleFilePreview = exampleFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={exampleFile}
            isDownloadable={false}
            fileType={t('preview.example')}
            onSubtitleCountChange={handleExampleSubtitleCntChange}
        />
    ) : null;

    // Preview of the aligned file
    const alignedFilePreview = processedFile ? (
        <UniversalSubtitlePreview
            sessionId={sessionId}
            subtitleFile={processedFile}
            fileType={t('preview.aligned')}
            isDownloadable={true}
        />
    ) : null;

    return (
        <div className="align-operation-section">

            {/* Description of Align operation */}
            <div className="operation-description">
                <TranslatedParagraph
                    path="operations.align.operationDescription"
                    components={{
                        hintButton: <button
                            className="hint-button"
                            onClick={handleShowHint}
                        >
                        </button>,
                    }}
                />

                {showHint && <AlignHint />}
            </div>

            <DragAndDropArea
                onFileUpload={handleFileUpload}
                isLoading={isExampleFileUploading}
                uploadedFile={exampleFile}
                preUploadInstructionText={sourceFile ? t('operations.align.exampleDragAndDrop.examplePreUploadInstructionText') : t('operations.align.exampleDragAndDrop.examplePreUploadInstructionTextDisabled')}
                preUploadSubInstructionText={sourceFile ? t('drag-and-drop.preUploadSubInstructionText') : t('operations.align.exampleDragAndDrop.examplePreUploadSubInstructionTextDisabled')}
                postUploadIntroFileText={t('operations.align.exampleDragAndDrop.examplePostUploadIntroFileText')}
                postUploadSubInstructionText={t('operations.align.exampleDragAndDrop.examplePostUploadSubInstructionText')}
                className={!exampleFile ? "blinking" : ""}
                disabled={!sourceFile}
            />

            {/* Align controls section */}
            <div className="operation-controls-container">
                <>
                    {/* Align controls block */}
                    <div className="operation-controls-items">

                        {/* Controls for Source file */}
                        <div className="control-item">
                            <p className="control-title">{t('operations.align.controlItems.alignSource')}</p>

                            {/* Select Source file range */}
                            <div className="select-range-items">
                                <label className="range-text" htmlFor="source-start">{t('operations.align.controlItems.from')}</label>
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    title={
                                        !sourceFile
                                            ? t('operations.align.errors.uploadSource')
                                            : !exampleFile
                                                ? t('operations.align.errors.uploadExample')
                                                : ""
                                    }
                                    id="source-start"
                                    type="number"
                                    min={1}
                                    max={sourceSubtitleCnt > 0 ? sourceEnd - 1 : 1}
                                    value={sourceStart}
                                    onChange={(e) => setSourceStart(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of 1
                                        if (newValue < 1) newValue = 1;
                                        // Enforce maximum value of sourceEnd - 1
                                        if (newValue >= sourceEnd) newValue = sourceEnd - 1;
                                        setSourceStart(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />
                                <label className="range-text" htmlFor="source-end">{t('operations.align.controlItems.to')}</label>
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    title={
                                        !sourceFile
                                            ? t('operations.align.errors.uploadSource')
                                            : !exampleFile
                                                ? t('operations.align.errors.uploadExample')
                                                : ""
                                    }
                                    id="source-end"
                                    type="number"
                                    min={sourceStart + 1}
                                    max={sourceSubtitleCnt}
                                    value={sourceEnd}
                                    onChange={(e) => setSourceEnd(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of sourceStart + 1
                                        if (newValue <= sourceStart) newValue = sourceStart + 1;
                                        // Enforce maximum value of sourceSubtitleCnt
                                        if (newValue > sourceSubtitleCnt) newValue = sourceSubtitleCnt;
                                        setSourceEnd(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />
                            </div>
                        </div>

                        {/* Controls for Example file */}
                        <div className="control-item">
                            <p className="control-title">{t('operations.align.controlItems.byExample')}</p>

                            {/* Select Example file range */}
                            <div className="select-range-items">
                                {/* 'from' label */}
                                <label className="range-text" htmlFor="example-start">{t('operations.align.controlItems.from')}</label>

                                {/* Start input */}
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    title={
                                        !sourceFile
                                            ? t('operations.align.errors.uploadSource')
                                            : !exampleFile
                                                ? t('operations.align.errors.uploadExample')
                                                : ""
                                    }
                                    id="example-start"
                                    type="number"
                                    min={1}
                                    max={exampleSubtitleCnt > 0 ? exampleEnd - 1 : 1}
                                    value={exampleStart}
                                    onChange={(e) => setExampleStart(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of 1
                                        if (newValue < 1) newValue = 1;
                                        // Enforce maximum value of exampleEnd - 1
                                        if (newValue >= exampleEnd) newValue = exampleEnd - 1;
                                        setExampleStart(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />

                                {/* 'to' label */}
                                <label className="range-text" htmlFor="example-end">{t('operations.align.controlItems.to')}</label>

                                {/* End input */}
                                <input
                                    className={`range-form ${!sourceFile || !exampleFile ? " disabled" : ""}`}
                                    title={
                                        !sourceFile
                                            ? t('operations.align.errors.uploadSource')
                                            : !exampleFile
                                                ? t('operations.align.errors.uploadExample')
                                                : ""
                                    }
                                    id="example-end"
                                    type="number"
                                    min={exampleStart + 1}
                                    max={exampleSubtitleCnt}
                                    value={exampleEnd}
                                    onChange={(e) => setExampleEnd(Number(e.target.value))}
                                    onBlur={(e) => {
                                        let newValue = Number(e.target.value);
                                        // Enforce minimum value of exampleStart + 1
                                        if (newValue <= exampleStart) newValue = exampleStart + 1;
                                        // Enforce maximum value of exampleSubtitleCnt
                                        if (newValue > exampleSubtitleCnt) newValue = exampleSubtitleCnt;
                                        setExampleEnd(newValue);
                                    }}
                                    disabled={!sourceFile || !exampleFile}
                                />
                            </div>
                        </div>

                        {/* Controls for Trim flags */}
                        <div className="control-item">
                            <p className="control-title">{t('operations.align.controlItems.trimAligned')}</p>

                            <div className="select-checkboxes">
                                <label
                                    className="range-text"
                                    title={
                                        !sourceFile
                                            ? t('operations.align.errors.uploadSource')
                                            : !exampleFile
                                                ? t('operations.align.errors.uploadExample')
                                                : sourceStart == 1
                                                    ? t('operations.align.errors.changeFrom')
                                                    : ""
                                    }
                                >
                                    <input
                                        className={`options-checkboxes${!sourceFile || !exampleFile || sourceStart == 1 ? " disabled" : ""}`}
                                        type="checkbox"
                                        checked={trimStart}
                                        onChange={() => handleTrimChange('start')}
                                        style={{ marginRight: "8px" }}
                                        disabled={!sourceFile || !exampleFile || sourceStart == 1}
                                    />
                                    {
                                        (!sourceFile || !exampleFile || sourceStart == 1)
                                            ? t('operations.align.controlItems.beforeSource')
                                            : sourceStart == 2
                                                ? t('operations.align.controlItems.firstSubtitle')
                                                : sourceStart > 2
                                                    ? `${t('operations.align.controlItems.from')} 1 ${t('operations.align.controlItems.to')} ${sourceStart - 1}`
                                                    : ""
                                    }
                                </label>

                                <label
                                    className="range-text"
                                    title={
                                        !sourceFile
                                            ? t('operations.align.errors.uploadSource')
                                            : !exampleFile
                                                ? t('operations.align.errors.uploadExample')
                                                : sourceEnd == sourceSubtitleCnt
                                                    ? t('operations.align.errors.changeTo')
                                                    : ""
                                    }
                                >
                                    <input
                                        className={`options-checkboxes ${!sourceFile || !exampleFile || sourceEnd == sourceSubtitleCnt ? " disabled" : ""}`}
                                        type="checkbox"
                                        checked={trimEnd}
                                        onChange={() => handleTrimChange('end')}
                                        style={{ marginRight: "8px" }}
                                        disabled={!sourceFile || !exampleFile || sourceEnd == sourceSubtitleCnt}
                                    />
                                    {
                                        (!sourceFile || !exampleFile || sourceEnd == sourceSubtitleCnt)
                                            ? t('operations.align.controlItems.afterSource')
                                            : sourceEnd == sourceSubtitleCnt - 1
                                                ? t('operations.align.controlItems.lastSubtitle')
                                                : sourceEnd < sourceSubtitleCnt - 1
                                                    ? `${t('operations.align.controlItems.from')} ${sourceEnd + 1} ${t('operations.align.controlItems.to')} ${sourceSubtitleCnt}`
                                                    : ""
                                    }
                                </label>
                            </div>
                        </div>
                    </div>
                </>
            </div>

            {/* File preview section */}
            <div className="file-preview-section">

                {/* If only Source file uploaded: Source file preview + Align button */}
                {!sourceFile && !exampleFile && (
                    <div className="source-file-preview-container" style={{ flex: 1 }}>
                        {/* Align Button */}
                        <div className="operation-controls-buttons" title={t('operations.align.errors.uploadSource')}>
                            <button
                                className={`operation-button ${" disabled"}`}
                                onClick={handleAlign}
                                disabled={true}
                            >
                                {t('operations.align.alignButton')}
                            </button>
                        </div>
                    </div>
                )}
                {/* If only Source file uploaded: Source file preview + Align button */}
                {sourceFile && !exampleFile && (
                    <div className="source-file-preview-container" title={t('operations.align.errors.uploadExample')} style={{ flex: 1 }}>
                        {/* Align Button */}
                        <div className="operation-controls-buttons">
                            <button
                                className={`operation-button ${" disabled"}`}
                                onClick={handleAlign}
                                disabled={true}
                            >
                                {t('operations.align.alignButton')}
                            </button>
                        </div>
                        {/* Source file preview */}
                        {sourceFilePreview}
                    </div>
                )}
                {/* If Source and Example files uploaded */}
                {sourceFile && exampleFile && (
                    <div className="files-container">
                        {/* Align button */}
                        <div className="operation-controls-buttons">
                            <button
                                className="operation-button"
                                onClick={handleAlign}
                                disabled={false}
                            >
                                {t('operations.align.alignButton')}
                            </button>
                        </div>
                        <div className="uploaded-files-preview-container">
                            {/* Source file preview + Align button */}
                            <div className="source-file-preview-container">
                                {sourceFilePreview}
                            </div>
                            {/* Example file preview (no buttons) */}
                            <div className="modified-file-preview-container">
                                {exampleFilePreview}
                            </div>
                        </div>
                    </div>
                )}

                <div className="files-container">
                    {/* Aligned file preview + Download button */}
                    {processedFile ? (
                        <div className="modified-file-preview-container">
                            {/* Download button */}
                            <div className="operation-controls-buttons">
                                <button className="download-button" onClick={onDownload}>{t('operations.align.downloadButton')}</button>
                            </div>

                            {alignedFilePreview}
                        </div>
                    ) : isLoading ? (
                        <>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default AlignOperation;
