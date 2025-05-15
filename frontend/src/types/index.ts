export interface SubtitleFile {
    filename: string;
    session_id: string;
    file_path: string;
}

export interface SubtitleMetadata {
    encoding: string;
    confidence: number;
    language: string;
    eta: number;
    filename?: string;
}

export interface SubtitleEntry {
    start: string;
    end: string;
    text: string;
}

export interface SubtitlePreview {
    [key: number]: SubtitleEntry;
}

export interface ProcessingOptions {
    shift: null;
    align: null;
    clean: null;
    translate: null;
    enginetranslate: null;
    ducktranslate: null;
}

export type TranslateType = "enginetranslate" | "ducktranslate";

export type OperationType = "shift" | "align" | "clean" | "translate" | "enginetranslate" | "ducktranslate" | null;
