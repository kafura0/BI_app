from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class CompletionResult:
    content: str
    model: str
    prompt_tokens: int
    completion_tokens: int

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


class AIProvider(ABC):
    """Abstract base for all LLM providers. Swap OpenAI for Anthropic/Gemini/local models."""

    @abstractmethod
    async def complete(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        response_format: dict | None = None,
    ) -> CompletionResult:
        ...

    @abstractmethod
    def get_model_name(self) -> str:
        ...
