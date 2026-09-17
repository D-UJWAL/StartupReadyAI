import os
import httpx
import logging

logger = logging.getLogger(__name__)

class AIProvider:
    def __init__(self):
        # Prefer Gemini, fallback to OpenAI
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")

    async def generate_text(self, prompt: str) -> str:
        if self.gemini_api_key:
            return await self._call_gemini(prompt)
        elif self.openai_api_key:
            return await self._call_openai(prompt)
        else:
            # Fallback local behavior if no API keys are provided
            return self._local_fallback(prompt)

    async def _call_gemini(self, prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=15.0)
                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return f"[AI Error] Could not generate response via Gemini. Using fallback... {self._local_fallback(prompt)}"

    async def _call_openai(self, prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_api_key}"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 500
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=15.0)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return f"[AI Error] Could not generate response via OpenAI. Using fallback... {self._local_fallback(prompt)}"

    def _local_fallback(self, prompt: str) -> str:
        # A smart local fallback that indicates it is simulated
        if "improve" in prompt.lower():
            return "(Simulated AI Improvement) This text has been restructured for clarity, focusing on key metrics and engaging tone. Please provide an API key for true AI generation."
        elif "rewrite" in prompt.lower():
            return "(Simulated AI Rewrite) As an investor-focused summary: The startup addresses a critical market need with a scalable model. [Provide API Key for full AI generation]"
        elif "action plan" in prompt.lower() or "template" in prompt.lower():
            return "1. Immediate Action: Set up API Keys.\n2. Review current metrics.\n3. Execute planned strategy.\n[Provide API key for detailed real AI plan]"
        else:
            return "(Simulated AI Content) Generated draft based on inputs. Connect your API key in the environment to enable real generative capabilities."

ai_service = AIProvider()
