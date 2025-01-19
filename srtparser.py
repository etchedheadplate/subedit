import chardet

class SubSync():
    def __init__(self, text_source: str, timing_source: str):
        '''
        Contructor for dictionaries with data of source subtitles files

        :param text_source: file with text that should be in corrected subtitles
        :param timing_source: file with timing that should be in corrected subtitles
        '''

        self.text_data = self.extract_metadata(text_source)
        self.timing_data = self.extract_metadata(timing_source)

    def extract_metadata(self, source_file: str) -> dict:
        '''
        Extracts metadata from subtitle files. Metadata is needed for later parsing.

        :param source_file: text or timing subtitles file
        '''

        with open(source_file, 'rb') as file:
            raw_data = file.read()
            raw_metadata = chardet.detect(raw_data)
            metadata = {
                'filename': source_file,
                'encoding': raw_metadata['encoding'],
                'confidence': raw_metadata['confidence'],
                'language': raw_metadata['language']
            }

        return metadata

    def parse_subtitles(self, source_data: dict) -> None:
        '''
        Parses subtitles and adds them to source dictionary by this template:

            subtitles: {
                index: {
                    start: time
                    end: time
                    text: subtitle
                }
            }

        :param source_data: dictionary with data of source file
        '''

        with open(source_data['filename'], 'r', encoding=source_data['encoding']) as file:
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

            source_data['subtitles'] = parsed_subtitles

    def show(self, data: dict, indent=0) -> None:
        for key, value in data.items():
            if isinstance(value, dict):
                print('  ' * indent + str(key) + ':')
                self.show(value, indent + 1)
            else:
                print('  ' * indent + f"{key}: {value}")

    def sync(self):
        self.parse_subtitles(self.text_data)
        self.parse_subtitles(self.timing_data)

        self.show(self.text_data)
        self.show(self.timing_data)




if __name__ == '__main__':
    input = SubSync('Breathless.srt', 'Childle.srt')
    output = input.sync()
