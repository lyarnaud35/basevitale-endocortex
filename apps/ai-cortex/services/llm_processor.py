"""
Service IA — Cerveau structurant.

Utilise instructor patché sur openai pour extraire des entités cliniques
selon ConsultationModel. Retries sur JSON malformé (invariant : pas d'erreur de parsing exposée).
"""

from __future__ import annotations

import logging
import os
from typing import Literal

import instructor
from openai import OpenAI

from domain.schemas import ConsultationModel

logger = logging.getLogger("ai-cortex.llm_processor")

SYSTEM_PROMPT = (
    "Tu es un assistant médical expert. Extrais les entités cliniques de ce texte. "
    "Sois précis sur les codes CIM-10 si possible. "
    "Réponds UNIQUEMENT par un JSON valide conforme au schéma : "
    "patientId (id court si absent, ex. pat-001), transcript (texte brut), "
    "symptoms (liste de chaînes), diagnosis (code, label, confidence 0–1), "
    "medications (name, dosage, duration). Pas de markdown ni texte hors JSON."
)

DEFAULT_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
MAX_RETRIES = int(os.getenv("INSTRUCTOR_MAX_RETRIES", "3"))


def _get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY est requis. Définissez-la dans .env ou l'environnement."
        )
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    return OpenAI(
        base_url=base,
        api_key=api_key,
    )


def _patched_client():
    """Client OpenAI patché avec instructor ; retries sur parsing/validation."""
    client = _get_client()
    try:
        return instructor.from_openai(
            client,
            mode=instructor.Mode.JSON,
            max_retries=MAX_RETRIES,
            retry_if_parsing_fails=True,
            throw_error=True,
        )
    except Exception as e:
        logger.exception("init instructor client: %s", e)
        raise


def structure_text(
    text: str,
    mode: Literal["FAST", "PRECISE"] = "FAST",
) -> ConsultationModel:
    """
    Extrait une Consultation structurée depuis du texte brut.

    - FAST : temperature 0.4, réponse plus rapide.
    - PRECISE : temperature 0.1, focus CIM-10 et précision.

    Instructor gère les retries en cas de JSON malformé / validation Pydantic.
    Ne lève jamais d'erreur de parsing brute vers l'appelant.
    """
    patched = _patched_client()
    temperature = 0.4 if mode == "FAST" else 0.1
    model = os.getenv("LLM_MODEL", DEFAULT_MODEL)

    try:
        response = patched.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Texte à analyser:\n\n{text}"},
            ],
            response_model=ConsultationModel,
            temperature=temperature,
        )
    except Exception as e:  # instructor retries épuisées, timeout, etc.
        logger.warning("structure_text failed after retries: %s", e)
        raise RuntimeError(
            "Structuration impossible après plusieurs tentatives. "
            "Vérifiez OPENAI_API_KEY et le modèle."
        ) from e

    return response
