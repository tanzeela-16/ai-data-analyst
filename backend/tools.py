import pandas as pd
import numpy as np
import json
import traceback


def execute_pandas_code(code: str, df: pd.DataFrame) -> dict:
    """
    Executes GPT-generated Pandas code safely.
    Returns a result dict or an error string.
    
    This is the 'Code Interpreter Tool' of our agent.
    """
    # Clean up any markdown fences if model adds them
    code = code.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        code = "\n".join(lines).strip()

    # Isolated namespace — agent can only access df, pd, np
    namespace = {
        "df": df.copy(),
        "pd": pd,
        "np": np,
        "result": None,
    }

    try:
        exec(code, namespace)  # noqa: S102
    except Exception:
        return {
            "success": False,
            "error": traceback.format_exc(limit=3),
            "result": None,
        }

    raw = namespace.get("result")

    if raw is None:
        return {
            "success": False,
            "error": "Code ran but did not set a `result` variable.",
            "result": None,
        }

    if not isinstance(raw, dict):
        return {
            "success": False,
            "error": f"`result` must be a dict, got {type(raw).__name__}",
            "result": None,
        }

    # Check required keys
    missing = [k for k in ("answer", "table", "chart") if k not in raw]
    if missing:
        return {
            "success": False,
            "error": f"`result` dict is missing keys: {missing}",
            "result": None,
        }

    # Safely serialize (converts numpy types, timestamps, etc.)
    try:
        serialized = json.loads(json.dumps(raw, default=str))
    except Exception as e:
        return {
            "success": False,
            "error": f"Could not serialize result to JSON: {e}",
            "result": None,
        }

    return {
        "success": True,
        "error": None,
        "result": serialized,
    }


def get_data_summary(df: pd.DataFrame) -> str:
    """
    Returns a human-readable summary of the dataframe.
    Used to build context for the LLM before it writes code.
    """
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(include="object").columns.tolist()

    summary = f"""
DATASET SUMMARY
===============
Shape        : {df.shape[0]} rows × {df.shape[1]} columns
All columns  : {list(df.columns)}
Numeric cols : {numeric_cols}
Text cols    : {categorical_cols}
Null values  : {df.isnull().sum().to_dict()}

SAMPLE (first 3 rows):
{df.head(3).to_string(index=False)}
"""

    if numeric_cols:
        summary += f"""
NUMERIC STATS:
{df[numeric_cols].describe().round(2).to_string()}
"""

    if categorical_cols:
        summary += "\nUNIQUE VALUES (categorical):\n"
        for col in categorical_cols[:5]:  # limit to first 5 text cols
            unique_vals = df[col].dropna().unique()[:10]
            summary += f"  {col}: {list(unique_vals)}\n"

    return summary.strip()