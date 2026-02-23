"""
app.py - Main FastAPI Application Entry Point
Multimodal Surveillance Intelligence System
Run with: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""
import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger
import psutil
import os

from config import settings, DEVICE

# ── Global Singletons (initialized on startup) ────────────────────────────────
vision_pipeline = None
search_engine = None
qa_system = None
report_generator = None
summarizer = None
movement_graph = None
audio_asr = None
audio_classifier = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    global vision_pipeline, search_engine, qa_system, report_generator
    global summarizer, movement_graph, audio_asr, audio_classifier

    logger.info("=" * 60)
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Device: {DEVICE}")
    logger.info("=" * 60)

    # 1. Initialize database tables
    logger.info("📦 Initializing database...")
    from database.session import create_tables
    await create_tables()

    # 2. Load Vision Pipeline
    logger.info("🎥 Loading Vision Pipeline...")
    from vision.pipeline import VisionPipeline
    vision_pipeline = VisionPipeline()

    # 3. Load NLP Components
    logger.info("💬 Loading NLP: Semantic Search...")
    from nlp.search import SemanticSearchEngine
    search_engine = SemanticSearchEngine()

    logger.info("❓ Loading NLP: QA System...")
    from nlp.qa import SurveillanceQA
    qa_system = SurveillanceQA()

    logger.info("📝 Loading NLP: Report Generator...")
    from nlp.report import IncidentReportGenerator
    report_generator = IncidentReportGenerator()

    logger.info("📋 Loading NLP: Summarizer...")
    from nlp.summarizer import SurveillanceSummarizer
    summarizer = SurveillanceSummarizer()

    # 4. Load Graph Module
    logger.info("🕸️  Initializing Movement Graph...")
    from graph.movement_graph import MovementGraph
    movement_graph = MovementGraph()

    # 5. Load Audio (optional)
    if settings.ENABLE_AUDIO:
        logger.info("🎙️  Loading Audio Module...")
        from audio.audio_module import WhisperASR, AudioClassifier
        audio_asr = WhisperASR()
        audio_classifier = AudioClassifier()

    logger.info("✅ All components loaded successfully!")
    logger.info(f"📊 Memory usage: {psutil.Process().memory_info().rss / 1e6:.1f} MB")

    yield  # App is running

    # Shutdown
    logger.info("🛑 Shutting down Surveillance System...")


# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    **Multimodal Surveillance Intelligence System**

    Capabilities:
    - 🎥 Real-time multi-camera video processing
    - 👤 Person detection (DETR) + Multi-object tracking (ByteTrack)
    - 🔍 Cross-camera Re-Identification (ViT + FAISS)
    - 👗 Clothing/attribute recognition (CLIP zero-shot)
    - 💬 Semantic search over surveillance logs
    - ❓ Natural language Q&A over events
    - 📝 Automated incident report generation
    - 🕸️ Movement graph anomaly detection
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request Latency Logging Middleware ─────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    latency = (time.perf_counter() - t0) * 1000
    logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({latency:.1f}ms)")
    response.headers["X-Process-Time-Ms"] = f"{latency:.2f}"
    return response

# ── Register Routers ───────────────────────────────────────────────────────────

from routes.vision_routes import router as vision_router
from routes.nlp_routes import router as nlp_router

app.include_router(vision_router)
app.include_router(nlp_router)

# ── Static Files ───────────────────────────────────────────────────────────────

# Create static directory if it doesn't exist
os.makedirs("static/thumbnails", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Health & Status Routes ─────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "device": str(DEVICE),
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    mem = psutil.Process().memory_info().rss / 1e6
    cpu = psutil.cpu_percent(interval=0.1)
    import torch
    gpu_info = {}
    if torch.cuda.is_available():
        gpu_info = {
            "name": torch.cuda.get_device_name(0),
            "memory_allocated_mb": round(torch.cuda.memory_allocated(0) / 1e6, 1),
            "memory_reserved_mb": round(torch.cuda.memory_reserved(0) / 1e6, 1),
        }
    return {
        "status": "healthy",
        "device": str(DEVICE),
        "memory_mb": round(mem, 1),
        "cpu_percent": cpu,
        "gpu": gpu_info,
        "models_loaded": {
            "vision_pipeline": vision_pipeline is not None,
            "search_engine": search_engine is not None,
            "qa_system": qa_system is not None,
            "report_generator": report_generator is not None,
            "summarizer": summarizer is not None,
            "movement_graph": movement_graph is not None,
            "audio": audio_asr is not None,
        },
    }


@app.get("/metrics", tags=["Health"])
async def prometheus_metrics():
    """Basic Prometheus-style metrics."""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from starlette.responses import Response
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1,  # 1 worker required for shared model singletons
        log_level="info",
    )
