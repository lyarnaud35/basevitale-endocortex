"""
Endpoint de transcription audio avec Whisper
Pour BaseVitale AI Cortex
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import io
import whisper
from typing import Optional, List, Dict, Any

app = FastAPI()

# Modèle Whisper (chargé au démarrage)
whisper_model = None

def load_whisper_model(model_name: str = "base"):
    """Charger le modèle Whisper"""
    global whisper_model
    if whisper_model is None:
        whisper_model = whisper.load_model(model_name)
    return whisper_model

class TranscribeRequest(BaseModel):
    """Requête de transcription"""
    audio: str  # Base64 encoded audio
    filename: str
    language: Optional[str] = "fr"
    model: Optional[str] = "base"

class TranscribeResponse(BaseModel):
    """Réponse de transcription"""
    text: str
    segments: Optional[List[Dict[str, Any]]] = None
    language: Optional[str] = None
    duration: Optional[float] = None

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest) -> TranscribeResponse:
    """
    Transcrire un fichier audio avec Whisper
    
    Args:
        request: Requête avec audio en base64
        
    Returns:
        Transcription avec segments et métadonnées
    """
    try:
        # Décoder l'audio base64
        audio_data = base64.b64decode(request.audio)
        audio_file = io.BytesIO(audio_data)
        
        # Charger le modèle Whisper
        model = load_whisper_model(request.model)
        
        # Transcrire
        result = model.transcribe(
            audio_file,
            language=request.language,
            task="transcribe",
        )
        
        # Formater les segments
        segments = [
            {
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
            }
            for seg in result.get("segments", [])
        ]
        
        return TranscribeResponse(
            text=result["text"].strip(),
            segments=segments,
            language=result.get("language"),
            duration=sum(seg["end"] - seg["start"] for seg in result.get("segments", [])),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la transcription: {str(e)}"
        )
