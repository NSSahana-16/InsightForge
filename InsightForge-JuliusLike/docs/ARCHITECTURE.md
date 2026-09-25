# Architecture
React/Vite frontend -> FastAPI -> JWT auth + SQLite metadata -> per-user files -> Pandas/NumPy/scikit-learn analysis -> Plotly visualizations. Optional LLM adapter supports Groq, OpenAI-compatible APIs and Ollama. For production, add PostgreSQL, object storage, queues, sandboxed execution, rate limits, malware scanning, HTTPS and refresh-token rotation.
