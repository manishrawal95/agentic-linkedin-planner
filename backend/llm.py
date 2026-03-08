"""
LLM provider abstraction — Gemini (default) or Claude.
"""

from __future__ import annotations

import asyncio
import logging
import time

from backend import config

logger = logging.getLogger(__name__)

# Module-level client singletons (created on first use)
_gemini_client = None
_claude_client = None


async def generate(prompt: str, system: str = "", feature: str = "unknown") -> str:
    """Generate text using the configured LLM provider.

    Args:
        prompt: The user prompt to send.
        system: Optional system prompt.
        feature: Label for token tracking (e.g. 'briefing', 'draft', 'analysis').
    """
    provider = config.LLM_PROVIDER.lower()
    start = time.monotonic()
    try:
        if provider == "gemini":
            result, usage = await _generate_gemini(prompt, system)
        elif provider == "claude":
            result, usage = await _generate_claude(prompt, system)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}. Use 'gemini' or 'claude'.")
        elapsed = time.monotonic() - start
        logger.info("LLM call completed: provider=%s model=%s duration=%.1fs chars=%d",
                     provider, get_model_name(), elapsed, len(result))
        _log_token_usage(provider, get_model_name(), feature, usage, int(elapsed * 1000))
        return result
    except Exception:
        elapsed = time.monotonic() - start
        logger.error("LLM call failed: provider=%s model=%s duration=%.1fs",
                      provider, get_model_name(), elapsed,
                      extra={"action": f"Check {provider} API key and quota."})
        raise


def _log_token_usage(
    provider: str, model: str, feature: str,
    usage: dict[str, int], duration_ms: int,
) -> None:
    """Log token usage to the database. Best-effort, never raises."""
    try:
        from backend.db import get_conn
        conn = get_conn()
        conn.execute(
            """INSERT INTO token_usage (provider, model, feature, input_tokens, output_tokens, duration_ms)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (provider, model, feature,
             usage.get("input_tokens", 0), usage.get("output_tokens", 0),
             duration_ms),
        )
        conn.commit()
    except Exception as e:
        logger.warning("Failed to log token usage: %s", e)


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set. Add it to backend/.env")
        _gemini_client = genai.Client(api_key=config.GEMINI_API_KEY)
    return _gemini_client


def _get_claude_client():
    global _claude_client
    if _claude_client is None:
        import anthropic
        if not config.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not set. Add it to backend/.env")
        _claude_client = anthropic.AsyncAnthropic(api_key=config.ANTHROPIC_API_KEY)
    return _claude_client


async def _generate_gemini(prompt: str, system: str) -> tuple[str, dict[str, int]]:
    from google import genai
    from google.genai import errors as genai_errors

    client = _get_gemini_client()
    full_prompt = f"{system}\n\n{prompt}" if system else prompt

    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=full_prompt,
                config=genai.types.GenerateContentConfig(
                    temperature=config.LLM_TEMPERATURE,
                ),
            )
            usage: dict[str, int] = {}
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                meta = response.usage_metadata
                usage["input_tokens"] = getattr(meta, "prompt_token_count", 0) or 0
                usage["output_tokens"] = getattr(meta, "candidates_token_count", 0) or 0
            return response.text or "", usage
        except genai_errors.ClientError as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = min(60, (attempt + 1) * 15)
                logger.warning("Gemini rate limited, retrying in %ds (attempt %d/%d)", wait, attempt + 1, max_retries,
                               extra={"action": "Wait for rate limit to reset or check Gemini quota."})
                await asyncio.sleep(wait)
            else:
                raise
    raise RuntimeError("Gemini rate limit exceeded after retries. Try again in a few minutes.")


async def _generate_claude(prompt: str, system: str) -> tuple[str, dict[str, int]]:
    import anthropic

    client = _get_claude_client()

    max_retries = 5
    for attempt in range(max_retries):
        try:
            kwargs = {
                "model": config.CLAUDE_MODEL,
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": config.LLM_TEMPERATURE,
            }
            if system:
                kwargs["system"] = system

            response = await client.messages.create(**kwargs)
            usage: dict[str, int] = {}
            if hasattr(response, "usage") and response.usage:
                usage["input_tokens"] = getattr(response.usage, "input_tokens", 0) or 0
                usage["output_tokens"] = getattr(response.usage, "output_tokens", 0) or 0
            if not response.content:
                logger.warning("Claude returned empty content",
                               extra={"action": "Check if content was filtered by safety settings."})
                return "", usage
            return response.content[0].text, usage
        except anthropic.RateLimitError:
            wait = min(60, (attempt + 1) * 15)
            logger.warning("Claude rate limited, retrying in %ds (attempt %d/%d)", wait, attempt + 1, max_retries,
                           extra={"action": "Wait for rate limit to reset or check Anthropic quota."})
            await asyncio.sleep(wait)
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                wait = min(30, (attempt + 1) * 5)
                logger.warning("Claude server error %d, retrying in %ds (attempt %d/%d)",
                               e.status_code, wait, attempt + 1, max_retries,
                               extra={"action": "Anthropic API may be experiencing issues."})
                await asyncio.sleep(wait)
            else:
                raise
    raise RuntimeError("Claude rate limit exceeded after retries. Try again in a few minutes.")


def get_model_name() -> str:
    provider = config.LLM_PROVIDER.lower()
    if provider == "gemini":
        return config.GEMINI_MODEL
    elif provider == "claude":
        return config.CLAUDE_MODEL
    return provider
