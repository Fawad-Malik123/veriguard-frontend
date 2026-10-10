# VeriGuard Frontend

Public Next.js frontend for the VeriGuard fake news / content detector.
The backend (FastAPI, database, AI keys) lives in a separate private repository.

## Run locally
```
npm install
VERIGUARD_API_ORIGIN=http://127.0.0.1:8000 npm run dev
```

## Deploy (Render)
- Build command: `npm install && npm run build`
- Start command: `npx next start frontend --hostname 0.0.0.0 --port $PORT`
- Env var: `VERIGUARD_API_ORIGIN` = your backend URL (e.g. https://veriguard-backend.onrender.com)
