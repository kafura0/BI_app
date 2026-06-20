"""Tests for the AI insight service."""
from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_generate_insight_no_dataset():
    """Should generate a general insight when no dataset is provided."""
    mock_provider = AsyncMock()
    mock_provider.complete.return_value = type("Result", (), {
        "content": '{"explanation": "Test", "key_metrics": []}',
        "model": "gpt-4o-mini",
        "total_tokens": 50,
        "prompt_tokens": 20,
        "completion_tokens": 30,
    })()

    with patch("services.insight_service._get_provider", return_value=mock_provider):
        from services.insight_service import generate_insight

        result = await generate_insight(query="What are my key metrics?", df=None)

    assert result["model"] == "gpt-4o-mini"
    assert result["tokens_used"] == 50
    mock_provider.complete.assert_awaited_once()
