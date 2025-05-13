from typing import TypedDict, Dict, Optional, List, Protocol
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

class TranslatorProtocol(Protocol):
    def translate(self, text: str) -> str: ...

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

class EngineRequest(BaseModel):
    session_id: str
    source_filename: str
    target_language: str
    original_language: Optional[str]
    file_path: Optional[str]
    engine: str
    clean_markup: bool = True

class DuckRequest(BaseModel):
    session_id: str
    source_filename: str
    target_language: str
    original_language: str
    model_name: str
    model_throttle: float
    request_timeout: int = 10
    response_timeout: int = 45

# duck.json
class ModelInfo(TypedDict):
    name: str
    tokens: float

class DuckData(TypedDict):
    codes: Dict[str, str]
    models: Dict[str, ModelInfo]

# statistics.json
class FilesProcessed(TypedDict):
    shift: int
    align: int
    clean: int
    translate: int

class DuckStats(TypedDict):
    total_count_of_responses: int
    total_responses_duration: float
    average_response_duration: float

class StatisticsData(TypedDict):
    last_update: int
    files_processed: FilesProcessed
    duck_statistics: DuckStats

# engines.json
class LanguagesData(TypedDict):
    codes: Dict[str, str]
