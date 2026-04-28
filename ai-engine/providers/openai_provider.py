import json
import os
from openai import AsyncOpenAI
from .base import AIProvider, CompletionResult


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self._client = AsyncOpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])
        self._model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    def get_model_name(self) -> str:
        return self._model

    async def complete(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        response_format: dict | None = None,
    ) -> CompletionResult:
        kwargs: dict = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if response_format:
            kwargs["response_format"] = response_format

        response = await self._client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        usage = response.usage

        return CompletionResult(
            content=choice.message.content or "",
            model=self._model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
        )
