from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io
import os
from dotenv import load_dotenv

load_dotenv()
from agent import run_agent

app = FastAPI(title="AI Data Analyst Agent", version="1.0.0")

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://ai-data-analyst-puce.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "AI Data Analyst Agent is running 🚀"}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    question: str = Form(...)
):
    # --- Validate file type ---
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files are supported."
        )

    # --- Read file into DataFrame ---
    contents = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    # --- Build data context for the agent ---
    data_context = build_data_context(df)

    # --- Run the agent ---
    try:
        result = await run_agent(df, data_context, question)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


def build_data_context(df: pd.DataFrame) -> dict:
    """Summarize the dataframe so the LLM understands it before writing code."""
    context = {
        "shape": {"rows": df.shape[0], "columns": df.shape[1]},
        "columns": list(df.columns),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "null_counts": df.isnull().sum().to_dict(),
        "sample_rows": df.head(3).to_dict(orient="records"),
        "numeric_summary": {},
    }
    # Add basic stats for numeric columns
    numeric_cols = df.select_dtypes(include="number").columns
    for col in numeric_cols:
        context["numeric_summary"][col] = {
            "min": round(float(df[col].min()), 2),
            "max": round(float(df[col].max()), 2),
            "mean": round(float(df[col].mean()), 2),
        }
    return context