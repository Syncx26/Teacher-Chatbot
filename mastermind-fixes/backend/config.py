import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/mastermind")

# Anthropic
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Google
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# OpenAI (used for o3 and Whisper)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Groq (llama-3.3-70b-versatile)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Mistral
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")

# Clerk auth
CLERK_PUBLISHABLE_KEY = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "")  # e.g. https://<your-clerk-domain>/.well-known/jwks.json

# Push notifications (VAPID)
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL", "")

# Resend (email)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

# App
APP_ENV = os.getenv("APP_ENV", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
