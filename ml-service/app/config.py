"""
Environment-driven configuration.

Values are loaded from a local `.env` file (via pydantic-settings) and can be
overridden by real environment variables. `get_settings()` is cached so the
whole process shares one immutable Settings instance.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent  # ml-service/


class Settings(BaseSettings):
    """Runtime settings for the ML service."""

    env: str = Field(default="development")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000, ge=1, le=65535)

    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:5000"]
    )

    model_dir: Path = Field(
        default=BASE_DIR / "models"
    )

    model_version: str = Field(
        default=""
    )

    prediction_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0
    )

    # Training-time knobs
    train_dataset_size: int = Field(
        default=50_000,
        ge=1_000
    )

    train_fraud_rate: float = Field(
        default=0.08,
        ge=0.001,
        le=0.5
    )

    train_random_seed: int = Field(
        default=42,
        ge=0
    )

    train_test_split: float = Field(
        default=0.2,
        ge=0.05,
        le=0.5
    )

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",

        # Prevent Pydantic v2 from treating fields such as
        # model_dir and model_version as protected namespace conflicts.
        protected_namespaces=(),
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value):
        """Accept either a JSON list or comma-separated string."""

        if value is None or value == "":
            return ["http://localhost:5000"]

        if isinstance(value, str):
            parts = [
                item.strip()
                for item in value.split(",")
                if item.strip()
            ]

            return parts or ["http://localhost:5000"]

        return value

    @field_validator("model_dir", mode="after")
    @classmethod
    def _resolve_model_dir(cls, value: Path) -> Path:
        if not value.is_absolute():
            value = (BASE_DIR / value).resolve()

        value.mkdir(
            parents=True,
            exist_ok=True
        )

        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor."""

    return Settings()