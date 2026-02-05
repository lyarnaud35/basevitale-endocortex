"""
AI Cortex - Universal Worker
=============================

FastAPI service pour structurer les réponses LLM via instructor.
AUCUNE logique métier - Pur proxy de structuration.

Law III: Universal Worker (Architecture Neuro-Symbiotique)
- Code GENERIC, UN SEUL endpoint principal: POST /process-generic
- Input: { text: str, schema: dict } (JSON Schema standard)
- Utilise instructor patché sur openai pour interroger un LLM local (Ollama)
- Output: JSON structuré validé selon le schema
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field, create_model

from services.llm_processor import structure_text

# Import instructor avec fallback pour les deux versions
try:
    import instructor
    # Instructor 1.0.0+ : utiliser from_openai()
    INSTRUCTOR_NEW_API = True
except ImportError:
    try:
        from instructor import patch
        INSTRUCTOR_NEW_API = False
    except ImportError:
        raise ImportError("instructor package not found. Install with: pip install instructor")

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ai-cortex")

# -----------------------------------------------------------------------------
# Configuration (env)
# -----------------------------------------------------------------------------
DEFAULT_LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
DEFAULT_LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
DEFAULT_BASE_URL = os.getenv(
    "LLM_BASE_URL",
    os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
)

# Ollama : Mac (Docker) → host.docker.internal ; docker-compose avec service ollama → ollama
OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://host.docker.internal:11434/v1",
)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# 5 min pour tous les timeouts (Ollama lent en local) — connect, read, write, pool
LLM_TIMEOUT = httpx.Timeout(
    300.0,
    connect=300.0,
    read=300.0,
    write=300.0,
    pool=300.0,
)

app = FastAPI(
    title="AI Cortex - Universal Worker",
    description="Generic LLM structuration proxy - No business logic",
    version="2.0.0",
)


class ProcessGenericRequest(BaseModel):
    """Requête pour le traitement générique - Law III: Universal Worker"""
    text: str = Field(..., description="Texte à analyser et structurer")
    schema: Dict[str, Any] = Field(
        ..., 
        alias="schema",
        description="Schéma JSON (JSON Schema) pour structurer la réponse dynamiquement"
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Prompt système optionnel (défaut: générique)"
    )
    llm_provider: Optional[str] = Field(
        default=DEFAULT_LLM_PROVIDER,
        description="Fournisseur LLM: 'openai' ou 'ollama'"
    )
    llm_model: Optional[str] = Field(
        default=None,
        description="Modèle LLM (si None, utilise la valeur par défaut selon provider)"
    )
    base_url: Optional[str] = Field(
        default=None,
        description="URL de base du fournisseur LLM (si None, utilise la valeur par défaut)"
    )


class ProcessGenericResponse(BaseModel):
    """Réponse structurée selon le schéma fourni"""
    data: Dict[str, Any] = Field(..., description="Données structurées selon schema")


# -----------------------------------------------------------------------------
# Schéma Consultation (miroir Zod ConsultationSchema) – Law I: Contract-First
# Utilisé par POST /structure pour extraire entités médicales.
# -----------------------------------------------------------------------------
class DiagnosisStructure(BaseModel):
    code: str = Field(..., description="Code diagnostic (ex. CIM-10)")
    label: str = Field(..., description="Libellé du diagnostic")
    confidence: float = Field(0.5, ge=0, le=1, description="Score de confiance 0–1")


class MedicationStructure(BaseModel):
    name: str = Field(..., description="Nom du médicament")
    dosage: str = Field(..., description="Dosage (ex. 500mg, 10ml)")
    duration: str = Field(..., description="Durée (ex. 7 jours, 2 semaines)")


class ConsultationStructure(BaseModel):
    """Structure Consultation – équivalent Pydantic du ConsultationSchema Zod"""
    patientId: str = Field(..., description="Identifiant du patient")
    transcript: str = Field(..., description="Transcription brute de la consultation")
    symptoms: List[str] = Field(..., min_length=1, description="Symptômes rapportés")
    diagnosis: List[DiagnosisStructure] = Field(..., min_length=1, description="Diagnostics")
    medications: List[MedicationStructure] = Field(default_factory=list, description="Médicaments prescrits")


def get_openai_client(
    provider: str,
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> OpenAI:
    """
    Crée un client OpenAI compatible (OpenAI ou Ollama).

    - Ollama: OLLAMA_BASE_URL (défaut host.docker.internal ou ollama en compose)
    - OpenAI: OPENAI_API_KEY requise
    - Timeout 300s (connect, read, write, pool) pour éviter APITimeoutError avec Ollama.
    - max_retries=0 : pas de retries automatiques (voir la lenteur tout de suite).
    """
    if provider == "ollama":
        url = base_url or OLLAMA_BASE_URL
        logger.info("Using Ollama client at %s (timeout=300s, max_retries=0)", url)
        http_client = httpx.Client(timeout=LLM_TIMEOUT)
        return OpenAI(
            base_url=url,
            api_key="ollama",
            http_client=http_client,
            max_retries=0,
        )
    url = base_url or DEFAULT_BASE_URL
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key and provider == "openai":
        raise ValueError(
            "OPENAI_API_KEY is required for provider 'openai'. "
            "Use LLM_PROVIDER=ollama for local LLM."
        )
    return OpenAI(
        base_url=url,
        api_key=key,
        timeout=LLM_TIMEOUT,
        max_retries=0,
    )


def json_schema_to_pydantic_model(
    schema: Dict[str, Any],
    model_name: str = "DynamicResponse"
) -> type[BaseModel]:
    """
    Convertit un JSON Schema en modèle Pydantic dynamique.
    
    CRITIQUE: Pas de hardcoding - construction dynamique uniquement.
    
    Args:
        schema: JSON Schema (format OpenAPI3 ou standard)
        model_name: Nom du modèle Pydantic à créer
    
    Returns:
        Classe Pydantic dynamique
    """
    fields: Dict[str, tuple] = {}
    
    # Gérer le format JSON Schema standard
    if isinstance(schema, dict):
        # Si c'est un schéma JSON Schema avec "properties"
        if "properties" in schema:
            props = schema.get("properties", {})
            required_fields = set(schema.get("required", []))
            
            for field_name, field_def in props.items():
                if not isinstance(field_def, dict):
                    # Si ce n'est pas un dict, utiliser Any
                    fields[field_name] = (Any, Field(...) if field_name in required_fields else Field(default=None))
                    continue
                
                field_type = field_def.get("type")
                is_required = field_name in required_fields
                
                # Gérer les différents types JSON Schema
                if field_type == "string":
                    fields[field_name] = (
                        str,
                        Field(...) if is_required else Field(default=None)
                    )
                elif field_type == "integer":
                    fields[field_name] = (
                        int,
                        Field(...) if is_required else Field(default=None)
                    )
                elif field_type == "number":
                    fields[field_name] = (
                        float,
                        Field(...) if is_required else Field(default=None)
                    )
                elif field_type == "boolean":
                    fields[field_name] = (
                        bool,
                        Field(...) if is_required else Field(default=None)
                    )
                elif field_type == "array":
                    # Gérer les arrays
                    items_schema = field_def.get("items", {})
                    if isinstance(items_schema, dict):
                        items_type = items_schema.get("type", "string")
                        
                        if items_type == "string":
                            fields[field_name] = (
                                List[str],
                                Field(...) if is_required else Field(default_factory=list)
                            )
                        elif items_type == "integer":
                            fields[field_name] = (
                                List[int],
                                Field(...) if is_required else Field(default_factory=list)
                            )
                        elif items_type == "number":
                            fields[field_name] = (
                                List[float],
                                Field(...) if is_required else Field(default_factory=list)
                            )
                        elif items_type == "boolean":
                            fields[field_name] = (
                                List[bool],
                                Field(...) if is_required else Field(default_factory=list)
                            )
                        elif items_type == "object":
                            # Array d'objets - créer un sous-modèle dynamique
                            sub_model = json_schema_to_pydantic_model(
                                items_schema,
                                f"{model_name}_{field_name}Item"
                            )
                            fields[field_name] = (
                                List[sub_model],
                                Field(...) if is_required else Field(default_factory=list)
                            )
                        else:
                            # Array générique
                            fields[field_name] = (
                                List[Any],
                                Field(...) if is_required else Field(default_factory=list)
                            )
                    else:
                        # Array sans items défini - liste générique
                        fields[field_name] = (
                            List[Any],
                            Field(...) if is_required else Field(default_factory=list)
                        )
                elif field_type == "object":
                    # Objet imbriqué - créer un sous-modèle récursivement
                    sub_model = json_schema_to_pydantic_model(
                        field_def,
                        f"{model_name}_{field_name}"
                    )
                    fields[field_name] = (
                        sub_model,
                        Field(...) if is_required else Field(default=None)
                    )
                else:
                    # Type inconnu - utiliser Any
                    fields[field_name] = (
                        Any,
                        Field(...) if is_required else Field(default=None)
                    )
        
        # Si c'est un objet simple sans "properties" (format alternatif)
        elif all(isinstance(v, (dict, list, str, int, float, bool, type(None))) for v in schema.values()):
            # Traiter comme un objet simple
            for field_name, field_value in schema.items():
                if field_value is None:
                    fields[field_name] = (Optional[Any], Field(default=None))
                elif isinstance(field_value, str):
                    fields[field_name] = (str, Field(...))
                elif isinstance(field_value, int):
                    fields[field_name] = (int, Field(...))
                elif isinstance(field_value, float):
                    fields[field_name] = (float, Field(...))
                elif isinstance(field_value, bool):
                    fields[field_name] = (bool, Field(...))
                elif isinstance(field_value, list):
                    # Déterminer le type des éléments
                    if field_value and isinstance(field_value[0], dict):
                        # Liste d'objets
                        sub_model = json_schema_to_pydantic_model(
                            field_value[0],
                            f"{model_name}_{field_name}Item"
                        )
                        fields[field_name] = (List[sub_model], Field(default_factory=list))
                    else:
                        # Liste simple
                        fields[field_name] = (List[Any], Field(default_factory=list))
                elif isinstance(field_value, dict):
                    # Objet imbriqué
                    sub_model = json_schema_to_pydantic_model(
                        field_value,
                        f"{model_name}_{field_name}"
                    )
                    fields[field_name] = (sub_model, Field(...))
                else:
                    fields[field_name] = (Any, Field(...))
    
    # Si aucun champ n'a été créé, créer un modèle générique
    if not fields:
        fields["data"] = (Dict[str, Any], Field(...))
    
    return create_model(model_name, **fields)


def _patched_client(client: OpenAI, provider: str = "openai"):
    """Patch OpenAI client with instructor (mode JSON pour Ollama)."""
    if INSTRUCTOR_NEW_API:
        # Instructor 1.0.0+ : utiliser from_openai() avec mode JSON pour Ollama
        # Ollama ne supporte pas les tools, donc on force le mode JSON
        if provider == "ollama":
            try:
                # Utiliser Mode.JSON pour éviter les tools
                return instructor.from_openai(client, mode=instructor.Mode.JSON)
            except (AttributeError, TypeError):
                # Fallback si Mode.JSON n'existe pas
                return instructor.from_openai(client)
        else:
            # Pour OpenAI, utiliser le mode par défaut (TOOLS)
            return instructor.from_openai(client)
    else:
        # Instructor 0.4.5 (ancienne API)
        try:
            from instructor.patch import PatchMode
            return patch(client, mode=PatchMode.JSON)
        except (ImportError, AttributeError):
            return patch(client, mode="json")


@app.post("/process-generic", response_model=ProcessGenericResponse)
async def process_generic(request: ProcessGenericRequest) -> ProcessGenericResponse:
    """
    Universal Worker: structure text according to a JSON Schema via a local LLM (Ollama).

    - Input: { "text": str, "schema": dict } (standard JSON Schema)
    - Uses instructor on OpenAI client to constrain LLM output to schema
    - Output: validated structured JSON
    """
    provider = request.llm_provider or DEFAULT_LLM_PROVIDER
    model = request.llm_model or (OLLAMA_MODEL if provider == "ollama" else DEFAULT_LLM_MODEL)
    base_url = request.base_url or (OLLAMA_BASE_URL if provider == "ollama" else None)

    try:
        client = get_openai_client(
            provider=provider,
            base_url=base_url,
            api_key=os.getenv("OPENAI_API_KEY") if provider == "openai" else None,
        )
    except ValueError as e:
        logger.warning("Config error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Patcher le client avec instructor (passer le provider pour le mode JSON avec Ollama)
    patched = _patched_client(client, provider=provider)
    
    system_message = request.system_prompt or (
        "Tu es un assistant IA qui extrait et structure des informations depuis du texte. "
        "Tu réponds UNIQUEMENT avec un JSON valide selon le schéma fourni, "
        "sans texte explicatif ni markdown."
    )
    schema_str = json.dumps(request.schema, indent=2, ensure_ascii=False)
    user_message = (
        f"Analyse le texte suivant et extrais les infos structurées selon le schéma JSON.\n\n"
        f"Texte:\n{request.text}\n\n"
        f"Schéma à respecter:\n{schema_str}\n\n"
        f"Réponds UNIQUEMENT par un JSON valide selon ce schéma."
    )

    try:
        DynamicModel = json_schema_to_pydantic_model(request.schema, "StructuredResponse")
        
        # Utiliser l'API appropriée selon la version d'instructor
        # Pour Ollama, ajouter response_format="json_object" pour éviter les tools
        create_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            "response_model": DynamicModel,
            "temperature": 0.3,
        }
        
        # Pour Ollama, forcer JSON object format (évite les tools)
        if provider == "ollama":
            create_params["response_format"] = {"type": "json_object"}
        
        response = patched.chat.completions.create(**create_params)
    except Exception as e:  # noqa: BLE001
        _handle_llm_error(e, provider, model)

    if hasattr(response, "model_dump"):
        structured_data = response.model_dump()
    elif hasattr(response, "dict"):
        structured_data = response.dict()
    else:
        structured_data = dict(response) if hasattr(response, "__dict__") else {}

    # Normaliser billingCodes / prescription (ConsultationSchema) pour compatibilité Zod
    if not isinstance(structured_data.get("billingCodes"), list):
        structured_data["billingCodes"] = []
    if not isinstance(structured_data.get("prescription"), list):
        structured_data["prescription"] = []

    return ProcessGenericResponse(data=structured_data)


def _handle_llm_error(exc: Exception, provider: str, model: str) -> None:
    """Log and raise HTTPException for LLM/client errors."""
    err_msg = str(exc).lower()
    logger.exception("LLM request failed [provider=%s model=%s]: %s", provider, model, exc)

    if "connection" in err_msg or "connect" in err_msg or "refused" in err_msg:
        raise HTTPException(
            status_code=503,
            detail=(
                "Ollama injoignable. Vérifiez OLLAMA_BASE_URL "
                "(ex: http://host.docker.internal:11434/v1 ou http://ollama:11434/v1) "
                "et qu'Ollama tourne."
            ),
        ) from exc
    if "timeout" in err_msg or "timed out" in err_msg:
        raise HTTPException(
            status_code=504,
            detail="Timeout lors de l'appel au LLM. Réessayez ou augmentez le timeout.",
        ) from exc
    if "api_key" in err_msg or "openai_api_key" in err_msg:
        raise HTTPException(
            status_code=400,
            detail="OPENAI_API_KEY manquante ou invalide. Utilisez LLM_PROVIDER=ollama pour un LLM local.",
        ) from exc

    raise HTTPException(
        status_code=500,
        detail=f"Erreur lors du traitement générique: {exc!s}",
    ) from exc


# -----------------------------------------------------------------------------
# POST /structure – Cerveau Réel (Operation Synapse)
# Accepte { text } uniquement. Utilise ConsultationStructure + instructor.
# -----------------------------------------------------------------------------
class StructureRequest(BaseModel):
    """Requête pour la structuration – payload minimal { text }"""
    text: str = Field(..., description="Texte à analyser (dictée, transcription)")


class StructureResponse(BaseModel):
    """Réponse structurée conforme ConsultationSchema"""
    data: Dict[str, Any] = Field(..., description="Consultation structurée (patientId, symptoms, diagnosis, medications)")


STRUCTURE_SYSTEM_PROMPT = (
    "Tu es un assistant médical expert. Analyse le texte fourni (transcription ou dictée de consultation) "
    "et extrais les entités structurées : patientId (génère un id court si absent, ex. pat-001), "
    "transcript (le texte brut), symptoms (liste de chaînes), diagnosis (code, label, confidence 0–1), "
    "medications (name, dosage, duration). Réponds UNIQUEMENT par un JSON valide selon le schéma attendu, "
    "sans markdown ni texte explicatif."
)


@app.post("/structure", response_model=StructureResponse)
async def structure(request: StructureRequest) -> StructureResponse:
    """
    Cerveau Réel – Structuration consultation via LLM (Ollama/OpenAI).

    - Input: { "text": str }
    - Utilise instructor + ConsultationStructure (miroir Zod)
    - Output: { "data": { patientId, transcript, symptoms, diagnosis, medications } }
    """
    provider = os.getenv("LLM_PROVIDER", DEFAULT_LLM_PROVIDER)
    model = OLLAMA_MODEL if provider == "ollama" else (os.getenv("LLM_MODEL") or DEFAULT_LLM_MODEL)
    base_url = OLLAMA_BASE_URL if provider == "ollama" else None

    try:
        client = get_openai_client(
            provider=provider,
            base_url=base_url,
            api_key=os.getenv("OPENAI_API_KEY") if provider == "openai" else None,
        )
    except ValueError as e:
        logger.warning("[/structure] Config error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e

    patched = _patched_client(client, provider=provider)
    user_message = (
        f"Analyse ce texte de consultation et extrais les entités structurées.\n\nTexte:\n{request.text}"
    )

    try:
        create_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": STRUCTURE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "response_model": ConsultationStructure,
            "temperature": 0.3,
        }
        if provider == "ollama":
            create_params["response_format"] = {"type": "json_object"}

        response = patched.chat.completions.create(**create_params)
    except Exception as e:  # noqa: BLE001
        _handle_llm_error(e, provider, model)

    if hasattr(response, "model_dump"):
        structured_data = response.model_dump()
    elif hasattr(response, "dict"):
        structured_data = response.dict()
    else:
        structured_data = dict(response) if hasattr(response, "__dict__") else {}

    logger.info("[/structure] Consultation structurée (symptoms=%d, diagnosis=%d)",
                len(structured_data.get("symptoms", [])), len(structured_data.get("diagnosis", [])))
    return StructureResponse(data=structured_data)


# -----------------------------------------------------------------------------
# POST /process – Cerveau structurant (OpenAI + instructor, retries)
# Input: { "text": str, "mode": "FAST" | "PRECISE" }. Output: JSON structuré (ConsultationModel).
# -----------------------------------------------------------------------------
class ProcessRequest(BaseModel):
    """Requête pour POST /process."""
    text: str = Field(..., min_length=1, description="Texte à structurer")
    mode: Literal["FAST", "PRECISE"] = Field(
        default="FAST",
        description="FAST = rapidité, PRECISE = focus CIM-10 et précision",
    )


@app.post("/process")
def process(request: ProcessRequest):
    """
    Cerveau structurant — extraction d'entités cliniques via OpenAI + instructor.

    - Input: { "text": str, "mode": "FAST" | "PRECISE" }
    - Output: JSON structuré (patientId, transcript, symptoms, diagnosis, medications).
    - OPENAI_API_KEY requis (.env). Instructor gère les retries sur JSON malformé.
    """
    try:
        consultation = structure_text(request.text, mode=request.mode)
        return consultation.model_dump()
    except ValueError as e:
        logger.warning("[/process] Config: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        logger.warning("[/process] Structuration failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Structuration impossible après plusieurs tentatives. Vérifiez OPENAI_API_KEY.",
        ) from e


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ai-cortex",
        "version": "2.0.0",
        "llm": {
            "provider": DEFAULT_LLM_PROVIDER,
            "ollama_base_url": OLLAMA_BASE_URL,
            "ollama_model": OLLAMA_MODEL,
        },
        "endpoints": {
            "process": "/process (text, mode FAST|PRECISE)",
            "process-generic": "/process-generic",
            "structure": "/structure (Consultation)",
            "health": "/health",
        },
    }


# Importer et inclure les routes de transcription si disponibles
try:
    from transcribe import app as transcribe_app
    app.mount("/transcribe", transcribe_app)
except ImportError:
    # Si le module n'est pas disponible, on continue sans
    pass


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
