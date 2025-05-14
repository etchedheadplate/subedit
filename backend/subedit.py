import os
import re
import time
import json
import props
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import cast, List, Dict, Union, Optional
from structures import SubtitleMetadata, SubtitleEntry, SubtitlesDataDict, TranslatorProtocol, DuckData

load_dotenv()
DEBUG = bool(int(os.getenv('DEBUG', '1')))

class SubEdit:
    def __init__(self, file_list: List[str]) -> None:
        """Constructor for dictionary with subtitles and files metadata

        Args:
            file_list (List[str]): List with paths to one or two subtitle files.
        """
        self._internal_call: bool = False
        self.subtitles_data: SubtitlesDataDict = {}
        self.source_file: str = file_list[0]
        self.example_file: Optional[str] = file_list[1] if len(file_list) == 2 else None
        self.processed_file:str = ''

        # Fill self.subtitles_data
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
        # Extract file metadata
        extracted_metadata = props.extract_metadata(file_path)
        self.subtitles_data[file_path] = {
            'metadata': extracted_metadata,
            'subtitles': {},
            'eta': 0
        }

        # Open subtitles file using encoding from metadata
        file_metadata = self.subtitles_data[file_path]['metadata']
        with open(file_path, 'r', encoding=file_metadata['encoding']) as file:
            raw_subtitles = file.readlines()
            parsed_subtitles: Dict[int, SubtitleEntry] = {}

            # Separate individual subtitles by index line
            current_line_index = 0
            while current_line_index < len(raw_subtitles):
                index_line = raw_subtitles[current_line_index].strip()
                if not index_line.isdigit():
                    current_line_index += 1
                    continue

                # Parse index and timing lines for each individual subtitle
                subtitle_index = int(index_line)
                time_code_line = raw_subtitles[current_line_index + 1].strip()

                # Parse text line(s) for each individual subtitle
                text_lines: list[str] = []
                current_line_index += 2 # Skip subtitle index and time codes and go to the text
                while current_line_index < len(raw_subtitles) and raw_subtitles[current_line_index].strip() != '':
                    text_lines.append(raw_subtitles[current_line_index].strip())
                    current_line_index += 1

                # Skip empty line at the end of individual subtitle
                current_line_index += 1

                # Parse timing and text into a dictionary
                parsed_subtitles[subtitle_index] = {
                    'start': time_code_line.split(' --> ')[0],
                    'end': time_code_line.split(' --> ')[1],
                    'text': '\n'.join(text_lines)
                }

            self.subtitles_data[file_path]['subtitles'] = parsed_subtitles

            # Detect language using parsed subtitles text
            subtitles_language = props.detect_language(self.subtitles_data[file_path]) # type: ignore
            self.subtitles_data[file_path]['metadata'].update({'language': subtitles_language})

            # Calculate and save ETA for translation
            translation_eta = props.calculate_translation_eta(self.subtitles_data[file_path])
            self.subtitles_data[file_path]['eta'] = translation_eta

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

    def pass_info(self, data: Optional[Union[SubtitlesDataDict, SubtitleMetadata, SubtitleEntry]] = None, show: bool = False, indent: int = 4) -> None:
        """Prints subtitles data to terminal.

        Args:
            data (Dict): Dictionary with subtitles data.
            show (bool): Print data in stdout.
            indent (int): Indent for subdictionaries.
        """
        if data is None:
            data = self.subtitles_data

        # Show subtitles info in terminal
        if show:
            for key, value in data.items():
                if isinstance(value, dict):
                    print('  ' * indent + str(key) + ':')
                    self.pass_info(value, indent + 1) # type: ignore
                else:
                    print('  ' * indent + f'{key}: {value}')

    def shift_timing(self, delay: int, items: Optional[List[int]] = None) -> None:
        """Shifts subtitles by user-defined milliseconds.

        Args:
            delay (int): Milliseconds to delay.
            items (list[int]): List of subtitles numbers. Defaults to None (all subtitles are shifted).
        """
        parsed_subtitles = self.subtitles_data[self.source_file]['subtitles']

        # Set filename for processed subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        if items is None:
            self.shifted_file = f'{source_name}-shifted-by-{delay}-ms{source_ext}'
            subtitle_indices = sorted(parsed_subtitles.keys())
        elif type(items) is list and len(items) == 2:
            self.shifted_file = f'{source_name}-shifted-by-{delay}-ms-from-{items[0]}-to-{items[1]}{source_ext}'
            subtitle_indices = sorted(parsed_subtitles.keys())[items[0]-1:items[1]-1] # convert subtitle items to range of list indices
        else:
            raise ValueError(f'items parameter must be a list with 2 items ({len(items) if type(items) is list else type(items)} provided).')

        # Create processed file dictionary and copy data from source file
        self.subtitles_data[self.shifted_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': {},
            'eta': 0
        }
        shifted_subtitles = self.subtitles_data[self.shifted_file]['subtitles']
        shifted_subtitles.update(parsed_subtitles)

        # Update processed file dictionary with shifted timing
        time_format = '%H:%M:%S,%f'
        for index in subtitle_indices:
            subtitle = parsed_subtitles[index]

            # Parse original timing
            original_start = datetime.strptime(subtitle['start'], time_format)
            original_end = datetime.strptime(subtitle['end'], time_format)

            # Calculate delay
            delay_start = original_start + timedelta(milliseconds=delay)
            delay_end = original_end + timedelta(milliseconds=delay)

            # Format new timing
            new_start = delay_start.strftime(time_format)[:-3]
            new_end = delay_end.strftime(time_format)[:-3]

            shifted_subtitles[index].update({
                'start': new_start,
                'end': new_end,
                'text': subtitle['text']
            })

        # Create output subtitle file and store path for reference
        self._create_file(self.shifted_file)
        self.processed_file = os.path.basename(self.shifted_file)

    def align_timing(
        self,
        source_slice: Optional[List[int]] = None,
        example_slice: Optional[List[int]] = None,
        trim_start: bool = True,
        trim_end: bool = True
    ) -> None:
        """Aligns source subtitles timing to match example subtitles timing for the specified slices.

        Args:
            source_slice (list[int] or None): Indices of first and last subtitle to align. Defaults to None (all source subtitles are aligned)
            example_slice (list[int] or None): Indices of first and last subtitle to align by. Defaults to None (aligned by all example subtitles)
            trim_start (bool): Flag to indicate if aligned file should include subtitles before source slice. Defaults to True (subtitles removed)
            trim_end (bool): Flag to indicate if aligned file should include subtitles after source slice. Defaults to True (subtitles removed)
        """
        if self.example_file is None:
            raise ValueError('Example file is required for alignment')

        # Set filename for processed subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        filename_modifier = ''
        filename_modifier = filename_modifier + f'-src-{source_slice[0]}-{source_slice[1]}' if source_slice else filename_modifier
        filename_modifier = filename_modifier + f'-by-exm-{example_slice[0]}-{example_slice[1]}' if example_slice else filename_modifier
        self.aligned_file = f'{source_name}-aligned{filename_modifier}{source_ext}'

        # Create processed file dictionary and copy metadata from source file
        self.subtitles_data[self.aligned_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': {},
            'eta': 0
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

        # Set indices ranges
        source_slice_range = range(source_slice[0], source_slice[1] + 1)
        example_slice_range = range(example_slice[0], example_slice[1] + 1)

        # Set flag if source and example ranges are exactly the same
        exact_match = (len(source_slice_range) == len(example_slice_range) and
                      source_slice[0] == example_slice[0] and
                      source_slice[1] == example_slice[1])

        # Get source and example timing points
        time_format = '%H:%M:%S,%f'
        source_start_time = datetime.strptime(parsed_source[source_slice[0]]['start'], time_format)
        source_end_time = datetime.strptime(parsed_source[source_slice[1]]['end'], time_format)
        example_start_time = datetime.strptime(parsed_example[example_slice[0]]['start'], time_format)
        example_end_time = datetime.strptime(parsed_example[example_slice[1]]['end'], time_format)

        # Calculate total durations
        source_duration = (source_end_time - source_start_time).total_seconds()
        example_duration = (example_end_time - example_start_time).total_seconds()

        if source_duration == 0:
            raise ValueError('Source duration is zero, cannot calculate scaling factor.')

        # Update processed file dictionary with aligned timing
        subtitle_indices = sorted(parsed_source.keys())
        for index in subtitle_indices:
            # Copy source subtitles to aligned dictionary
            subtitle = parsed_source[index]
            aligned_subtitles[index] = subtitle

            # Check if source and example timing are identical
            if source_slice[0] <= index <= source_slice[1]:
                if exact_match:
                    aligned_subtitles[index].update({
                        'start': parsed_example[index]['start'],
                        'end': parsed_example[index]['end']
                    })
                else:
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

        # Trim subtitles outside source slice if needed
        start_index = source_slice[0] if trim_start else sorted(parsed_source.keys())[0]
        end_index = source_slice[1] if trim_end else sorted(parsed_source.keys())[-1]
        self.subtitles_data[self.aligned_file]['subtitles'] = {
            new_index + 1: aligned_subtitles[old_index]
            for new_index, old_index in enumerate(range(start_index, end_index + 1))
            if old_index in aligned_subtitles
        }

    # Create output subtitle file and store path for reference
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
        ) -> None:
        """Removes user-defined markup tags from subtitles.

        Args:
            file_path (str or None): String with file name. Defaults to None.
            bold (bool): Removes <b></b> tags. Defaults to False.
            italic (bool): Removes <i></i> tags. Defaults to False.
            underline (bool): Removes <u></u> tags. Defaults to False.
            strikethrough (bool): Removes <s></s> tags. Defaults to False.
            color (bool): Removes <font color="color name or #hex"></font> tags. Defaults to False.
            font (bool): Removes <font face="font-family-name"></font> tags. Defaults to False.
        """
        # Set filename for processed subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        self.cleaned_file = f'{source_name}-cleaned{source_ext}'

        # Create processed file dictionary and copy metadata from source file
        self.subtitles_data[self.cleaned_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': {},
            'eta': 0
        }

        parsed_subtitles = self.subtitles_data[self.source_file]['subtitles']
        cleaned_subtitles = self.subtitles_data[self.cleaned_file]['subtitles']

        # Update processed file dictionary with cleaned text
        subtitle_indices = sorted(parsed_subtitles.keys())
        for index in subtitle_indices:
            subtitle = parsed_subtitles[index]
            new_text = subtitle['text']

            # Check if any markup tag is specified
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

            cleaned_subtitles[index] = {
                'start': subtitle['start'],
                'end': subtitle['end'],
                'text': new_text
            }

        # Create output subtitle file and store path for reference
        self._create_file(self.cleaned_file)
        self.processed_file = os.path.basename(self.cleaned_file)

    def engine_translate(
            self,
            target_language: str,
            original_language: Optional[str] = None,
            file_path: Optional[str] = None,
            engine: str = 'Google',
            clean_markup: bool = True
        ) -> None:
        """
        Translates subtitles using the selected translation engine.

        Args:
            target_language (str): Language to translate to.
            original_language (str): Language to translate from (autodetected if not provided).
            file_path (str): Path to subtitle file to translate (defaults to current source file).
            engine (str): Translation engine to use. Defaults to 'Google'.
            chunk_size (int): Number of subtitles to send in each translation request. Defaults to 100.
        """
        print(engine)

        from deep_translator import ( # type: ignore
            LingueeTranslator,
            MyMemoryTranslator,
            GoogleTranslator,
        )

        # Mapping of engine name to corresponding class
        TRANSLATOR_ENGINES = {
            'Linguee': LingueeTranslator,
            'MyMemory': MyMemoryTranslator,
            'Google': GoogleTranslator,  # Default engine
        }

        TranslateEngine = TRANSLATOR_ENGINES.get(engine, GoogleTranslator)

        # Determine which file to translate and source language to use
        file_path = self.source_file if file_path is None else file_path
        original_language = (
            self.subtitles_data[file_path]['metadata']['language']
            if original_language is None else original_language
        )

        # Generate a filename for the translated subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        self.translated_file = f'{source_name}-translated-to-{target_language}-with-{engine}{source_ext}'

        # Initialize translated file structure by copying source metadata and subtitle content
        self.subtitles_data[self.translated_file] = {
            'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
            'subtitles': self.subtitles_data[self.source_file]['subtitles'].copy(),
            'eta': 0
        }

        # Load formatted language codes from engines.json for selected engine
        with open(Path(__file__).parent / '../shared/engines.json', 'r') as file:
            data = json.load(file)
            langdetect_source = data['codes'][original_language]
            langdetect_target = data['codes'][target_language]
            engine_source = data['engines'][engine]['languages'][langdetect_source]
            engine_target = data['engines'][engine]['languages'][langdetect_target]
            engine_limit = data['engines'][engine]['limit']

        # Make a list of subtitles to translate
        if clean_markup:
            # Remove all markup from subtitles using props helper
            prepared_subtitles = props.remove_all_markup(self.subtitles_data[file_path])
        else:
            # Keep original subtitle formatting
            source = self.subtitles_data[self.source_file]['subtitles']
            prepared_subtitles = [source[i]['text'] for i in sorted(source)]

        # Replace line breaks with spaces to increase translation accuracy
        prepared_subtitles: List[str] = props.process_newlines(prepared_subtitles)

        # Lists with translated subtitles and indices of translation errors
        translated_subtitles: List[str] = []
        not_translated: List[int] = []

        # Translate subtitles
        index_current = 0
        index_total = len(prepared_subtitles)
        while index_current < index_total:
            chunk_lines: List[str] = []
            chunk_length = 0

            # Collect lines into a chunk without exceeding engine_limit
            while index_current < index_total:
                line = prepared_subtitles[index_current]
                line_length = len(line) + 2  # add 2 for the "\n\n" that will be inserted

                if chunk_length + line_length > engine_limit:
                    not_translated.append(index_current)
                    line = 'empty line'

                chunk_lines.append(line)
                chunk_length += line_length
                index_current += 1

            # Join the chunk and translate
            chunk = "\n\n".join(chunk_lines)
            engine_instance = TranslateEngine(source=engine_source, target=engine_target)
            typed_engine = cast(TranslatorProtocol, engine_instance)
            translated_text = typed_engine.translate(chunk)

            # Try splitting back the same number of segments
            translated_list = translated_text.strip().split("\n\n")

            # If translation output doesn't match input size, raise warning or fallback
            if len(translated_list) != len(chunk_lines):
                print(translated_list)
                raise ValueError("Mismatch in translated segment count. Check translation formatting.")

            translated_subtitles.extend(translated_list)

        # Replace too long lines with error message
        if len(not_translated) > 0:
            for error in not_translated:
                translated_subtitles[error] = '<b><font color="#F25C54">TRANSLATION ERROR: Line was too long.</font></b>'

        # Assign each translated text back to corresponding subtitle object
        translated = self.subtitles_data[self.translated_file]['subtitles']
        for key, subtitle in zip(translated.keys(), translated_subtitles):
            translated[key]['text'] = subtitle


        # Create output subtitle file and store path for reference# Create output subtitle file and store path for reference
        self._create_file(self.translated_file)
        self.processed_file = os.path.basename(self.translated_file)

    # Method accesible only on localhost
    if DEBUG:
        async def duck_translate(
            self,
            target_language: str,
            original_language: Optional[str] = None,
            file_path: Optional[str] = None,
            model_name: str = 'gpt-4o-mini',
            model_throttle: float = 0.5,
            request_timeout: int = 10,
            response_timeout: int = 45
            ) -> None:
            """Translates subtitles using LLM provided by DuckDuckGo.

            Args:
                target_language (str): Target language.
                original_language (str): Original file language.
                file_path (str): String with relative path to file.
                model_name (str): Translator LLM. Defaults to GPT-4o-mini by OpenAI.
                model_throttle (float): Coefficient by which the model's token window is reduced.
                    Slows translation time, increases accuracy. Must be between 0 and 1. Defaults to 0.5.
                request_timeout (int): Seconds between sending requests to Duck.ai. Defaults to 10.
                response_timeout (int): Seconds after which Duck.ai response considered lost. Defaults to 45.
            """
            from duckai import DuckAI

            file_path = self.source_file if file_path is None else file_path
            original_language = self.subtitles_data[file_path]['metadata']['language'] if original_language is None else original_language

            # Set filename for processed subtitles
            source_name, source_ext = os.path.splitext(self.source_file)
            self.translated_file = f'{source_name}-translated-to-{target_language}-with-{model_name}{source_ext}'

            # Create processed file dictionary and copy metadata and subtitles from source file
            self.subtitles_data[self.translated_file] = {
                'metadata': self.subtitles_data[self.source_file]['metadata'].copy(),
                'subtitles': self.subtitles_data[self.source_file]['subtitles'].copy(),
                'eta': 0
            }

            # Get formated values from shared Duck.ai JSON
            with open(Path(__file__).parent / '../shared/duck.json', 'r') as file:
                data: DuckData = json.load(file)
                translate_from: str = data['codes'][original_language]
                translate_to: str = data['codes'][target_language]
                translator_model: str = data['models'][model_name]['name']
                tokens_limit: float = data['models'][model_name]['tokens'] * model_throttle

            # Set operational variables
            clean_subtitles = props.remove_all_markup(self.subtitles_data[file_path])
            prompt_task = props.construct_prompt_task(translate_from, translate_to)
            prompt_subtitles = props.inject_prompt_symbols(clean_subtitles)
            prompts_count = props.calculate_prompts_count(prompt_task, prompt_subtitles, tokens_limit)
            subtitles_per_prompt = props.calculate_prompt_length(prompts_count, clean_subtitles)

            # Debug variables
            prompt_number, tanslation_start_timestamp = 1, time.time()
            translation_time: List[float] = []

            # Break down subtitles to multiple prompts and calculate subtitle indices to be translated in current prompt
            translated_text, current_index = '', 0
            while current_index < len(clean_subtitles):
                loop_start_timestamp = time.time()
                indices_limit = current_index + subtitles_per_prompt
                indices_subtitles = clean_subtitles[current_index:indices_limit]
                indices_prompt = f' Your response MUST contain exactly {len(indices_subtitles)} lines.\n\n'

                # Format subtitles into `%number@ text` lines for later pasring and construct current prompt
                prompt_text = props.inject_prompt_symbols(indices_subtitles, current_index + 1)
                current_prompt = prompt_task + indices_prompt + prompt_text

                # Send request to Duck.ai and save response
                request_timestamp = time.time()

                # Temporaly disable Duck.ai translation
                translated_chunk = DuckAI().chat(current_prompt, translator_model, timeout=response_timeout)

                response_timestamp = time.time()
                translation_time.append(response_timestamp - request_timestamp)
                print(f"[DEBUG] [DUCK TRANSLATE] [PROMPT {prompt_number}/{prompts_count}] Response received in {response_timestamp - request_timestamp:.2f}s")
                translated_text += translated_chunk

                # Reset current subtitle index and make delay to reduce abuse of Duck.ai API
                current_index = indices_limit
                print(f"[DEBUG] [DUCK TRANSLATE] [PROMPT {prompt_number}/{prompts_count}] Waiting for {request_timeout}s timeout")
                # Use async sleep instead of blocking sleep
                await asyncio.sleep(request_timeout)
                loop_end_timestamp = time.time()
                print(f"[DEBUG] [DUCK TRANSLATE] [PROMPT {prompt_number}/{prompts_count}] Completed in {loop_end_timestamp - loop_start_timestamp:.2f}s")
                prompt_number += 1

            translation_end_timestamp = time.time()
            print(f"[DEBUG] [DUCK TRANSLATE] Translation completed in {translation_end_timestamp - tanslation_start_timestamp:.2f}s "\
                f"(est: {self.subtitles_data[file_path]['eta']:.2f}, "\
                f"dif: {self.subtitles_data[file_path]['eta'] - (translation_end_timestamp - tanslation_start_timestamp):.2f}) "\
                f"with avg {sum(translation_time)/len(translation_time):.2f}s response ")

            props.update_estimated_response_time(sum(translation_time)/len(translation_time))

            # Parse translated text from response and save it to file dictionary
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

                # Create output subtitle file and store path for reference
            self._create_file(self.translated_file)
            self.processed_file = os.path.basename(self.translated_file)
