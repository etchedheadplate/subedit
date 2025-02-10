import os
import re
import chardet
from datetime import datetime, timedelta

class SubEdit():
    def __init__(self, file_list: list):
        '''
        Constructor for dictionary with subtitles and files metadata.

        :param source: List with 1 or 2 subtitle file names.
        '''

        # Empty main dictionary for storing subtitles and files metadata
        self.subtitles_data = {}

        # Pointers to passed files
        self.source_file = file_list[0]
        self.example_file = file_list[1] if len(file_list) == 2 else None

        # Check if no more than 2 files passed as input
        if len(file_list) <= 2:
            for file in file_list:
                self.extract_metadata(file)
                self.parse_subtitles(file)

        # If more than 2 files passed raise an error
        else:
            raise ValueError(f'File list must include one or two text strings ({len(file_list)} provided).')

    def extract_metadata(self, file_name: str) -> None:
        '''
        Extracts metadata from file into a dictionary.

        :param file_name: String with file name.
        '''

        with open(file_name, 'rb') as file:
            raw_data = file.read()
            raw_metadata = chardet.detect(raw_data)
            extracted_metadata = {
                'metadata': {
                    'encoding': raw_metadata['encoding'],
                    'confidence': f"{int(raw_metadata['confidence']) * 100}%",
                    'language': raw_metadata['language'] if len(raw_metadata['language']) > 0 else 'unknown'
                }
            }

        self.subtitles_data[file_name] = extracted_metadata

    def parse_subtitles(self, file_name: str) -> None:
        '''
        Parses subtitles from file into a dictionary.

        :param file_name: String with file name.
        '''

        # Pointer to subtitles metadata
        file_metadata = self.subtitles_data[file_name]['metadata']

        with open(file_name, 'r', encoding=file_metadata['encoding']) as file:
            raw_subtitles = file.readlines()
            parsed_subtitles = {}

            # Iterate over the file lines
            current_line_index = 0
            while current_line_index < len(raw_subtitles):
                index_line = raw_subtitles[current_line_index].strip()  # Line with index e.g., '1'

                if not index_line.isdigit():
                    current_line_index += 1
                    continue

                time_code_line = raw_subtitles[current_line_index + 1].strip()  # Line with timestamps e.g., '00:00:51,590 --> 00:00:54,930'
                text_lines = []
                current_line_index += 2

                # Collect all lines of the subtitle text
                while current_line_index < len(raw_subtitles) and raw_subtitles[current_line_index].strip() != '':
                    text_lines.append(raw_subtitles[current_line_index].strip())
                    current_line_index += 1

                parsed_subtitles[index_line] = {
                    'start': time_code_line.split(' --> ')[0],
                    'end': time_code_line.split(' --> ')[1],
                    'text': '\n'.join(text_lines)
                }

            self.subtitles_data[file_name]['subtitles'] = parsed_subtitles

    def show_data(self, data=None, indent=0) -> None:
        '''
        Prints subtitles data to terminal.

        :param data: Dictionary with subtitles data.
        :param indent: Indent for subdictionaries.
        '''
        if data is None:
            data = self.subtitles_data

        for key, value in data.items():
            if isinstance(value, dict):
                print('  ' * indent + str(key) + ':')
                self.show_data(value, indent + 1)
            else:
                print('  ' * indent + f"{key}: {value}")

    def create_file(self, file_name: str) -> None:
        '''
        Writes subtitles into a file.

        :param file_name: String with file name.
        '''

        # Pointers to dictionary with subtitles and their indexes
        subtitles_data = self.subtitles_data[file_name]['subtitles']
        subtitle_items = list(subtitles_data.keys())

        # Write subtitles data formatted to SubRip spec with UTF-8 encoding
        with open(file_name, 'w', encoding='utf-8') as file:
            for index in subtitle_items:
                file.write(
                    f'{index}\n'
                    f'{subtitles_data[index]['start']} --> {subtitles_data[index]['end']}\n'
                    f'{subtitles_data[index]['text']}\n'
                    f'\n'
                )

    def shift_timing(self, delay: int, items: list = None) -> None:
        '''
        Shifts subtitles by user-defined milliseconds.

        :param delay: Milliseconds to delay.
        :param items: List of subtitles numbers to shift. If not provided, all subtitles are shifted.
        '''

        # Empty dictionary for storing shifted subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        self.shifted_file = f'{source_name}_shifted{source_ext}'
        self.subtitles_data[self.shifted_file] = {'metadata': {}, 'subtitles': {}}

        # Pointers to original and shifted subtitles data
        parsed_subtitles = self.subtitles_data[f'{self.source_file}']['subtitles']
        shifted_subtitles = self.subtitles_data[f'{self.shifted_file}']['subtitles']

        # Copy original metadata
        extracted_metadata = self.subtitles_data[f'{self.source_file}']['metadata']
        self.subtitles_data[f'{self.shifted_file}']['metadata'] = extracted_metadata

        # Set which subtitles to shift and define time format
        subtitle_items = items if items else list(parsed_subtitles.keys())
        time_format = '%H:%M:%S,%f'

        for index in subtitle_items:
            # Pointer to original subtitles
            subtitle = parsed_subtitles[f'{index}']

            # Copy original text
            original_text = subtitle['text']

            # Parse original time into a datetime objects
            original_start = datetime.strptime(subtitle['start'], time_format)
            original_end = datetime.strptime(subtitle['end'], time_format)

            # Add delay in milliseconds using timedelta
            delay_start = original_start + timedelta(milliseconds=delay)
            delay_end = original_end + timedelta(milliseconds=delay)

            # Format new time back to string format and remove microseconds
            new_start = delay_start.strftime(time_format)[:-3]
            new_end = delay_end.strftime(time_format)[:-3]

            # Write shifted subtitles data in main dictionary
            shifted_subtitles[f'{index}'] = {}
            shifted_subtitles[f'{index}']['start'] = new_start
            shifted_subtitles[f'{index}']['end'] = new_end
            shifted_subtitles[f'{index}']['text'] = original_text

        # Write shifted subtitles into a file:
        self.create_file(self.shifted_file)

    def align_timing(self, source_slice: list = None, example_slice: list = None) -> None:
        '''
        Shifts subtitles by user-defined milliseconds.

        :param items: List of subtitles numbers to shift. If not provided, all subtitles are shifted.
        '''

        # Empty dictionary for storing shifted subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        self.aligned_file = f'{source_name}_aligned{source_ext}'
        self.subtitles_data[self.aligned_file] = {'metadata': {}, 'subtitles': {}}

        # Pointers to source, example and aligned subtitles data
        parsed_source = self.subtitles_data[f'{self.source_file}']['subtitles']
        parsed_example = self.subtitles_data[f'{self.example_file}']['subtitles']
        aligned_subtitles = self.subtitles_data[f'{self.aligned_file}']['subtitles']

        # Copy original metadata
        extracted_metadata = self.subtitles_data[f'{self.source_file}']['metadata']
        self.subtitles_data[f'{self.aligned_file}']['metadata'] = extracted_metadata

        # If no slices passed make slices equal to whole subtitles index range
        if source_slice is None:
            source_items = list(parsed_source.keys())
            source_slice = [source_items[0], source_items[-1]]
        if example_slice is None:
            example_items = list(parsed_example.keys())
            example_slice = [example_items[0], example_items[-1]]

        # If more than 2 items passed in slices raise an error
        if len(source_slice) != 2 or len(example_slice) != 2:
            raise ValueError(f'Slices must include exactly 2 items (provided {len(source_slice)} source and {len(example_slice)} example items).')

        # Define time format
        time_format = '%H:%M:%S,%f'

        # Calculate effective length of source subtitles
        source_start = datetime.strptime(parsed_source[source_slice[0]]['start'], time_format)
        sourcel_end = datetime.strptime(parsed_source[source_slice[1]]['end'], time_format)
        source_length = sourcel_end - source_start

        # Calculate effective length of example subtitles
        example_start = datetime.strptime(parsed_example[example_slice[0]]['start'], time_format)
        example_end = datetime.strptime(parsed_example[example_slice[1]]['end'], time_format)
        example_length = example_end - example_start

        # Calculate time difference ratio between source and example subtitles
        if source_length.total_seconds() == 0:
            raise ValueError("Source length is zero, cannot calculate percentage difference.")

        difference_ratio = (example_length.total_seconds() - source_length.total_seconds()) / source_length.total_seconds()
        print(difference_ratio)

        # Align source timing by pogression difference of example
        subtitle_items = list(parsed_source.keys())

        for index in subtitle_items:
            # Pointer to original subtitles
            subtitle = parsed_source[f'{index}']

            # Condition for aligning only those subtitles that included in slice
            if int(index) >= int(source_slice[0]) and int(index) <= int(source_slice[1]):
                # Copy original text
                original_text = subtitle['text']

                # Parse original time into a datetime objects
                original_start = datetime.strptime(subtitle['start'], time_format)
                original_end = datetime.strptime(subtitle['end'], time_format)

                # Calculate and add delay in seconds using timedelta
                delay_seconds = difference_ratio * source_length.total_seconds()
                delay_start = original_start + timedelta(seconds=delay_seconds)
                delay_end = original_end + timedelta(seconds=delay_seconds)

                # Format new time back to string format and remove microseconds
                new_start = delay_start.strftime(time_format)[:-3]
                new_end = delay_end.strftime(time_format)[:-3]

                # Write aligned subtitles data in main dictionary
                aligned_subtitles[f'{index}'] = {}
                aligned_subtitles[f'{index}']['start'] = new_start
                aligned_subtitles[f'{index}']['end'] = new_end
                aligned_subtitles[f'{index}']['text'] = original_text

            # Write shifted subtitles into a file:
            self.create_file(self.aligned_file)




    def clean_markup(
        self,
        all: bool = False,
        bold: bool = False,
        italic: bool = False,
        underline: bool = False,
        strikethrough: bool = False,
        color: bool = False,
        font: bool = False
    ) -> None:
        '''
        Removes user-defined markup tags from subtitles.

        :param all: Removes all tags.
        :param bold: Removes <b></b> tags.
        :param italic: Removes <i></i> tags.
        :param underline: Removes <u></u> tags.
        :param strikethrough: Removes <s></s> tags.
        :param color: Removes <font color="color name or #hex"></font> tags.
        :param font: Removes <font face="font-family-name"></font> tags.
        '''

        # Empty dictionary for storing cleaned subtitles
        source_name, source_ext = os.path.splitext(self.source_file)
        self.cleaned_file = f'{source_name}_cleaned{source_ext}'
        self.subtitles_data[self.cleaned_file] = {'metadata': {}, 'subtitles': {}}

        # Pointers to original and cleaned subtitles data
        parsed_subtitles = self.subtitles_data[f'{self.source_file}']['subtitles']
        cleaned_subtitles = self.subtitles_data[f'{self.cleaned_file}']['subtitles']

        # Copy original metadata
        extracted_metadata = self.subtitles_data[f'{self.source_file}']['metadata']
        self.subtitles_data[f'{self.cleaned_file}']['metadata'] = extracted_metadata

        # Set which subtitles to clean
        subtitle_items = list(parsed_subtitles.keys())

        for index in subtitle_items:
            # Pointer to original subtitles
            subtitle = parsed_subtitles[f'{index}']

            # Copy original data
            original_start = subtitle['start']
            original_end = subtitle['end']
            original_text = subtitle['text']

            # Create new text and remove markups
            new_text = original_text

            if bold:
                new_text = re.sub(r'<b>|</b>', '', original_text)

            if italic:
                new_text = re.sub(r'<i>|</i>', '', original_text)

            if underline:
                new_text = re.sub(r'<u>|</u>', '', original_text)

            if strikethrough:
                new_text = re.sub(r'<s>|</s>', '', original_text)

            if color and '<font color=' in original_text:
                new_text = re.sub(r'<font\s+color=["\'].*?["\'].*?>|</font>', '', original_text)

            if font and '<font face=' in original_text:
                new_text = re.sub(r'<font\s+face=["\'].*?["\'].*?>|</font>', '', original_text)

            if all:
                new_text = re.sub(r'<.*?>', '', original_text)

            # Write cleaned subtitles data in main dictionary
            cleaned_subtitles[f'{index}'] = {}
            cleaned_subtitles[f'{index}']['start'] = original_start
            cleaned_subtitles[f'{index}']['end'] = original_end
            cleaned_subtitles[f'{index}']['text'] = new_text

        # Write cleaned subtitles into a file:
        self.create_file(self.cleaned_file)


if __name__ == '__main__':

    # source = ['generated_source.srt',] # Single file
    source = ['generated_source.srt', 'generated_example.srt'] # Multiple files

    test_exemplar = SubEdit(source)

    # Shift source subtitles timing
#    test_exemplar.shift_timing(delay=2468)

    # Clean source subtitles markup
#    test_exemplar.clean_markup(all=True)

    # Align source subtitles timing by example
    test_exemplar.align_timing()

    # Show all collected data
#    test_exemplar.show_data()
