import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
GOOGLE_API_KEY = os.environ["GOOGLE_API_KEY"]
YOUTUBE_API_KEY = os.environ["YOUTUBE_API_KEY"]
TAVILY_API_KEY = os.environ["TAVILY_API_KEY"]
HF_TOKEN = os.getenv("HF_TOKEN", "")
SEMANTIC_SCHOLAR_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")

# OpenRouter — free + budget model access (openrouter.ai)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

DB_PATH = os.getenv("DB_PATH", "./chatbot.db")

# Anthropic models
MODEL_HAIKU = os.getenv("MODEL_HAIKU", "claude-haiku-4-5-20251001")
MODEL_SONNET = os.getenv("MODEL_SONNET", "claude-sonnet-4-6")

# Google model (direct Gemini SDK — kept for research summariser)
MODEL_GEMINI = os.getenv("MODEL_GEMINI", "gemini-2.0-flash")

# OpenRouter model IDs
MODEL_LLAMA_FREE = os.getenv("MODEL_LLAMA_FREE", "meta-llama/llama-3.3-70b-instruct:free")
MODEL_GEMMA_FREE = os.getenv("MODEL_GEMMA_FREE", "google/gemma-3-27b-it:free")
MODEL_FLASH_LITE = os.getenv("MODEL_FLASH_LITE", "google/gemini-2.0-flash-lite-001")
MODEL_DEEPSEEK = os.getenv("MODEL_DEEPSEEK", "deepseek/deepseek-chat-v3-0324:free")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))

_spec_path = os.getenv("CURRICULUM_SPEC_PATH", "../warroom-curriculum-spec.md")
CURRICULUM_SPEC_PATH = Path(__file__).parent / _spec_path
