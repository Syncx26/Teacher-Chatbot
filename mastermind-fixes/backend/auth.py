"""
Clerk JWT verification using python-jose and Clerk's JWKS endpoint.
Requires CLERK_JWKS_URL in your .env (e.g. https://<clerk-domain>/.well-known/jwks.json).
"""
import httpx
from jose import jwt, JWTError
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import CLERK_JWKS_URL

_bearer = HTTPBearer()
_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        resp = httpx.get(CLERK_JWKS_URL, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


def verify_token(credentials: HTTPAuthorizationCredentials = Security(_bearer)) -> dict:
    token = credentials.credentials
    try:
        jwks = _get_jwks()
        # jose will pick the matching key from the JWKS based on kid in token header
        claims = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return claims
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc
