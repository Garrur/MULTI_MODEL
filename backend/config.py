"""
config.py - Central configuration for Multimodal Surveillance Intelligence System
"""
import os
import torch
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field
from loguru import logger


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────
    APP_NAME: str = "Multimodal Surveillance Intelligence System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Database (NeonDB PostgreSQL) ───────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@hostname/dbname?ssl=require",
        description="Database connection URL"
    )
    DB_ECHO: bool = False

    # ── Security ───────────────────────────────────────────
    SECRET_KEY: str = Field(default="change-in-production-super-secret-key", env="SECRET_KEY")
    API_KEY: str = Field(default="surveillance-api-key-2024", env="API_KEY")

    # ── Model Paths / Cache ───────────────────────────────
    MODEL_CACHE_DIR: str = Field(default="./model_cache", env="HF_HOME")

    # ── Vision Models ─────────────────────────────────────
    DETECTION_MODEL: str = "facebook/detr-resnet-50"
    REID_MODEL: str = "google/vit-base-patch16-224"
    CLIP_MODEL: str = "openai/clip-vit-base-patch32"
    DETECTION_CONFIDENCE: float = 0.7
    DETECTION_BATCH_SIZE: int = 4

    # ── NLP Models ────────────────────────────────────────
    SEMANTIC_SEARCH_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    QA_MODEL: str = "deepset/roberta-base-squad2"
    REPORT_MODEL: str = "google/flan-t5-base"
    SUMMARIZER_MODEL: str = "facebook/bart-large-cnn"

    # ── Audio Models (Optional) ───────────────────────────
    WHISPER_MODEL: str = "openai/whisper-small"
    AUDIO_CLASS_MODEL: str = "superb/wav2vec2-base-superb-ks"
    TTS_MODEL: str = "microsoft/speecht5_tts"
    ENABLE_AUDIO: bool = False

    # ── FAISS ─────────────────────────────────────────────
    FAISS_INDEX_PATH: str = "./faiss_indexes"
    REID_EMBEDDING_DIM: int = 768   # ViT-base hidden size
    CLIP_EMBEDDING_DIM: int = 512   # CLIP embedding size
    SEARCH_EMBEDDING_DIM: int = 384  # MiniLM embedding size
    FAISS_NPROBE: int = 10

    # ── Tracking ──────────────────────────────────────────
    TRACKER_TYPE: str = "bytetrack"   # "bytetrack" or "deepsort"
    TRACK_THRESH: float = 0.5
    TRACK_BUFFER: int = 30
    MATCH_THRESH: float = 0.8

    # ── WebSocket / Cameras ───────────────────────────────
    MAX_CAMERAS: int = 16
    FRAME_QUEUE_SIZE: int = 30
    FPS_TARGET: int = 30

    # ── Anomaly Detection ─────────────────────────────────
    ANOMALY_THRESHOLD: float = 0.75

    # ── CORS ──────────────────────────────────────────────
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()

# ── Device Detection ──────────────────────────────────────────
def get_device() -> torch.device:
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"🚀 GPU detected: {torch.cuda.get_device_name(0)} | VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    else:
        device = torch.device("cpu")
        logger.warning("⚠️  No GPU detected — running on CPU. Performance may be degraded.")
    return device


DEVICE = get_device()

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
FAISS_DIR = BASE_DIR / settings.FAISS_INDEX_PATH
MODEL_CACHE = BASE_DIR / settings.MODEL_CACHE_DIR
FAISS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE.mkdir(parents=True, exist_ok=True)

# Set HuggingFace cache
os.environ["HF_HOME"] = str(MODEL_CACHE)
os.environ["TRANSFORMERS_CACHE"] = str(MODEL_CACHE)
