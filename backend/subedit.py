import os
import re
import math
import time
import json
import chardet
import langdetect # type: ignore
from pathlib import Path
from duckai import DuckAI # type: ignore
from datetime import datetime, timedelta
from typing import TypedDict, List, Dict

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

SubtitlesDataDict = Dict[str, SubtitleData]

# Structure of external JSON data
class ModelInfo(TypedDict):
    name: str
    tokens: float

class TranslateData(TypedDict):
    codes: Dict[str, str]
    models: Dict[str, ModelInfo]

# Main class
class SubEdit:
    def __init__(self, file_list: List[str]) -> None:
        """Constructor for dictionary with subtitles and files metadata

        Args:
            file_list (List[str]): List with paths to one or two subtitle files.
        """
        self._internal_call: bool = False

        self.subtitles_data: SubtitlesDataDict = {}

        self.source_file: str = file_list[0]
        self.example_file: str | None = file_list[1] if len(file_list) == 2 else None
        self.processed_file:str = ''

        if len(file_list) <= 2:
            for file in file_list:
                self._parse_subtitles(file)
        else:
            raise ValueError(f'File list must include 1 or 2 text strings ({len(file_list)} provided).')

    def _parse_subtitles(self, file_path: str) -> None:
        """Parses subtitles from file into a dictionary.

        Args:
            file_path (str): String with relative path to file.
        """
        def detect_encoding(file_path: str) -> None:
            """Detects encoding of subtitles file and saves it to 'metadata' subditctionary.

            Args:
                file_path (str): String with relative path to file.
            """
            with open(file_path, 'rb') as file:
                raw_data = file.read()
                raw_metadata = chardet.detect(raw_data)

                extracted_metadata: SubtitleMetadata = {
                    'encoding': str(raw_metadata['encoding']),
                    'confidence': float(raw_metadata['confidence']),
                    'language': ''
                }

                self.subtitles_data[file_path] = {
                    'metadata': extracted_metadata,
                    'subtitles': {}
                }

        detect_encoding(file_path)
        file_metadata = self.subtitles_data[file_path]['metadata']

        with open(file_path, 'r', encoding=file_metadata['encoding']) as file:
            raw_subtitles = file.readlines()
            parsed_subtitles: Dict[int, SubtitleEntry] = {}

            current_line_index = 0
            while current_line_index < len(raw_subtitles):
                index_line = raw_subtitles[current_line_index].strip()

                if not index_line.isdigit():
                    current_line_index += 1
                    continue

                subtitle_index = int(index_line)
                time_code_line = raw_subtitles[current_line_index + 1].strip()
                text_lines: list[str] = []
                current_line_index += 2 # Skip subtitle index and time codes and go to the text

                while current_line_index < len(raw_subtitles) and raw_subtitles[current_line_index].strip() != '':
                    text_lines.append(raw_subtitles[current_line_index].strip())
                    current_line_index += 1

                current_line_index += 1 # Skip empty line at the end and go to next subtitle

                parsed_subtitles[subtitle_index] = {
                    'start': time_code_line.split(' --> ')[0],
                    'end': time_code_line.split(' --> ')[1],
                    'text': '\n'.join(text_lines)
                }

            self.subtitles_data[file_path]['subtitles'] = parsed_subtitles

            def detect_language(file_path: str) -> None:
                    """Detects language of subtitles file and saves it to 'metadata' subditctionary.

                    Args:
                        file_path (str): String with relative path to file.
                    """
                    self._internal_call = True
                    result = self.clean_markup(file_path)
                    if result is None:
                        raise ValueError("clean_markup returned None unexpectedly")
                    unformatted_text: list[str] = result
                    self._internal_call = False

                    original_text: str = ' '.join(unformatted_text)

                    subtitles_language: str = langdetect.detect(original_text) # type: ignore
                    self.subtitles_data[file_path]['metadata'].update({
                        'language': subtitles_language
                    })

            detect_language(file_path)


    def _create_file(self, file_path: str) -> None:
        """Writes subtitles into .srt file in UTF-8 encoding.

        Args:
            file_path (str): String with relative path to file.
        """
        subtitles_data = self.subtitles_data[file_path]['subtitles']
        subtitle_indices = sorted(subtitles_data.keys())  # Sort indices numerically

        with open(file_path, 'w', encoding='utf-8') as file:
            for index in subtitle_indices:
                file.write(
                    f'{index}\n'
                    f'{subtitles_data[index]["start"]} --> {subtitles_data[index]["end"]}\n'
                    f'{subtitles_data[index]["text"]}\n\n' # Add empty line at the end
                )

    def pass_info(self, data: SubtitlesDataDict | SubtitleMetadata | SubtitleEntry | None = None, show: bool = False, indent: int = 0) -> None:
        """Prints subtitles data to terminal.

        Args:
            data (Dict): Dictionary with subtitles data.
            show (bool): Print data in stdout.
            indent (int): Indent for subdictionaries.
        """
        if data is None:
            data = self.subtitles_data

        if show:
            for key, value in data.items():
                if isinstance(value, dict):
                    print('  ' * indent + str(key) + ':')
                    self.pass_info(value, indent + 1) # type: ignore
                else:
                    print('  ' * indent + f'{key}: {value}')

    def shift_timing(self, delay: int, items: list[int] | None = None) -> None:
        """Shifts subtitles by user-defined milliseconds.

        Args:
            delay (int): Milliseconds to delay.
            items (list[int]): List of subtitles numbers. Defaults to None (all subtitles are shifted).
        """
        parsed_subtitles = self.subtitles_data[self.source_file]['subtitles']

        source_name, source_ext = os.path.splitext(self.source_file)
        if items is None:
            self.shifted_file = f'{source_name}-shifted-by-{delay}-ms{source_ext}'
            subtitle_indices = sorted(parsed_subtitles.keys())
        elif type(items) is list and len(items) == 2:
            self.shifted_file = f'{source_name}-shifted-by-{delay}-ms-from-{items[0]}-to-{items[1]}{source_ext}'
            subtitle_indices = sorted(parsed_subtitles.keys())[items[0]-1:items[1]-1] # convert subtitle items to range of list indices
        else:
            raise ValueError(f'items parameter must be a list with 2 items ({len(items) if type(items) is list else type(items)} provided).')

        self.subtitles_data[self.shifted_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': {}
        }

        time_format = '%H:%M:%S,%f'

        # Original subtitles copied and updated
        shifted_subtitles = self.subtitles_data[self.shifted_file]['subtitles']
        shifted_subtitles.update(parsed_subtitles)
        for index in subtitle_indices:
            subtitle = parsed_subtitles[index]

            original_start = datetime.strptime(subtitle['start'], time_format)
            original_end = datetime.strptime(subtitle['end'], time_format)

            delay_start = original_start + timedelta(milliseconds=delay)
            delay_end = original_end + timedelta(milliseconds=delay)

            new_start = delay_start.strftime(time_format)[:-3]
            new_end = delay_end.strftime(time_format)[:-3]

            shifted_subtitles[index].update({
                'start': new_start,
                'end': new_end,
                'text': subtitle['text']
            })

        self._create_file(self.shifted_file)
        self.processed_file = os.path.basename(self.shifted_file)

    def align_timing(self, source_slice: list[int] | None = None, example_slice: list[int] | None = None) -> None:
        """Aligns source subtitles timing to match example subtitles timing for the specified slices.

        Args:
            source_slice (list[int] or None): Indices of first and last subtitle to align. Defaults to None (all source subtitles are aligned)
            example_slice (list[int] or None): Indices of first and last subtitle to align by. Defaults to None (aligned by all example subtitles)
        """
        if self.example_file is None:
            raise ValueError('Example file is required for alignment')

        source_name, source_ext = os.path.splitext(self.source_file)
        filename_modifier = ''
        filename_modifier = filename_modifier + f'-src-{source_slice[0]}-{source_slice[1]}' if source_slice else filename_modifier
        filename_modifier = filename_modifier + f'-by-exm-{example_slice[0]}-{example_slice[1]}' if example_slice else filename_modifier
        self.aligned_file = f'{source_name}-aligned{filename_modifier}{source_ext}'

        self.subtitles_data[self.aligned_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': {}
        }

        parsed_source = self.subtitles_data[self.source_file]['subtitles']
        parsed_example = self.subtitles_data[self.example_file]['subtitles']
        aligned_subtitles = self.subtitles_data[self.aligned_file]['subtitles']

        # Get sorted indices for default slices
        if source_slice is None or len(source_slice) == 0:
            source_indices = sorted(parsed_source.keys())
            source_slice = [source_indices[0], source_indices[-1]]
        if example_slice is None or len(example_slice) == 0:
            example_indices = sorted(parsed_example.keys())
            example_slice = [example_indices[0], example_indices[-1]]

        if len(source_slice) != 2 or len(example_slice) != 2:
            raise ValueError(f'Slices must include exactly 2 items (provided {len(source_slice)} source and {len(example_slice)} example items).')

        source_slice_range = range(source_slice[0], source_slice[1] + 1)
        example_slice_range = range(example_slice[0], example_slice[1] + 1)
        exact_match = (len(source_slice_range) == len(example_slice_range) and
                      source_slice[0] == example_slice[0] and
                      source_slice[1] == example_slice[1])

        subtitle_indices = sorted(parsed_source.keys())
        time_format = '%H:%M:%S,%f'

        for index in subtitle_indices:
            subtitle = parsed_source[index]
            aligned_subtitles[index] = subtitle

            if source_slice[0] <= index <= source_slice[1]:
                if exact_match:
                    aligned_subtitles[index].update({
                        'start': parsed_example[index]['start'],
                        'end': parsed_example[index]['end']
                    })
                else:
                    # Get source and example timing points
                    source_start_time = datetime.strptime(parsed_source[source_slice[0]]['start'], time_format)
                    source_end_time = datetime.strptime(parsed_source[source_slice[1]]['end'], time_format)
                    example_start_time = datetime.strptime(parsed_example[example_slice[0]]['start'], time_format)
                    example_end_time = datetime.strptime(parsed_example[example_slice[1]]['end'], time_format)

                    # Calculate total durations
                    source_duration = (source_end_time - source_start_time).total_seconds()
                    example_duration = (example_end_time - example_start_time).total_seconds()

                    if source_duration == 0:
                        raise ValueError('Source duration is zero, cannot calculate scaling factor.')

                    # Get original timing
                    original_start = datetime.strptime(subtitle['start'], time_format)
                    original_end = datetime.strptime(subtitle['end'], time_format)

                    # Calculate position within source duration (scaling factor 0 to 1)
                    start_pos = (original_start - source_start_time).total_seconds() / source_duration
                    end_pos = (original_end - source_start_time).total_seconds() / source_duration

                    # Apply position to example duration
                    new_start_seconds = example_start_time.timestamp() + (start_pos * example_duration)
                    new_end_seconds = example_start_time.timestamp() + (end_pos * example_duration)

                    # Convert to datetime and format
                    new_start = datetime.fromtimestamp(new_start_seconds).strftime(time_format)[:-3]
                    new_end = datetime.fromtimestamp(new_end_seconds).strftime(time_format)[:-3]

                    aligned_subtitles[index].update({
                        'start': new_start,
                        'end': new_end,
                    })
            else:
                aligned_subtitles[index].update({
                    'start': subtitle['start'],
                    'end': subtitle['end']
                })

        self._create_file(self.aligned_file)
        self.processed_file = os.path.basename(self.aligned_file)

    def clean_markup(
        self,
        file_path: str | None = None,
        bold: bool = False,
        italic: bool = False,
        underline: bool = False,
        strikethrough: bool = False,
        color: bool = False,
        font: bool = False
        ) -> list[str] | None:
        """Removes user-defined markup tags from subtitles.

        Args:
            file_path (str or None): String with file name. Defaults to None.
            bold (bool): Removes <b></b> tags. Defaults to False.
            italic (bool): Removes <i></i> tags. Defaults to False.
            underline (bool): Removes <u></u> tags. Defaults to False.
            strikethrough (bool): Removes <s></s> tags. Defaults to False.
            color (bool): Removes <font color="color name or #hex"></font> tags. Defaults to False.
            font (bool): Removes <font face="font-family-name"></font> tags. Defaults to False.

        Returns:
            unformatted_text (list[str]): Unformatted subtitles of whole file if called internally.
        """
        unformatted_text: list[str] = []
        cleaned_subtitles: dict[int, SubtitleEntry] = {}

        if self._internal_call and file_path:
            parsed_subtitles = self.subtitles_data[file_path]['subtitles']
        else:
            source_name, source_ext = os.path.splitext(self.source_file)
            self.cleaned_file = f'{source_name}-cleaned{source_ext}'

            self.subtitles_data[self.cleaned_file] = {
                'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
                'subtitles': {}
            }

            parsed_subtitles = self.subtitles_data[self.source_file]['subtitles']
            cleaned_subtitles = self.subtitles_data[self.cleaned_file]['subtitles']

        subtitle_indices = sorted(parsed_subtitles.keys())

        for index in subtitle_indices:
            subtitle = parsed_subtitles[index]
            new_text = subtitle['text']

            if bold or italic or underline or strikethrough or color or font:
                if bold:
                    new_text = re.sub(r'<b>|</b>', '', new_text)
                if italic:
                    new_text = re.sub(r'<i>|</i>', '', new_text)
                if underline:
                    new_text = re.sub(r'<u>|</u>', '', new_text)
                if strikethrough:
                    new_text = re.sub(r'<s>|</s>', '', new_text)
                if color and '<font color=' in new_text:
                    new_text = re.sub(r'<font\s+color=["\'].*?["\'].*?>|</font>', '', new_text)
                if font and '<font face=' in new_text:
                    new_text = re.sub(r'<font\s+face=["\'].*?["\'].*?>|</font>', '', new_text)
            else: # Remove all markup
                new_text = re.sub(r'<.*?>', '', new_text)

            if self._internal_call and file_path:
                unformatted_text.append(new_text)
            else:
                cleaned_subtitles[index] = {
                    'start': subtitle['start'],
                    'end': subtitle['end'],
                    'text': new_text
                }

        if self._internal_call and file_path:
            return unformatted_text
        else:
            self._create_file(self.cleaned_file)
            self.processed_file = os.path.basename(self.cleaned_file)

    def translate_text(
        self,
        target_language: str,
        file_path: str | None = None,
        model_name: str = 'GPT-4o',
        model_throttle: float = 0.5,
        request_timeout: int = 15,
        response_timeout: int = 45
        ) -> None:
        """Translates subtitles using LLM provided by DuckDuckGo.

        Args:
            target_language (str): Target language.
            file_path (str): String with relative path to file.
            model_name (str): Translator LLM. Defaults to GPT-4o-mini by OpenAI.
            model_throttle (float): Coefficient by which the model's token window is reduced.
                Slows translation time, increases accuracy. Must be between 0 and 1.
                Defaults to 0.5.
            request_timeout (int): Seconds between sending requests to Duck.ai. Defaults to 15.
            response_timeout (int): Seconds after which Duck.ai response considered lost. Defaults to 45.
        """
        if file_path is None:
            file_path = self.source_file

        source_name, source_ext = os.path.splitext(self.source_file)
        self.translated_file = f'{source_name}-translated-to-{target_language}-with-{model_name}{source_ext}'

        self.subtitles_data[self.translated_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': self.subtitles_data[self.source_file]['subtitles'].copy()
        }

        original_language = self.subtitles_data[file_path]['metadata']['language']

        with open(Path(__file__).parent / '../shared/translate.json', 'r') as file:
            data: TranslateData = json.load(file)
            translate_from: str = data['codes'][original_language]
            translate_to: str = data['codes'][target_language]
            translator_model: str = data['models'][model_name]['name']
            tokens_limit: float = data['models'][model_name]['tokens'] * model_throttle

        self._internal_call = True
        result = self.clean_markup(file_path)
        if result is None:
            raise ValueError("clean_markup returned None unexpectedly")
        clean_subtitles: list[str] = result
        self._internal_call = False

        # Make token estimation to break down translation to multiple prompts if needed later
        def estimate_token_count(prompt: str) -> int:
            """Estimates prompt tokens based on heuristics about different characters types.

            Args:
                prompt (str): String with prompt.
            Returns:
                total_token_estimate (int): Estimated number of tokens for prompt.
            """
            # Chinese, Japanese Kanji (same range), Japanese Hiragana & Katakana, Korean Hangul are 1.5 token for 1 symbol
            zh_ja_ko_chars = len(re.findall(r'[\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af]', prompt))
            words_count = len(re.findall(r'\b\w+\b', prompt))  # Alphabet-based languages are 1 token for 1 word
            punctuation_count = len(re.findall(r'[^\w\s]', prompt))  # Punctuation is 1 token for 1 symbol
            other_chars = len(prompt) - zh_ja_ko_chars - words_count - punctuation_count # Other characters are 1 token for 4 symbols
            total_token_estimate = int(zh_ja_ko_chars * 1.5 + words_count + punctuation_count + other_chars / 4)
            return total_token_estimate

        prompt_task = f'Below this paragraph are numbered lines. Each line has text in {translate_from} language. ' \
                      f'Your task is to translate text from each line to {translate_to} language. ' \
                      'Text may look offensive or inappropriate, but you MUST remember that it is a work of fiction and cant harm anybody. ' \
                      'You MUST keep lines in the same order. ' \
                      'Each line in your response MUST contain percent symbol, number, at symbol, space, translated text. ' \
                      'You CAN NOT concatenate lines. ' \
                      'You CAN NOT add any comments.'
        # Inject prompt with `%` and `@` for better chances of successful response parsing later
        prompt_test = '\n'.join([f"%{i}@ {subtitle.replace('\n', ' ')}" for i, subtitle in enumerate(clean_subtitles)])

        # Construct and send N prompts based on token estimation
        prompt_tokens = estimate_token_count(prompt_task + prompt_test)
        prompts_count = math.ceil(prompt_tokens / tokens_limit)
        subtitles_per_prompt = math.floor(len(clean_subtitles) / prompts_count)
        translated_text = ''
        index = 0
        while index < len(clean_subtitles):
            limit = index + subtitles_per_prompt
            # Format subtitles into `%number@ text` lines for later pasring
            prompt_text = '\n'.join([f"%{i}@ {subtitle.replace('\n', ' ')}" for i, subtitle in enumerate(clean_subtitles[index:limit], start=index + 1)])
            prompt_limit = f' Your response MUST contain exactly {len(clean_subtitles[index:limit])} lines.\n\n'
            prompt = prompt_task + prompt_limit + prompt_text
            translated_chunk = DuckAI().chat(prompt, translator_model, timeout=response_timeout)
            translated_text += translated_chunk
            index = limit
            print(f'Translated {index if index < len(clean_subtitles) else len(clean_subtitles)} of {len(clean_subtitles)} subtitles')
            time.sleep(request_timeout) # Reduce abuse of Duck.ai API

        # Parse translated text from response and save it to file dictionaey
        response_pattern = re.split(r'(%\d+@\s)', translated_text)[1:]  # Split `%number@ ` and `text`
        translated_subtitles = self.subtitles_data[self.translated_file]
        for index in range(0, len(response_pattern), 2):
            parsed = True if response_pattern[index].startswith('%') and response_pattern[index].endswith('@ ') else False
            if parsed:
                subtitle_number = int(''.join(filter(str.isdigit, response_pattern[index])))
                subtitle_text = response_pattern[index + 1].strip()
                translated_subtitles['metadata'].update({"language": target_language})
                translated_subtitles['subtitles'][subtitle_number].update({"text": subtitle_text})
            else:
                raise ValueError(f'Bad response format: {response_pattern[index]}.')

        self._create_file(self.translated_file)
        self.processed_file = os.path.basename(self.translated_file)
