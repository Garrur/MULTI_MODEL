# 🔴 Multimodal Surveillance Intelligence System

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black.svg?logo=vercel)](https://multi-model-nu.vercel.app/)
[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-blue)](https://huggingface.co/spaces/utkarshluv/sentinel-api)

> **Production-ready AI-powered surveillance platform** — FastAPI · PyTorch · HuggingFace · FAISS · PostgreSQL · Next.js 15

---

## 📐 Architecture Overview

```
multimodal-surveillance-ai/
├── backend/
│   ├── app.py                  # FastAPI main application + lifespan startup
│   ├── config.py               # Centralized settings (pydantic-settings)
│   ├── .env                    # Environment variables (DB URL, secrets)
│   ├── requirements.txt        # All Python dependencies
│   │
│   ├── database/
│   │   ├── session.py          # Async SQLAlchemy engine (NeonDB PostgreSQL)
│   │   ├── models.py           # ORM: Person, Event, IncidentReport
│   │   └── crud.py             # Async CRUD operations
│   │
│   ├── vision/
│   │   ├── detector.py         # DETR person detection (facebook/detr-resnet-50)
│   │   ├── tracker.py          # ByteTrack multi-object tracking
│   │   ├── reid.py             # ViT ReID + FAISS gallery (google/vit-base-patch16-224)
│   │   ├── attributes.py       # CLIP zero-shot attributes (openai/clip-vit-base-patch32)
│   │   └── pipeline.py         # Orchestrated inference pipeline
│   │
│   ├── nlp/
│   │   ├── search.py           # Semantic search (sentence-transformers/all-MiniLM-L6-v2)
│   │   ├── qa.py               # QA (deepset/roberta-base-squad2)
│   │   ├── report.py           # Report gen (google/flan-t5-base)
│   │   └── summarizer.py       # Summarization (facebook/bart-large-cnn)
│   │
│   ├── audio/
│   │   └── audio_module.py     # Whisper ASR + wav2vec2 + SpeechT5 (optional)
│   │
│   ├── graph/
│   │   └── movement_graph.py   # PyTorch Geometric movement graph + anomaly detection
│   │
│   └── routes/
│       ├── vision_routes.py    # POST /process-frame, WebSocket /live-feed
│       └── nlp_routes.py       # GET /search, POST /ask, GET /report/{id}
│
├── frontend/                   # Next.js 15 dashboard
│   ├── app/
│   │   ├── page.tsx            # Dashboard homepage
│   │   ├── live/page.tsx       # Live camera feed (WebSocket)
│   │   ├── search/page.tsx     # Semantic search
│   │   ├── ask/page.tsx        # AI question answering
│   │   ├── reports/page.tsx    # Incident reports
│   │   ├── anomalies/page.tsx  # Movement anomaly alerts
│   │   └── settings/page.tsx   # Endpoints & model info
│   └── components/
│       └── Sidebar.tsx
│
├── benchmarks/
│   ├── fps_benchmark.py        # FPS + latency benchmark (detection/reid/pipeline)
│   └── latency_logger.py       # Live endpoint latency CSV logger
│
└── README.md
```

---

## 🤖 AI Models

| Module | Model | Task |
|--------|-------|------|
| Detection | `facebook/detr-resnet-50` | Person detection (bboxes + scores) |
| Tracking | ByteTrack (built-in) | Multi-object persistent track IDs |
| ReID | `google/vit-base-patch16-224` | Cross-camera re-identification (FAISS) |
| Attributes | `openai/clip-vit-base-patch32` | Zero-shot clothing/age/gender recognition |
| Semantic Search | `sentence-transformers/all-MiniLM-L6-v2` | Embed & search surveillance metadata |
| QA | `deepset/roberta-base-squad2` | Question answering over event logs |
| Reports | `google/flan-t5-base` | Automated structured incident reports |
| Summarizer | `facebook/bart-large-cnn` | Abstractive event summarization |
| ASR (opt.) | `openai/whisper-small` | Audio speech recognition |
| Audio (opt.) | `superb/wav2vec2-base-superb-ks` | Audio event classification |
| TTS (opt.) | `microsoft/speecht5_tts` | Text-to-speech synthesis |

---

## ⚡ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/process-frame` | Submit base64 or multipart frame |
| `GET` | `/api/v1/search?q=...` | Natural language semantic search |
| `POST` | `/api/v1/ask` | QA over surveillance logs |
| `GET` | `/api/v1/report/{person_id}` | Generate incident report |
| `GET` | `/api/v1/anomalies?threshold=0.75` | Movement anomaly detection |
| `GET` | `/api/v1/persons` | List all tracked persons |
| `GET` | `/api/v1/cameras` | Active cameras + FPS |
| `WS` | `/api/v1/live-feed` | Real-time WebSocket stream |
| `GET` | `/health` | System health (CPU/GPU/memory) |
| `GET` | `/docs` | Swagger UI |

---

## 🛠️ Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git
- (Optional) NVIDIA GPU + CUDA 12.x drivers

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd multimodal-surveillance-ai
```

---

### 2. Create Python Virtual Environment

**Windows:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
cd backend
python3.10 -m venv venv
source venv/bin/activate
```

---

### 3. Install PyTorch (GPU / CPU)

> ⚠️ Install PyTorch **before** requirements.txt to ensure correct CUDA version.

**With GPU (CUDA 12.4 — recommended):**
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

**CPU only:**
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

---

### 4. Install Python Requirements

```bash
pip install -r requirements.txt
```

---

### 5. Install FAISS

**GPU (if CUDA available):**
```bash
pip install faiss-gpu
```

**CPU only:**
```bash
pip install faiss-cpu
```

---

### 6. Install PyTorch Geometric (Graph Module)

**GPU (CUDA 12.4):**
```bash
pip install torch-geometric
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv \
    -f https://data.pyg.org/whl/torch-2.4.0+cu124.html
```

**CPU only:**
```bash
pip install torch-geometric
```

---

### 7. Configure Environment Variables

Edit `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://user:password@hostname/dbname?ssl=require
SECRET_KEY=your-secret-key-here
ENABLE_AUDIO=false
DEBUG=false
PORT=8000
```

The NeonDB credentials above are pre-configured and ready to use.

---

### 8. Run the Backend

```bash
cd backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

> 💡 First startup downloads all HuggingFace models (~5-10 GB). Subsequent starts are fast (cached locally in `./model_cache/`).

**Production (no reload):**
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1
```

---

### 9. Setup & Run the Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

### 10. Verify Everything Works

```bash
# Health check
curl http://localhost:8000/health

# Swagger docs
open http://localhost:8000/docs
```

---

## 🧪 Benchmarks

Run from the `benchmarks/` directory (with backend virtualenv active):

```bash
cd benchmarks

# Full benchmark suite (50 frames each)
python fps_benchmark.py --component all --frames 50 --output results.json

# Detection only
python fps_benchmark.py --component detection --frames 100

# Live endpoint latency logging (60 seconds)
python latency_logger.py --duration 60 --interval 2.0 --output latency_log.csv
```

---

## 🗄️ Database Schema

**Table: `persons`**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `first_seen` | DateTime | First detected timestamp |
| `last_seen` | DateTime | Most recent activity |
| `faiss_id` | Integer | FAISS gallery index |
| `attributes` | JSON | CLIP-recognized clothing/gender/age |
| `track_ids` | JSON | All cross-camera track IDs |

**Table: `events`**
| Column | Type | Description |
|--------|------|-------------|
| `event_id` | UUID | Primary key |
| `person_id` | UUID FK | Linked person |
| `camera_id` | String | Source camera |
| `timestamp` | DateTime | Event time |
| `activity_type` | Enum | detected/tracked/reid_match/anomaly/... |
| `bounding_box` | JSON | {x1, y1, x2, y2} |
| `anomaly_score` | Float | Movement anomaly score (0–1) |

**Table: `incident_reports`**
| Column | Type | Description |
|--------|------|-------------|
| `report_id` | UUID | Primary key |
| `person_id` | UUID FK | Subject person |
| `report_text` | Text | AI-generated report |
| `severity` | String | low/medium/high/critical |
| `camera_ids` | JSON | All involved cameras |

---

## 🔄 Process a Frame via API

```python
import httpx, base64
from PIL import Image
from io import BytesIO

# Load your image
img = Image.open("test_frame.jpg")
buf = BytesIO()
img.save(buf, format="JPEG")
b64 = base64.b64encode(buf.getvalue()).decode()

# Submit to pipeline
response = httpx.post("http://localhost:8000/api/v1/process-frame", json={
    "camera_id": "cam-01",
    "image_b64": b64,
    "run_attributes": True,
    "run_reid": True,
    "reid_threshold": 0.85,
})
print(response.json())
```

---

## 🌐 Optional: Nginx Reverse Proxy

`/etc/nginx/sites-available/surveillance`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔧 Optional: PM2 Process Management

```bash
# Install PM2
npm install -g pm2

# Start backend
pm2 start "uvicorn app:app --host 0.0.0.0 --port 8000" --name surveillance-backend

# Start frontend
pm2 start "npm run dev" --name surveillance-frontend --cwd ./frontend

# Save & auto-restart on reboot
pm2 save
pm2 startup
```

---

## 📊 Performance Expectations

| Component | GPU (RTX 3080) | CPU (i9-13900K) |
|-----------|---------------|----------------|
| Detection (DETR) | ~15ms | ~180ms |
| ReID embedding (ViT) | ~8ms | ~95ms |
| CLIP attributes | ~20ms | ~250ms |
| Full pipeline (1 person) | ~50ms (~20 FPS) | ~500ms (~2 FPS) |
| Semantic search (FAISS) | <5ms | <5ms |
| QA (RoBERTa) | ~80ms | ~200ms |

---

## 🧩 Audio Module (Optional)

Enable audio intelligence by setting in `.env`:
```
ENABLE_AUDIO=true
```

Then restart the backend. The audio module will load:
- `openai/whisper-small` — For audio transcription
- `superb/wav2vec2-base-superb-ks` — For sound event classification
- `microsoft/speecht5_tts` — For text-to-speech alerts

---

## 🛡️ Production Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `DEBUG=false`
- [ ] Configure Nginx for SSL/TLS
- [ ] Set up PM2 for auto-restart
- [ ] Schedule FAISS index backups
- [ ] Enable PostgreSQL row-level security
- [ ] Set up log rotation for Loguru logs

---

## 📜 License

MIT License — See `LICENSE` for details.
