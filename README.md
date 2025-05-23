# SubEdit

SubEdit is a lightweight web app that edits subtitles in the SubRip (`.srt`) format. It lets you:
- Shift the timing of a single file, or synchronize timing across multiple files
- Granularly remove unwanted formatting and markup tags
- Translate subtitle text using web services or AI models (AI translation available on localhost only)

---

## Installation

Clone the repository:

```bash
git clone https://github.com/etchedheadplate/subedit.git
```

Then follow the setup instructions in:
- [Backend directory](./backend/) – Python FastAPI + Uvicorn
- [Frontend directory](./frontend/) – React + TypeScript SPA

## Contributions

Feel free to submit issues or pull requests. Here’s how to get started:
1. Fork this repo
2. Create a new branch (`git checkout -b feature-xyz`)
3. Commit your changes
4. Open a pull request

Want to help translate SubEdit into your language? Edit the shared [translation file](./shared/translation.json).

## License

MIT License
