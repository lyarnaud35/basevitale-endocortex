"""
Schémas Pydantic — miroir exact du ConsultationSchema (libs/shared contracts).

Law I: Contract-First — même structure que consultation.schema.ts (Zod).
Symptômes, Diagnostics (CIM-10), Médicaments. Optionnel : alerts.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class DiagnosisModel(BaseModel):
    """Diagnostic — code CIM-10, libellé, confiance."""

    code: str = Field(..., min_length=1, description="Code diagnostic (ex. CIM-10)")
    label: str = Field(..., min_length=1, description="Libellé du diagnostic")
    confidence: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Score de confiance 0–1",
    )


class MedicationModel(BaseModel):
    """Médicament prescrit — nom, dosage, durée."""

    name: str = Field(..., min_length=1, description="Nom du médicament")
    dosage: str = Field(..., min_length=1, description="Dosage (ex. 500mg, 10ml)")
    duration: str = Field(
        ...,
        min_length=1,
        description="Durée (ex. 7 jours, 2 semaines)",
    )


class ConsultationModel(BaseModel):
    """
    Consultation structurée — équivalent Pydantic du ConsultationSchema (Zod).

    patientId, transcript, symptoms, diagnosis, medications.
    alerts optionnel (Mini-Vidal / C+ Gardien).
    """

    patientId: str = Field(..., min_length=1, description="Identifiant du patient")
    transcript: str = Field(
        ...,
        min_length=1,
        description="Transcription brute de la consultation (audio ou texte)",
    )
    symptoms: List[str] = Field(
        ...,
        description="Liste des symptômes rapportés par le patient (au moins un)",
    )
    diagnosis: List[DiagnosisModel] = Field(
        ...,
        description="Liste des diagnostics suggérés, CIM-10 si possible (au moins un)",
    )
    medications: List[MedicationModel] = Field(
        default_factory=list,
        description="Liste des médicaments prescrits",
    )
    alerts: Optional[List[str]] = Field(
        default=None,
        description="Alertes de vérification médicamenteuse (optionnel)",
    )
