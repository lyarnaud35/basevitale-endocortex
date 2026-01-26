# Module d'Extraction PDF - BaseVitale V112+

## ✅ **MODULE COMPLÉTÉ ET INTÉGRÉ**

Module complet d'extraction de texte et métadonnées depuis des PDFs médicaux, intégré au système BaseVitale.

---

## 🎯 **FONCTIONNALITÉS**

### Backend NestJS
- ✅ **PDFExtractionService** - Service d'extraction avec support MOCK/LOCAL
- ✅ **PDFExtractionController** - Endpoints REST pour upload et extraction
- ✅ **PDFExtractionModule** - Module complet intégré

### Python Sidecar (AI Cortex)
- ✅ **extract_pdf.py** - Service FastAPI avec PyPDF2 et pdfplumber
- ✅ Extraction texte complète
- ✅ Extraction tables (pdfplumber)
- ✅ Métadonnées PDF
- ✅ Support base64 et upload fichier

---

## 📡 **ENDPOINTS**

### NestJS (Backend)
- **POST** `/pdf-extraction/extract` - Extraction complète (texte + métadonnées + tables)
- **POST** `/pdf-extraction/extract-text` - Extraction texte uniquement

### Python Sidecar
- **POST** `/extract-pdf/extract` - Extraction avec base64
- **POST** `/extract-pdf/extract-file` - Extraction avec upload fichier
- **GET** `/extract-pdf/health` - Health check

---

## 🔧 **UTILISATION**

### Via NestJS
```typescript
// Upload PDF et extraction
const formData = new FormData();
formData.append('pdf', pdfFile);
const result = await fetch('/pdf-extraction/extract', {
  method: 'POST',
  body: formData,
});
```

### Via Python directement
```python
import base64
import requests

with open('document.pdf', 'rb') as f:
    pdf_base64 = base64.b64encode(f.read()).decode('utf-8')

response = requests.post('http://localhost:8000/extract-pdf/extract', json={
    'pdf_base64': pdf_base64,
    'filename': 'document.pdf',
    'extract_tables': True,
})
```

---

## 📦 **DÉPENDANCES**

### Python
- `PyPDF2>=3.0.0` - Extraction basique
- `pdfplumber>=0.10.0` - Extraction avancée (tables)

### NestJS
- `@nestjs/axios` - Communication avec Python sidecar
- `@nestjs/platform-express` - Upload fichiers

---

## 🎯 **INTÉGRATION**

Le module est intégré au système :
- ✅ Ajouté à `AppModule`
- ✅ Disponible pour le module DPI
- ✅ Utilisable pour traitement documents médicaux
- ✅ Support 3 modes (MOCK, CLOUD, LOCAL)

---

**Status** : ✅ **MODULE COMPLÉTÉ ET OPÉRATIONNEL**

---

*Module d'Extraction PDF - BaseVitale V112+*
