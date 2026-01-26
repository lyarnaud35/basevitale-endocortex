#!/usr/bin/env python3
"""
Script de test pour vérifier l'intégration AI Cortex
Teste l'endpoint /process-generic avec un schéma de consultation
"""

import json
import requests
import sys

# URL du service
BASE_URL = "http://localhost:8000"

def test_health():
    """Test le health check"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Health check OK: {data}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_process_generic():
    """Test l'endpoint /process-generic avec un schéma de consultation"""
    print("\n🔍 Testing /process-generic endpoint...")
    
    # Schéma JSON Schema pour Consultation (simplifié pour test)
    consultation_schema = {
        "type": "object",
        "properties": {
            "patientId": {
                "type": "string",
                "description": "Identifiant du patient"
            },
            "transcript": {
                "type": "string",
                "description": "Transcription brute de la consultation"
            },
            "symptoms": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Liste des symptômes"
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
                },
                "description": "Liste des diagnostics"
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
                },
                "default": []
            }
        },
        "required": ["patientId", "transcript", "symptoms", "diagnosis"]
    }
    
    # Texte de test
    test_text = "Patient tousse depuis 3 jours, fièvre à 39°C, douleur à la gorge. Diagnostic probable: grippe saisonnière. Prescription: paracétamol 1g, 3 fois par jour pendant 5 jours."
    
    # Requête
    request_data = {
        "text": test_text,
        "schema": consultation_schema,
        "system_prompt": "Tu es un assistant médical qui extrait des informations structurées depuis un texte de consultation.",
        "llm_provider": "openai",  # ou "ollama" si configuré
    }
    
    try:
        print(f"📤 Sending request to {BASE_URL}/process-generic...")
        print(f"   Text length: {len(test_text)} chars")
        print(f"   Schema type: {consultation_schema.get('type')}")
        
        response = requests.post(
            f"{BASE_URL}/process-generic",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=60  # 60s timeout pour LLM
        )
        
        response.raise_for_status()
        data = response.json()
        
        print("\n✅ Response received:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # Vérifier la structure
        if "data" in data:
            result = data["data"]
            required_fields = ["patientId", "transcript", "symptoms", "diagnosis"]
            missing = [f for f in required_fields if f not in result]
            
            if missing:
                print(f"\n⚠️  Missing fields: {missing}")
                return False
            
            print(f"\n✅ All required fields present")
            print(f"   - Symptoms: {len(result.get('symptoms', []))} items")
            print(f"   - Diagnosis: {len(result.get('diagnosis', []))} items")
            print(f"   - Medications: {len(result.get('medications', []))} items")
            
            return True
        else:
            print("❌ Invalid response format: missing 'data' field")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timeout (LLM may be slow)")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"❌ HTTP error: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Response: {e.response.text}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_structure_alias():
    """Test l'endpoint /structure (alias)"""
    print("\n🔍 Testing /structure endpoint (alias)...")
    
    test_schema = {
        "type": "object",
        "properties": {
            "symptoms": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["symptoms"]
    }
    
    request_data = {
        "text": "Patient avec fièvre et toux",
        "json_schema": test_schema
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/structure",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        print("✅ /structure endpoint works")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return True
        
    except Exception as e:
        print(f"❌ /structure endpoint failed: {e}")
        return False

def main():
    """Fonction principale"""
    print("=" * 60)
    print("AI Cortex - Integration Test")
    print("=" * 60)
    
    results = []
    
    # Test 1: Health check
    results.append(("Health Check", test_health()))
    
    # Test 2: Structure alias (plus rapide)
    results.append(("Structure Alias", test_structure_alias()))
    
    # Test 3: Process generic (nécessite LLM)
    print("\n⚠️  Note: This test requires a configured LLM (OpenAI API key or Ollama)")
    skip_llm = "--skip-llm" in sys.argv
    if not skip_llm:
        results.append(("Process Generic", test_process_generic()))
    else:
        print("⏭️  Skipping LLM test (use --skip-llm to skip)")
    
    # Résumé
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
