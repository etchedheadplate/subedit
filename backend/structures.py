from typing import TypedDict, Dict, Optional, List
from pydantic import BaseModel

# Structures of subtitles data
class SubtitleMetadata(TypedDict):
    encoding: str
    confidence: float
    language: str

class SubtitleEntry(TypedDict):
    start: str
    end: str
    text: str

class SubtitleData(TypedDict):
    metadata: SubtitleMetadata
    subtitles: Dict[int, SubtitleEntry]
    eta: int

SubtitlesDataDict = Dict[str, SubtitleData]

# Structures of external JSON data
class ModelInfo(TypedDict):
    name: str
    tokens: float

class TranslateData(TypedDict):
    codes: Dict[str, str]
    models: Dict[str, ModelInfo]

class FilesProcessed(TypedDict):
    shift: int
    align: int
    clean: int
    translate: int

class TranslationTime(TypedDict):
    total_count_of_responses: int
    total_responses_duration: float
    average_response_duration: float

class TranslationData(TypedDict):
    last_update: int
    files_processed: FilesProcessed
    translation_time: TranslationTime

# Structures of API requests
class StatusRequest(BaseModel):
    session_id: str
    filename: str

class ShowRequest(BaseModel):
    session_id: str
    filename: str

class ShiftRequest(BaseModel):
    session_id: str
    source_filename: str
    delay: int
    items: Optional[List[int]] = None

class AlignRequest(BaseModel):
    session_id: str
    source_filename: str
    example_filename: Optional[str] = None
    source_slice: Optional[List[int]] = None
    example_slice: Optional[List[int]] = None
    trim_start: bool = True
    trim_end: bool = True

class CleanRequest(BaseModel):
    session_id: str
    source_filename: str
    bold: bool = False
    italic: bool = False
    underline: bool = False
    strikethrough: bool = False
    color: bool = False
    font: bool = False

class TranslateRequest(BaseModel):
    session_id: str
    source_filename: str
    target_language: str
    original_language: str
    model_name: str
    model_throttle: float
    request_timeout: int = 10
    response_timeout: int = 45
