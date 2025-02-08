import chardet

class SubParse():
    def __init__(self, file_list: list):
        '''
        Constructor for dictionary with subtitles and files metadata.

        :param source: List with 1 or 2 subtitle file names.
        '''

        # Empty dictionary for storing subtitles and files metadata
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

        # Show all collected data
        self.show(self.subtitles_data)

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

    def show(self, data: dict, indent=0) -> None:
        '''
        Prints subtitles data to terminal.

        :param data: Dictionary with subtitles data.
        :param indent: Indent for subdictionaries.
        '''

        for key, value in data.items():
            if isinstance(value, dict):
                print('  ' * indent + str(key) + ':')
                self.show(value, indent + 1)
            else:
                print('  ' * indent + f"{key}: {value}")




if __name__ == '__main__':
    single_source = ['generated_original.srt',]
    multiple_sources = ['generated_original.srt', 'generated_example.srt']
    SubParse(single_source)
    # SubParse(multiple_sources)
