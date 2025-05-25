import os
import re
import time
import math
import json
import chardet
import langdetect # type: ignore
from typing import List
from pathlib import Path
from structures import SubtitleMetadata, SubtitleData, StatisticsData
from logger import main_logger

def sanitize_filename(filename_to_sanitize: str) -> str:
    safe_filename = re.sub(r'[^a-zA-Z0-9.-]', '-', filename_to_sanitize)
    return safe_filename

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
    lines: list[str] = []
    for i, subtitle in enumerate(cleaned_subtitles, start=index):
        cleaned = subtitle.replace('\n', ' ')
        lines.append(f"%{i}@ {cleaned}")
    injected_subtitles = '\n'.join(lines)

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
    # Calculate count for injected subtitles without prompt task
    injected_subtitles_tokens = estimate_token_count(injected_subtitles)
    injected_subtitles_count = math.ceil(injected_subtitles_tokens / model_limit)

    # Add prompt task to each subtitle chunk and calculate final count of prompts
    prompt_tokens = estimate_token_count(prompt_task * injected_subtitles_count + injected_subtitles)
    prompts_count = math.ceil(prompt_tokens / model_limit)

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
    current_timestamp = time.time()

    # Load the existing data from the JSON file
    statistics_file = Path(__file__).parent / '../shared/statistics.json'
    with open(statistics_file, 'r') as file:
        data = json.load(file)

    total_count_of_responses = data['duck_statistics']['total_count_of_responses']
    average_response_duration = data['duck_statistics']['average_response_duration']

    # Calculate the updated average response duration
    updated_average_response_duration = (average_response_duration * total_count_of_responses + new_response_time) / (total_count_of_responses + 1)

    # Update the data structure with the new average
    data['last_update'] = current_timestamp
    data['duck_statistics']['average_response_duration'] = updated_average_response_duration
    data['duck_statistics']['total_count_of_responses'] += 1  # Increment the count of responses
    data['duck_statistics']['total_responses_duration'] += new_response_time  # Update the total duration

    # Write the updated data back to the JSON file
    with open(statistics_file, 'w') as file:
        json.dump(data, file, indent=4)

def calculate_duck_translation_eta(
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
        data: StatisticsData = json.load(file)
        average_response_duration: float = data['duck_statistics']['average_response_duration']

    cleaned_subtitles = remove_all_markup(subtitle_data)
    prompt_task = construct_prompt_task(translate_from, translate_to)
    injected_subtitles = inject_prompt_symbols(cleaned_subtitles)
    prompts_count = calculate_prompts_count(prompt_task, injected_subtitles, model_limit * model_throttle)
    translation_eta = prompts_count * (request_timeout + int(average_response_duration))

    return translation_eta

def calculate_engine_translation_eta(
    subtitle_data: SubtitleData,
    engine_limit: float = 5000,
    request_timeout: int = 2
) -> int:
    """Estimates the time required to translate all subtitles based on subtitle data and engine parameters.

    Args:
        subtitle_data (SubtitleData): Dictionary containing subtitle data, including the text to be translated.
        engine_limit (float, optional): The character limit of the engine. Defaults to 5000 (Google).
        request_timeout (int, optional): Timeout per request in seconds. Defaults to 2.

    Returns:
        int: Estimated time in seconds for the complete translation of all subtitles.
    """
    cleaned_subtitles = remove_all_markup(subtitle_data)
    subtitles_length = len('\n\n'.join(cleaned_subtitles))
    chunk_count =  subtitles_length / engine_limit
    translation_eta = math.ceil(chunk_count * request_timeout)

    return translation_eta

def process_newlines(subtitles: List[str]) -> List[str]:
    """
    Processes subtitle strings to preserve line breaks in dialogues and
    replace them with spaces otherwise.

    A line is considered dialogue if it starts (optionally after whitespace)
    with one of the dash characters: '-', '–', or '—'.

    Args:
        subtitles (List[str]): List of subtitle strings.

    Returns:
        List[str]: Processed list of subtitle strings.
    """
    # Match line starting with optional whitespace + dash character
    dialogue_pattern = re.compile(r"^\s*[-–—]")

    result: List[str] = []
    for text in subtitles:
        lines = text.split('\n')

        # Count lines that look like dialogue (start with dash after optional space)
        dialogue_count = sum(bool(dialogue_pattern.match(line)) for line in lines)

        if dialogue_count >= 2:
            # Likely a conversation — preserve newlines
            result.append('\n'.join(lines))
        else:
            # Likely a single sentence broken for readability — join with space
            result.append(' '.join(lines))

    return result

def check_statistics() -> None:
    """Checks if statistics file exists and creates it if needed."""
    current_timestamp = time.time()

    # Load the existing data from the JSON file
    statistics_file = Path(__file__).parent / '../shared/statistics.json'
    default_statistics = {
        "last_update": current_timestamp,
        "files_processed": {
            "shift": 0,
            "align": 0,
            "clean": 0,
            "translate": 0,
            "upload": 0,
            "download": 0,
            "total": 0
        },
        # Duck statistics are pre-filled for more prescice measurements
        "duck_statistics": {
            "total_count_of_responses": 1,
            "total_responses_duration": 1669.9005346091487,
            "average_response_duration": 10.154964839442117
        }
    }

    # Check if the file exists
    if not os.path.exists(statistics_file):
        # If it does not exist, create the file and write the default content
        with open(statistics_file, 'w') as file:
            json.dump(default_statistics, file, indent=4)
        main_logger.info(f"{statistics_file} created with default content.")
        return  # Exit the function after creating the file

def update_statitics(command: str = 'init') -> None:
    """Updates the statistics based on procesed commands.

    Args:
        new_response_time (float): The response time for the latest translation request, in seconds.

    Returns:
        None: This function does not return a value. It modifies the statistics stored in the JSON file.
    """
    current_timestamp = time.time()
    statistics_file = Path(__file__).parent / '../shared/statistics.json'

    # Check if the file exists
    if command == 'init':
        check_statistics()
    else:
        # If the file exists, read the data
        with open(statistics_file, 'r') as file:
            data = json.load(file)

        # Update data based on command
        data['last_update'] = current_timestamp
        if command =='shift':
            data['files_processed']['shift'] += 1
            data['files_processed']['total'] += 1
        if command =='align':
            data['files_processed']['align'] += 1
            data['files_processed']['total'] += 1
        if command =='clean':
            data['files_processed']['clean'] += 1
            data['files_processed']['total'] += 1
        if command =='translate':
            data['files_processed']['translate'] += 1
            data['files_processed']['total'] += 1
        if command =='upload':
            data['files_processed']['upload'] += 1
        if command =='download':
            data['files_processed']['download'] += 1

        # Write the updated data back to the JSON file
        with open(statistics_file, 'w') as file:
            json.dump(data, file, indent=4)
