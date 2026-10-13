"""Load the YAML knowledge base the assistant answers from."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_PROJECTS_FILE = "projects.yaml"


@dataclass(frozen=True, slots=True)
class Knowledge:
    """Knowledge base rendered for the prompt, plus the project ids it defines."""

    context: str
    project_ids: frozenset[str]


def load_knowledge(directory: Path) -> Knowledge:
    """Read every YAML file in ``directory`` into one prompt-ready block.

    Args:
        directory: Folder with the knowledge ``*.yaml`` files.

    Returns:
        Knowledge: Rendered context and the set of valid project ids.

    Raises:
        ValueError: If the folder has no files, or a project is missing its id.
    """
    documents: dict[str, Any] = {}
    for path in sorted(directory.glob("*.yaml")):
        documents[path.stem] = yaml.safe_load(path.read_text(encoding="utf-8"))

    if not documents:
        raise ValueError(f"No knowledge files found in {directory}")

    projects = (documents.get(Path(_PROJECTS_FILE).stem) or {}).get("projects") or []
    project_ids = [project.get("id") for project in projects]
    if not all(project_ids):
        raise ValueError(f"Every project in {_PROJECTS_FILE} needs an id")
    if len(set(project_ids)) != len(project_ids):
        raise ValueError(f"Duplicate project ids in {_PROJECTS_FILE}")

    context = yaml.safe_dump(documents, allow_unicode=True, sort_keys=False, width=1000)
    return Knowledge(context=context, project_ids=frozenset(project_ids))
