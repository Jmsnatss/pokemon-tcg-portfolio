"""Pydantic models for the scanner service API."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class ScanCandidate(BaseModel):
    card_provider_id: str = Field(description="TCGdex card ID, e.g. 'swsh1-1'")
    card_name: str
    set_name: str
    collector_number: str
    confidence: Optional[float] = Field(
        default=None,
        description="Confidence score 0–1 when calibrated; null otherwise",
        ge=0.0,
        le=1.0,
    )
    image_url: Optional[str] = None
    rank: int = Field(ge=1, description="Rank among candidates, 1 = best")


class ScanResponse(BaseModel):
    candidates: List[ScanCandidate]
    scan_duration_ms: int
    provider: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    providers: Dict[str, bool]
