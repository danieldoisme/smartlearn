"""Shared pytest fixtures for the SmartLearn backend test suite."""

import os
from pathlib import Path

import pytest

# Ensure config import does not fail when GEMINI_API_KEY is absent in CI/local.
os.environ.setdefault("GEMINI_API_KEY", "test-key")

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def vn_pdf_bytes() -> bytes:
    """Raw bytes of the >50-page Vietnamese academic PDF fixture."""
    path = FIXTURES_DIR / "vn_long_document.pdf"
    if not path.exists():
        pytest.skip(f"Missing PDF fixture at {path}")
    return path.read_bytes()
