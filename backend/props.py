import re
import math
import json
import chardet
import langdetect # type: ignore
from pathlib import Path
from structures import SubtitleMetadata, SubtitleData, TranslationData

def extract_metadata(file_path: str) -> SubtitleMetadata:
    """Detects encoding of subtitles file and returns metadata.

    Args:
        file_path (str): String with relative path to file.

    Returns:
        SubtitleMetadata: Metadata containing encoding information and confidence level.
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

def update_estimated_response_time(new_response_time: float) -> None:
    """Updates the estimated average response time for translation requests.

    This function reads the existing translation statistics from a JSON file, updates the average response duration
    based on the new response time provided, and writes the updated statistics back to the JSON file. It increments
    the total count of responses and updates the total duration of responses.

    Args:
        new_response_time (float): The response time for the latest translation request, in seconds.

    Returns:
        None: This function does not return a value. It modifies the statistics stored in the JSON file.
    """
    # Load the existing data from the JSON file
    with open(Path(__file__).parent / '../shared/statistics.json', 'r') as file:
        data: TranslationData = json.load(file)
        total_count_of_responses: int = data['translation_time']['total_count_of_responses']
        average_response_duration: float = data['translation_time']['average_response_duration']

        # Calculate the updated average response duration
        updated_average_response_duration = (average_response_duration * total_count_of_responses + new_response_time) / (total_count_of_responses + 1)

        # Update the data structure with the new average
        data['translation_time']['average_response_duration'] = updated_average_response_duration
        data['translation_time']['total_count_of_responses'] += 1  # Increment the count of responses
        data['translation_time']['total_responses_duration'] += new_response_time  # Update the total duration

    # Write the updated data back to the JSON file
    with open(Path(__file__).parent / '../shared/statistics.json', 'w') as file:
        json.dump(data, file, indent=4)

def calculate_translation_eta(
    subtitle_data: SubtitleData,
    translate_from: str = 'Chinese Simplified',
    translate_to: str = 'Chinese Traditional',
    model_limit: float = 2048,
    model_throttle: float = 0.5,
    request_timeout: int = 15
) -> int:
    """Estimates the time required to translate all prompts based on subtitle data and model parameters.

    This function calculates the estimated time in seconds needed to translate subtitles from one language to another.
    It takes into account the average response duration from previous translations, the number of prompts to be processed,
    and the model's token limit.

    Args:
        subtitle_data (SubtitleData): Dictionary containing subtitle data, including the text to be translated.
        translate_from (str, optional): The source language name. Defaults to 'Chinese Simplified'.
        translate_to (str, optional): The target language name. Defaults to 'Chinese Traditional'.
        model_limit (float, optional): The token limit of the model. Defaults to 2048.
        model_throttle (float, optional): A throttle factor to adjust the model limit. Defaults to 0.5.
        request_timeout (int, optional): Timeout per request in seconds. Defaults to 15.

    Returns:
        int: Estimated time in seconds for the complete translation of all prompts.
    """
    with open(Path(__file__).parent / '../shared/statistics.json', 'r') as file:
        data: TranslationData = json.load(file)
        average_response_duration: float = data['translation_time']['average_response_duration']

    cleaned_subtitles = remove_all_markup(subtitle_data)
    prompt_task = construct_prompt_task(translate_from, translate_to)
    injected_subtitles = inject_prompt_symbols(cleaned_subtitles)
    prompts_count = calculate_prompts_count(prompt_task, injected_subtitles, model_limit * model_throttle)
    translation_eta = prompts_count * (request_timeout + int(average_response_duration))

    return translation_eta
