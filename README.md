

# 🤖 DataMind AI — Autonomous Data Analyst Agent

**Upload any CSV or Excel file → AI understands it, writes Python code, executes it, generates charts, and explains insights in plain English — fully autonomous.**




---

## ✨ What It Does

1. **Upload** any CSV or Excel file
2. **Ask** a plain-English question — *"Which city has the highest average salary?"*
3. The **AI agent** reads the data structure, autonomously writes Pandas/NumPy code, and executes it
4. If the code fails, the agent **self-corrects and retries** automatically (up to 3×)
5. Returns a **Recharts visualisation** + **data table** + **plain-English explanation**

> 🎯 Built to demonstrate autonomous AI agent design, LLM orchestration, tool use, code execution, and full-stack engineering — all in one project.

---

## 🎥 Demo Link Vercel
https://ai-data-analyst-7bi765snb-tanzeela-memons-projects.vercel.app/


---

## 🏗️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERACTION                      │
│   Upload CSV/Excel  +  Ask a question in plain English    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI BACKEND                          │
│  • Reads file → builds data context (columns, dtypes,    │
│    shape, null counts, sample rows, numeric stats)        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               LANGCHAIN-STYLE AGENT LOOP                 │
│                                                          │
│  1. Send data context + question to Llama 3.3 (Groq)    │
│  2. LLM writes Pandas/NumPy code                        │
│  3. Code Interpreter Tool executes the code              │
│  4. If error → self-correct → retry (max 3 attempts)    │
│  5. Return: answer + table + chart spec                  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  REACT FRONTEND                          │
│  • Recharts renders the chart (bar/line/pie/scatter)     │
│  • Data table + plain-English insight + raw code         │
│  • Multi-turn: ask follow-up questions on same dataset   │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **LLM** | Llama 3.3 70B via Groq | Fast, free tier, excellent code generation |
| **Agent** | Custom Python agent loop | Self-correcting retry logic |
| **Code Execution** | Python `exec()` in isolated namespace | Secure sandboxed execution |
| **Data** | Pandas, NumPy | Industry-standard data analysis |
| **Charts** | Recharts (React) | Smooth, responsive, interactive |
| **Backend** | FastAPI | Async, fast, clean REST API |
| **Frontend** | React 19 + Vite | Instant HMR, modern tooling |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Free Groq API key from [console.groq.com](https://console.groq.com)

### 1. Clone
```bash
git clone https://github.com/tanzeela-16/ai-data-analyst.git
cd ai-data-analyst
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Add your Groq API key to .env
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm install recharts
```

### 4. Run (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** and upload one of the demo datasets from `/data`.

---

## 📊 Demo Datasets

Two sample datasets included in `/data`:

| File | Description | Try asking |
|------|-------------|-----------|
| `ecommerce_sales.csv` | 50 orders with product, city, revenue, category | *"Top 5 products by revenue"* |
| `pakistan_job_market.csv` | 40 job listings with title, salary, city, skills | *"Which city has the highest average salary?"* |

---


## 🧠 Key Engineering Decisions

**Self-correcting agent loop** — if generated code raises an error, the full traceback is sent back to the LLM with a prompt to fix it. The agent retries up to 3 times, making it resilient to edge cases like unexpected column names or data type mismatches.

**Isolated code execution** — all generated code runs in a sandboxed Python namespace with only `df`, `pd`, and `np` exposed. This prevents the LLM from accessing the file system or importing dangerous modules.

**Structured output contract** — the LLM is instructed to always return a `result` dict with `answer`, `table`, and `chart` keys. This makes the frontend deterministic regardless of what the LLM generates internally.

**Horizontal bar charts** — the frontend auto-detects long category labels (like job titles) and switches to horizontal layout for readability.

---


## 📄 License

MIT — free to use, fork, and build on.

---

<div align="center">

⭐ **If this project helped you, please star the repo!**

Made with 🤖 + ☕ by [Tanzeela Memon](https://github.com/tanzeela-16)

</div>