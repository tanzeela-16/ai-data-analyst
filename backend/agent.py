import os
import json
import re
import pandas as pd
from groq import AsyncGroq
from tools import execute_pandas_code, get_data_summary

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))

# Llama 3.1 70B — free, fast, very capable for code generation
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an expert data analyst AI agent.

You will be given:
1. A dataset summary (columns, dtypes, sample rows, stats)
2. A user question about the data
3. The actual data as a CSV string

Your job:
- Write Python/Pandas code to answer the question
- The code MUST store the final answer in a variable called `result`
- `result` must be a dict with these keys:
    - "answer": string — plain English explanation of the finding
    - "table": list of dicts — the data table (use df.to_dict(orient="records"), max 20 rows)
    - "chart": dict or null — Plotly chart spec with keys: "type" (bar/line/pie/scatter), "x", "y", "title"

RULES:
- Only use: pandas, numpy — already imported as pd, np
- Do NOT use matplotlib or seaborn
- Do NOT use plt.show() or any display functions
- The variable `df` already exists — do not reload any file
- Keep code clean and simple
- If the question can't be answered with a chart, set "chart" to null

EXAMPLE output format for `result`:
{
  "answer": "Product A has the highest revenue at 45000, followed by Product B at 38000.",
  "table": [{"product": "A", "revenue": 45000}, {"product": "B", "revenue": 38000}],
  "chart": {
    "type": "bar",
    "x": ["A", "B", "C"],
    "y": [45000, 38000, 22000],
    "title": "Top Products by Revenue"
  }
}

Return ONLY the Python code — no explanation, no markdown, no backticks.
"""


def build_user_message(df: pd.DataFrame, question: str) -> str:
    summary = get_data_summary(df)
    csv_preview = df.head(50).to_csv(index=False)
    return f"""
DATASET SUMMARY:
{summary}

USER QUESTION:
{question}

ACTUAL DATA (first 50 rows as CSV):
{csv_preview}

Write Python code using the variable `df` (already loaded, full dataset).
Store your answer in the `result` variable.
Return ONLY the Python code.
"""


async def run_agent(df: pd.DataFrame, data_context: dict, question: str) -> dict:
    """
    Agent loop:
    1. Ask Groq (Llama 3.1) to write Pandas code
    2. Execute the code via tools.py
    3. If error → self-correct and retry (up to MAX_RETRIES)
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": build_user_message(df, question)},
    ]

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):

        # ── Ask the LLM to write code ──────────────────────────────────────
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0,
            max_tokens=1500,
        )
        code = response.choices[0].message.content.strip()

        # Strip markdown fences just in case
        code = re.sub(r"^```(?:python)?", "", code, flags=re.MULTILINE)
        code = re.sub(r"```$",            "", code, flags=re.MULTILINE).strip()

        # ── Execute the code ───────────────────────────────────────────────
        out = execute_pandas_code(code, df)

        if out["success"]:
            out["result"]["code"]     = code
            out["result"]["attempts"] = attempt
            return out["result"]

        # ── Self-correction: tell the model what went wrong ────────────────
        last_error = out["error"]
        messages.append({"role": "assistant", "content": code})
        messages.append({
            "role": "user",
            "content": (
                f"That code raised this error:\n{last_error}\n\n"
                "Fix the code and try again. Return only the corrected Python code, no explanation."
            ),
        })

    # All retries failed
    return {
        "answer":   f"I tried {MAX_RETRIES} times but couldn't complete the analysis. Last error: {last_error}",
        "table":    [],
        "chart":    None,
        "code":     "",
        "attempts": MAX_RETRIES,
        "error":    last_error,
    }