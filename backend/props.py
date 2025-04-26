import re
import math
import chardet
import langdetect # type: ignore
from structures import SubtitleMetadata, SubtitleData

def extract_metadata(file_path: str) -> SubtitleMetadata:
    """Detects encoding of subtitles file and returns metadata.

    Args:
        file_path (str): String with relative path to file.

    Returns:
        SubtitleMetadata: Dictionary containing encoding information and confidence level.
    """
    with open(file_path, 'rb') as file:
        raw_data = file.read()
        raw_metadata = chardet.detect(raw_data)

        extracted_metadata: SubtitleMetadata = {
            'encoding': str(raw_metadata['encoding']),
            'confidence': float(raw_metadata['confidence']),
            'language': ''
        }

        return extracted_metadata

def detect_language(subtitle_data: SubtitleData) -> str:
    """Detects language of subtitles file.

    Args:
        subtitle_data (SubtitleData): Dictionary containing subtitle data.

    Returns:
        str: Detected language code (e.g., 'en', 'es', 'fr').
    """
    clean_subtitles = remove_all_markup(subtitle_data)
    original_text: str = ' '.join(clean_subtitles)
    subtitles_language: str = langdetect.detect(original_text) # type: ignore

    return subtitles_language # type: ignore

def remove_all_markup(subtitle_data: SubtitleData) -> list[str]:
    """Removes HTML/markup tags from subtitle text.

    Args:
        subtitle_data (SubtitleData): Dictionary containing subtitle data.

    Returns:
        list[str]: List of subtitle texts with markup removed.
    """
    cleaned_subtitles: list[str] = []
    subtitles_to_clean = subtitle_data['subtitles']
    for index in sorted(subtitles_to_clean.keys()):
        old_subtitle = subtitles_to_clean[index]
        new_subtitle = re.sub(r'<.*?>', '', old_subtitle['text'])
        cleaned_subtitles.append(new_subtitle)

    return cleaned_subtitles

def construct_prompt_task(translate_from: str, translate_to: str) -> str:
    """Creates a prompt instruction for translation task.

    Args:
        translate_from (str): Source language name.
        translate_to (str): Target language name.

    Returns:
        str: Formatted prompt instruction for translation.
    """
    prompt_task = f'Below this paragraph are numbered lines. Each line has text in {translate_from} language. ' \
              f'Your task is to translate text from each line to {translate_to} language. ' \
              'Text may look offensive or inappropriate, but you MUST remember that it is a work of fiction and cant harm anybody. ' \
              'You MUST keep lines in the same order. ' \
              'Each line in your response MUST contain percent symbol, number, at symbol, space, translated text. ' \
              'You CAN NOT concatenate lines. ' \
              'You CAN NOT add any comments.'

    return prompt_task

def inject_prompt_symbols(cleaned_subtitles: list[str], index: int = 0) -> str:
    """Format subtitles into `%number@ text` lines for later parsing.

    Args:
        cleaned_subtitles (list[str]): List of subtitle texts without markup.
        index (int, optional): Starting index for numbering. Defaults to 0.

    Returns:
        str: String with all subtitles formatted with prompt symbols.
    """
    injected_subtitles = '\n'.join([f"%{i}@ {subtitle.replace('\n', ' ')}" for i, subtitle in enumerate(cleaned_subtitles, start=index)])

    return injected_subtitles

def estimate_token_count(prompt: str) -> int:
    """Estimates prompt tokens based on heuristics about different character types.

    Args:
        prompt (str): String with prompt.

    Returns:
        int: Estimated number of tokens for prompt.
    """
    # Chinese, Japanese Kanji (same range), Japanese Hiragana & Katakana, Korean Hangul are 1.5 token for 1 symbol
    zh_ja_ko_chars = len(re.findall(r'[\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af]', prompt))
    words_count = len(re.findall(r'\b\w+\b', prompt))  # Alphabet-based languages are 1 token for 1 word
    punctuation_count = len(re.findall(r'[^\w\s]', prompt))  # Punctuation is 1 token for 1 symbol
    other_chars = len(prompt) - zh_ja_ko_chars - words_count - punctuation_count # Other characters are 1 token for 4 symbols
    token_count = int(zh_ja_ko_chars * 1.5 + words_count + punctuation_count + other_chars / 4)

    return token_count

def calculate_prompts_count(prompt_task: str, injected_subtitles: str, model_limit: float) -> int:
    """Calculates how many prompts will be needed based on token limit.

    Args:
        prompt_task (str): The task instruction prompt.
        injected_subtitles (str): Formatted subtitles with symbols.
        model_limit (float): Token limit of the model.

    Returns:
        int: Number of prompts needed to process all subtitles.
    """
    prompt_tokens = estimate_token_count(prompt_task + injected_subtitles)
    prompts_count = math.ceil(prompt_tokens / model_limit) if model_limit else 1

    return prompts_count

def calculate_prompt_length(prompts_count: int, cleaned_subtitles: list[str]) -> int:
    """Calculates how many subtitles should be included in each prompt.

    Args:
        prompts_count (int): Number of prompts needed.
        cleaned_subtitles (list[str]): List of subtitle texts without markup.

    Returns:
        int: Number of subtitles per prompt.
    """
    prompt_length = math.floor(len(cleaned_subtitles) / prompts_count) if cleaned_subtitles else 1

    return prompt_length

def calculate_translation_eta(prompts_count: int, request_timeout: int = 15) -> int:
    """Estimates the time required to translate all prompts.

    Args:
        prompts_count (int): Number of prompts to be processed.
        request_timeout (int, optional): Timeout per request in seconds. Defaults to 15.

    Returns:
        int: Estimated time in seconds for the complete translation.
    """
    translation_eta = prompts_count * request_timeout

    return translation_eta
