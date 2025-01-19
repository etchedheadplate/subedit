import chardet

class SubtitlesFile():
    def __init__(self, file):
        self.filename = str(file)

    def detect_encoding(self):
        with open(self.filename, 'rb') as file:
            raw_data = file.read()
            result = chardet.detect(raw_data)
            self.encoding = result['encoding']
            self.confidence = result['confidence']
            self.language = result['language']

    def parse(self):
        self.detect_encoding()
        with open(self.filename, 'r', encoding=self.encoding) as file:
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

            return parsed_subtitles


if __name__ == '__main__':
    files = ['Breathless.srt', 'Childle.srt']
    for file in files:
        subtitles_file = SubtitlesFile(file)
        print(file, subtitles_file.parse().keys(), sep='\n')
