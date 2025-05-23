# SubEdit Frontend

This is the frontend component of the SubEdit web application. It is built with [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vitejs.dev/).

---

## Installation

Install component dependencies and plugins:
```bash
cd subedit/frontend
npm install
```

## Environment Configuration

Create a .env file in `subedit/frontend` directory with the following variables:

```
# Set to '' to run in production
VITE_DEBUG=true

# Defaults to http://localhost:8000 when VITE_DEBUG=true
VITE_API_BASE_URL=https://your.backend.domain
```

## Assets Management

Please note that this repository does not contain the folowing images:

```bash
frontend/src/assets/engine_logo.png
frontend/src/assets/ddg_logo.png
frontend/src/assets/github-mark.svg
frontend/src/assets/loading.gif
frontend/src/assets/switch_language.svg
```

You should replace them with your own images or remove them from code manually.

## Backend Integration

Ensure your FastAPI backend is running and CORS is properly configured to accept requests from your frontend origin (e.g., http://localhost:5173 or your deployed domain).

# Usage

To start dev server with hot reload:

```bash
npm run dev
```

To build production-ready assets:

```bash
npm run build
```

To preview production build locally:

```bash
npm run preview
```

## Contributions

Feel free to submit issues or pull requests.

## License

MIT License
