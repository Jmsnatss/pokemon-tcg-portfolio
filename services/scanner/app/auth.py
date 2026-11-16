"""
Request authentication for the scanner service.
Validates the shared secret set via SCANNER_API_SECRET environment variable.
If SCANNER_API_SECRET is not set, auth is effectively disabled (development mode only).
"""

import os
import secrets
from fastapi import HTTPException
from typing import Optional


def verify_scanner_secret(provided_secret: Optional[str]) -> None:
    """
    Verify the X-Scanner-Secret header.
    Raises HTTPException 401 if the secret is configured but does not match.
    """
    expected = os.environ.get("SCANNER_API_SECRET")

    if not expected:
        # Auth not configured — development mode
        return

    if not provided_secret or not secrets.compare_digest(provided_secret, expected):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing scanner authentication secret.",
        )

