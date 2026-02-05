'use client';

import React from 'react';
import type { ConsultationAnalysis } from '../types/consultation-result';
import { useScribeLogic } from '../hooks/useScribeLogic';
import { MedicalScribeUI, type ScribeTheme } from './MedicalScribeUI';
import { cn } from '../utils/cn';

/**
 * Contrat strict du widget (Symbiote Protocol).
 * Aucune dépendance globale : état et config passés par props.
 */
export interface MedicalScribeProps {
  /** Token pour l'auth API (Bearer). Fourni par l'hôte. */
  token: string;
  /** Identifiant patient (externalPatientId). */
  patientId: string;
  /** URL du backend (ex. http://localhost:3001 ou http://localhost:3001/api). */
  backendUrl: string;
  /** Thème visuel. Optionnel, défaut: light. */
  theme?: ScribeTheme;

  /** Callback après validation finale. Reçoit draftId + consultation. */
  onComplete: (data: ConsultationAnalysis) => void;
  /** Callback annulation. Optionnel. */
  onCancel?: () => void;
  /** Afficher le panneau Intelligence. Défaut: true. */
  showIntelligence?: boolean;
  /** ClassName racine (fusionnée avec cn pour isolation). */
  className?: string;
}

/**
 * MedicalScribe – Widget autonome, isolé, robuste.
 *
 * Architecture headless :
 * - useScribeLogic : toute la logique (state, API, reconnaissance vocale).
 * - MedicalScribeUI : UI pure, sans état métier.
 * Ben peut remplacer l’UI en conservant useScribeLogic.
 *
 * Zéro dépendance globale (pas de useContext/Redux de l’app hôte).
 */
export function MedicalScribe({
  token,
  patientId,
  backendUrl,
  theme = 'light',
  onComplete,
  onCancel = () => {},
  showIntelligence = true,
  className,
}: MedicalScribeProps) {
  const logic = useScribeLogic({
    backendUrl,
    token,
    patientId,
    onComplete,
    onCancel,
  });

  return (
    <div className={cn(className)}>
      <MedicalScribeUI
        logic={logic}
        theme={theme}
        showIntelligence={showIntelligence}
      />
    </div>
  );
}

export default MedicalScribe;
