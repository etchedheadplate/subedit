from typing import TypedDict, Dict

# Types of parsed subtitles data
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

# Structure of external JSON data
class ModelInfo(TypedDict):
    name: str
    tokens: float

class TranslateData(TypedDict):
    codes: Dict[str, str]
    models: Dict[str, ModelInfo]
