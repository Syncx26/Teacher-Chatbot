"""
Voice transcription via OpenAI Whisper.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from auth import verify_token
from chatbot.router import _get_openai

router = APIRouter()


@router.post("")
async def transcribe(
    audio: UploadFile = File(...),
    claims: dict = Depends(verify_token),
):
    content = await audio.read()
    if len(content) > 25 * 1024 * 1024:  # 25MB Whisper limit
        raise HTTPException(status_code=413, detail="Audio file too large (max 25MB)")

    client = _get_openai()
    # Whisper requires a file-like with a name
    import io
    audio_file = io.BytesIO(content)
    audio_file.name = audio.filename or "audio.webm"

    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
    )
    return {"text": transcript.text}
