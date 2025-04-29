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
    shift: {
        delay: number;
    };
    align: {};
    clean: {};
    translate: {
        targetLanguage?: string;
    };
}

export type OperationType = keyof ProcessingOptions;
