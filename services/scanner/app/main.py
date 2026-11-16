"""
PokéVault Scanner Service — FastAPI application entry point.

This service receives Pokémon card images and returns ranked identification
candidates. It does NOT assess card condition or grades.

Supported providers (in priority order):
  1. CardCorpus image matching (requires model weights — research pending)
  2. OCR-assisted catalog lookup (Tesseract, always available as fallback)
  3. Manual lookup (always available)

Run: uvicorn app.main:app --reload
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
import time
import logging

from app.models import ScanResponse, HealthResponse
from app.providers.ocr_provider import OCRScannerProvider
from app.auth import verify_scanner_secret

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PokéVault Scanner Service",
    description="Card image recognition for Pokémon TCG cards",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

# CORS — allow only the Next.js app origin in production
origins = [
    os.environ.get("ALLOWED_ORIGIN", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Scanner-Secret"],
)

# Initialize providers
ocr_provider = OCRScannerProvider()


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check — returns service status and available providers."""
    return HealthResponse(
        status="ok",
        service="pokevault-scanner",
        providers={
            "ocr": ocr_provider.is_available,
            "cardcorpus": False,  # Not yet implemented
        },
    )


@app.post("/scan", response_model=ScanResponse)
async def scan_card(
    file: UploadFile = File(...),
    x_scanner_secret: Optional[str] = Header(None),
) -> ScanResponse:
    """
    Identify a Pokémon card from an uploaded image.

    Returns up to 5 candidate matches ranked by estimated confidence.
    Confidence values are only provided when the underlying model has
    been validated against known ground truth.
    """
    # Authenticate request
    verify_scanner_secret(x_scanner_secret)

    # Validate content type
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. Use JPEG, PNG, or WebP.",
        )

    # Enforce size limit: 10 MB
    max_bytes = 10 * 1024 * 1024
    contents = await file.read(max_bytes + 1)
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB size limit.",
        )

    start_ms = time.time() * 1000

    # Try OCR provider (always available as fallback)
    result = await ocr_provider.identify_card(contents, file.content_type or "image/jpeg")

    duration_ms = int(time.time() * 1000 - start_ms)

    logger.info(
        "Scan complete: provider=%s candidates=%d duration_ms=%d",
        result.provider,
        len(result.candidates),
        duration_ms,
    )

    return ScanResponse(
        candidates=result.candidates,
        scan_duration_ms=duration_ms,
        provider=result.provider,
        error=result.error,
    )
