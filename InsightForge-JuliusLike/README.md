# InsightForge — AI Data Analyst
A full-stack Julius-style data-analysis workflow: authentication, private datasets, upload, automated EDA, preprocessing, interactive charts, natural-language chat, and optional Groq/OpenAI/Ollama integration.

Inspired by the workflow of modern AI data-analysis products, not copied source code or branding.

## Run
### Backend
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
uvicorn app.main:app --reload --port 8000

### Frontend
cd frontend
npm install
npm run dev

Open http://localhost:5173

The local analysis engine works without an AI key. For open-ended natural-language reasoning, set AI_PROVIDER and a provider key in backend/.env.
