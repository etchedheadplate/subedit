import os
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
            raise ValueError("Source must be a single string or a tuple of two strings.")

        # Shift source subtitles
        self.shift_subtitles(delay=2468)

        # Write shifted subtitles into a file:
        self.write_subtitles(self.shifted_file)

        # Show all collected data
        self.show_subtitles(self.subtitles_data)

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

    def show_subtitles(self, data: dict, indent=0) -> None:
        '''
        Prints subtitles data to terminal.

        :param data: Dictionary with subtitles data.
        :param indent: Indent for subdictionaries.
        '''

        for key, value in data.items():
            if isinstance(value, dict):
                print('  ' * indent + str(key) + ':')
                self.show_subtitles(value, indent + 1)
            else:
                print('  ' * indent + f"{key}: {value}")

    def shift_subtitles(self, delay: int, items: list = None) -> None:
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
        time_format = "%H:%M:%S,%f"

        for index in subtitle_items:
            # Pointer to original subtitles
            subtitle = parsed_subtitles[f'{index}']
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

    def write_subtitles(self, file_name: str) -> None:
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
                start = subtitles_data[index]['start']
                end = subtitles_data[index]['end']
                text = subtitles_data[index]['text']
                indent = ''

                file.write(
                    f'{index}\n'
                    f'{start} --> {end}\n'
                    f'{text}\n'
                    f'{indent}\n'
                )








if __name__ == '__main__':
    single_source = ['generated_source.srt',]
    multiple_sources = ['generated_source.srt', 'generated_example.srt']
    SubEdit(single_source)
    # SubEdit(multiple_sources)
