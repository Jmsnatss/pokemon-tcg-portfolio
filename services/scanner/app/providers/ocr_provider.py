"""
OCR-based scanner provider.
Uses Tesseract to extract text from card images, then queries the catalog
to find matching cards by name and set.

This is the primary fallback when no image-embedding model is available.
Accuracy is significantly lower than image-based matching.
"""

from typing import Optional
from dataclasses import dataclass, field
from app.models import ScanCandidate, ScanResponse
import logging
import io

logger = logging.getLogger(__name__)


@dataclass
class OCRScanResult:
    candidates: list[ScanCandidate] = field(default_factory=list)
    scan_duration_ms: int = 0
    provider: str = "ocr"
    error: Optional[str] = None


class OCRScannerProvider:
    """
    OCR-based card identification.

    Requires: pytesseract, Pillow, and Tesseract system binary.
    If Tesseract is not installed, falls back gracefully with an error message.
    """

    name = "ocr"
    display_name = "OCR (Tesseract)"

    def __init__(self) -> None:
        self._tesseract_available = self._check_tesseract()

    def _check_tesseract(self) -> bool:
        try:
            import pytesseract  # type: ignore
            pytesseract.get_tesseract_version()
            return True
        except Exception as e:
            logger.warning("Tesseract not available: %s", e)
            return False

    @property
    def is_available(self) -> bool:
        return self._tesseract_available

    async def identify_card(self, image_bytes: bytes, mime_type: str) -> OCRScanResult:
        """
        Attempt to identify a Pokémon card from image bytes using OCR.
        Returns candidates found by text matching against TCGdex.
        """
        if not self._tesseract_available:
            return OCRScanResult(
                candidates=[],
                provider=self.name,
                error=(
                    "Tesseract OCR is not installed on this system. "
                    "Install Tesseract and pytesseract to enable OCR-based scanning. "
                    "Use manual lookup as a fallback."
                ),
            )

        try:
            import pytesseract  # type: ignore
            from PIL import Image  # type: ignore

            image = Image.open(io.BytesIO(image_bytes))

            # Preprocess for better OCR: convert to grayscale
            gray = image.convert("L")

            # Extract text
            text = pytesseract.image_to_string(
                gray,
                config="--psm 6 --oem 3",
            )

            # Parse card name from OCR text — Pokémon names appear prominently
            card_name = self._extract_card_name(text)

            if not card_name:
                return OCRScanResult(
                    candidates=[],
                    provider=self.name,
                    error="Could not extract a card name from the image. Try a clearer photo.",
                )

            # TODO: Query TCGdex for cards matching the extracted name
            # This requires the TCGdex client — will be implemented when the
            # scanner is integrated with the Next.js API in Milestone 4.
            logger.info("OCR extracted name: '%s' — catalog lookup not yet implemented", card_name)

            return OCRScanResult(
                candidates=[],
                provider=self.name,
                error=(
                    f"OCR extracted '{card_name}'. "
                    "Catalog lookup integration pending — Milestone 4."
                ),
            )

        except Exception as e:
            logger.error("OCR scan failed: %s", e)
            return OCRScanResult(
                candidates=[],
                provider=self.name,
                error=f"OCR processing error: {type(e).__name__}",
            )

    def _extract_card_name(self, ocr_text: str) -> Optional[str]:
        """
        Heuristic: the card name is usually the largest/first text block on the card.
        This is a simple approximation; accuracy depends on image quality.
        """
        lines = [line.strip() for line in ocr_text.splitlines() if line.strip()]
        for line in lines:
            # Skip lines that are purely numbers or very short
            if len(line) > 2 and not line.replace(" ", "").isdigit():
                return line
        return None

