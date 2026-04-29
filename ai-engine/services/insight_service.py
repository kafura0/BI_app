import json
import os
from typing import Any
import pandas as pd

from providers.openai_provider import OpenAIProvider
from providers.base import AIProvider
from prompts.templates import (
    DATA_ANALYSIS_SYSTEM,
    DATA_ANALYSIS_USER_TEMPLATE,
    GENERAL_INSIGHT_SYSTEM,
    GENERAL_INSIGHT_USER_TEMPLATE,
)


def _get_provider() -> AIProvider:
    # Swap provider here — e.g. AnthropicProvider, GeminiProvider
    return OpenAIProvider()


def _format_column_stats(df: pd.DataFrame) -> str:
    def fmt(v: float) -> str:
        return f"{v:.2f}" if pd.notna(v) else "N/A"

    lines = []
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            s = df[col].dropna()
            lines.append(f"  {col} (numeric): min={fmt(s.min())}, max={fmt(s.max())}, mean={fmt(s.mean())}, nulls={df[col].isna().sum()}")
        else:
            top = df[col].value_counts().head(3).to_dict()
            lines.append(f"  {col} (text): {df[col].nunique()} unique values, top={top}, nulls={df[col].isna().sum()}")
    return "\n".join(lines)


def _safe_parse_json(raw: str) -> dict:
    raw = raw.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Return a graceful degraded response
        return {
            "explanation": raw[:500] if raw else "Unable to parse AI response.",
            "key_metrics": [],
            "suggested_actions": [],
        }


async def generate_insight(query: str, df: pd.DataFrame | None = None) -> dict[str, Any]:
    provider = _get_provider()

    if df is not None and not df.empty:
        sample = df.head(10).where(pd.notnull(df), None).to_string(index=False)
        col_stats = _format_column_stats(df)
        user_message = DATA_ANALYSIS_USER_TEMPLATE.format(
            query=query,
            row_count=len(df),
            column_names=", ".join(df.columns.tolist()),
            column_stats=col_stats,
            sample_data=sample,
        )
        system_prompt = DATA_ANALYSIS_SYSTEM
    else:
        user_message = GENERAL_INSIGHT_USER_TEMPLATE.format(query=query)
        system_prompt = GENERAL_INSIGHT_SYSTEM

    result = await provider.complete(
        system_prompt=system_prompt,
        user_message=user_message,
        max_tokens=int(os.environ.get("OPENAI_MAX_TOKENS", "2048")),
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    parsed = _safe_parse_json(result.content)

    return {
        "response": parsed,
        "model": result.model,
        "tokens_used": result.total_tokens,
        "prompt_tokens": result.prompt_tokens,
        "completion_tokens": result.completion_tokens,
    }
