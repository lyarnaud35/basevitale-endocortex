#!/bin/bash
# Script de test pour l'endpoint /process-generic du Cortex

set -e

echo "🧪 Test de l'endpoint /process-generic du Cortex"
echo ""

# Test avec un schéma Consultation simplifié
curl -X POST http://localhost:8000/process-generic \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Patient masculin, 30 ans. Présente une toux sèche et de la fièvre à 39 depuis 2 jours. Pas d allergies connues.",
    "schema": {
      "type": "object",
      "properties": {
        "patientId": {"type": "string"},
        "transcript": {"type": "string"},
        "symptoms": {
          "type": "array",
          "items": {"type": "string"}
        },
        "diagnosis": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "code": {"type": "string"},
              "label": {"type": "string"},
              "confidence": {"type": "number", "minimum": 0, "maximum": 1}
            },
            "required": ["code", "label", "confidence"]
          }
        },
        "medications": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "dosage": {"type": "string"},
              "duration": {"type": "string"}
            },
            "required": ["name", "dosage", "duration"]
          }
        }
      },
      "required": ["patientId", "transcript", "symptoms", "diagnosis"]
    }
  }' | python3 -m json.tool 2>/dev/null || cat

echo ""
