"""The knowledge base loads and stays in sync with the frontend project keys."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from app.config import BACKEND_ROOT
from app.knowledge import load_knowledge

KNOWLEDGE_DIR = BACKEND_ROOT / "knowledge"
FRONTEND_PROJECTS = BACKEND_ROOT.parent / "src" / "environment" / "data" / "projects.js"


def test_knowledge_loads_every_file() -> None:
    knowledge = load_knowledge(KNOWLEDGE_DIR)

    assert knowledge.project_ids
    for section in ("profile", "experience", "skills", "projects"):
        assert f"{section}:" in knowledge.context


def test_empty_folder_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        load_knowledge(tmp_path)


def test_duplicate_project_ids_are_rejected(tmp_path: Path) -> None:
    (tmp_path / "projects.yaml").write_text(
        "projects:\n  - id: a\n  - id: a\n", encoding="utf-8"
    )
    with pytest.raises(ValueError):
        load_knowledge(tmp_path)


@pytest.mark.skipif(not FRONTEND_PROJECTS.exists(), reason="frontend sources not available")
def test_project_ids_match_frontend_keys() -> None:
    """A card only renders when its id is a key of the frontend projects object."""
    source = FRONTEND_PROJECTS.read_text(encoding="utf-8")
    frontend_keys = set(re.findall(r"^ {4}(\w+): \{", source, flags=re.MULTILINE))

    assert load_knowledge(KNOWLEDGE_DIR).project_ids == frontend_keys
