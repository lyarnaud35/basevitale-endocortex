"""
Module d'extraction de texte et métadonnées depuis des PDFs médicaux
Pour BaseVitale AI Cortex
"""
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import base64
import io
import PyPDF2
import pdfplumber
from datetime import datetime

app = FastAPI()

class PDFExtractRequest(BaseModel):
    """Requête d'extraction PDF"""
    pdf_base64: str  # PDF encodé en base64
    filename: Optional[str] = None
    extract_images: Optional[bool] = False
    extract_tables: Optional[bool] = True

class PDFExtractResponse(BaseModel):
    """Réponse d'extraction PDF"""
    text: str
    pages: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    tables: Optional[List[Dict[str, Any]]] = None
    images_count: int = 0
    extraction_date: str

def extract_text_pypdf2(pdf_file: io.BytesIO) -> tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
    """Extraction avec PyPDF2 (basique)"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        pages = []
        metadata = {}
        
        # Métadonnées
        if pdf_reader.metadata:
            metadata = {
                "title": pdf_reader.metadata.get("/Title", ""),
                "author": pdf_reader.metadata.get("/Author", ""),
                "subject": pdf_reader.metadata.get("/Subject", ""),
                "creator": pdf_reader.metadata.get("/Creator", ""),
                "producer": pdf_reader.metadata.get("/Producer", ""),
                "creation_date": str(pdf_reader.metadata.get("/CreationDate", "")),
                "modification_date": str(pdf_reader.metadata.get("/ModDate", "")),
            }
        
        metadata["total_pages"] = len(pdf_reader.pages)
        
        # Extraction texte par page
        for page_num, page in enumerate(pdf_reader.pages, 1):
            page_text = page.extract_text()
            text += f"\n\n--- Page {page_num} ---\n\n{page_text}"
            
            pages.append({
                "page_number": page_num,
                "text": page_text,
                "char_count": len(page_text),
            })
        
        return text, pages, metadata
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur PyPDF2: {str(e)}"
        )

def extract_text_pdfplumber(pdf_file: io.BytesIO, extract_tables: bool = True) -> tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Extraction avec pdfplumber (avancé, meilleur pour tables)"""
    try:
        pdf = pdfplumber.open(pdf_file)
        
        text = ""
        pages = []
        tables = []
        
        for page_num, page in enumerate(pdf.pages, 1):
            page_text = page.extract_text() or ""
            text += f"\n\n--- Page {page_num} ---\n\n{page_text}"
            
            page_data = {
                "page_number": page_num,
                "text": page_text,
                "char_count": len(page_text),
            }
            
            # Extraire les tables si demandé
            if extract_tables:
                page_tables = page.extract_tables()
                if page_tables:
                    page_data["tables_count"] = len(page_tables)
                    for table_idx, table in enumerate(page_tables):
                        tables.append({
                            "page": page_num,
                            "table_index": table_idx,
                            "rows": table,
                            "row_count": len(table),
                            "col_count": len(table[0]) if table else 0,
                        })
            
            pages.append(page_data)
        
        pdf.close()
        return text, pages, tables
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur pdfplumber: {str(e)}"
        )

@router.post("/extract", response_model=PDFExtractResponse)
async def extract_pdf(request: PDFExtractRequest) -> PDFExtractResponse:
    """
    Extraire le texte et les métadonnées d'un PDF
    
    Args:
        request: Requête avec PDF en base64
        
    Returns:
        Texte extrait, pages, métadonnées et tables (si demandées)
    """
    try:
        # Décoder le PDF base64
        pdf_data = base64.b64decode(request.pdf_base64)
        pdf_file_pypdf2 = io.BytesIO(pdf_data)
        pdf_file_pdfplumber = io.BytesIO(pdf_data)
        
        # Extraction avec PyPDF2 (métadonnées)
        text_pypdf2, pages_pypdf2, metadata = extract_text_pypdf2(pdf_file_pypdf2)
        
        # Extraction avec pdfplumber (meilleur pour texte et tables)
        text_plumber, pages_plumber, tables = extract_text_pdfplumber(
            pdf_file_pdfplumber,
            extract_tables=request.extract_tables
        )
        
        # Utiliser le meilleur texte (pdfplumber généralement meilleur)
        final_text = text_plumber if len(text_plumber.strip()) > len(text_pypdf2.strip()) else text_pypdf2
        final_pages = pages_plumber if len(pages_plumber) > 0 else pages_pypdf2
        
        # Ajouter métadonnées
        metadata["filename"] = request.filename or "unknown.pdf"
        metadata["extraction_date"] = datetime.utcnow().isoformat()
        metadata["text_length"] = len(final_text)
        metadata["pages_count"] = len(final_pages)
        metadata["tables_count"] = len(tables) if tables else 0
        
        return PDFExtractResponse(
            text=final_text,
            pages=final_pages,
            metadata=metadata,
            tables=tables if request.extract_tables and tables else None,
            images_count=0,  # TODO: Implémenter extraction images
            extraction_date=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'extraction PDF: {str(e)}"
        )

@app.post("/extract-file")
async def extract_pdf_file(
    file: UploadFile = File(...),
    extract_tables: bool = True,
):
    """
    Extraire depuis un fichier uploadé (alternative à base64)
    """
    try:
        pdf_data = await file.read()
        
        # Créer la requête
        request = PDFExtractRequest(
            pdf_base64=base64.b64encode(pdf_data).decode('utf-8'),
            filename=file.filename,
            extract_tables=extract_tables,
        )
        
        # Utiliser la même logique
        return await extract_pdf(request)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'extraction PDF: {str(e)}"
        )

@router.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "service": "extract-pdf"}
