# SmartScan

A mobile document scanner that detects, deskews, and classifies document images using computer vision and deep learning.

## What it does

1. **Scan** — detects the document boundary in a photo, applies a four-point perspective transform, binarises the result into a clean "scanned" image, and identifies text regions.
2. **Classify** — runs the corrected image through a MobileNetV2 model to label it as one of: `handwritten`, `invoice`, `form`, or `printed_page`.

## Architecture

| Service | Host | Responsibility |
|---------|------|----------------|
| `backend/` | Koyeb | CV pipeline (OpenCV) — `POST /scan` |
| `classifier/` | Hugging Face Spaces | ML classifier (PyTorch) — `POST /classify` |
| `frontend/` | Cloudflare Pages | Vite + React mobile web app |

Data persistence uses **Supabase** (storage + auth).

## Project structure

```
smartscan/
├── backend/                  # FastAPI + OpenCV scan service (Koyeb)
│   ├── src/                  # Core CV modules (unchanged from original)
│   │   ├── scan_pipeline.py
│   │   ├── document_detection.py
│   │   ├── perspective.py
│   │   ├── preprocessing.py
│   │   ├── segmentation.py
│   │   └── utils.py
│   ├── main.py               # FastAPI entry point — POST /scan
│   ├── requirements.txt
│   └── Dockerfile
├── classifier/               # FastAPI + PyTorch classifier (Hugging Face Spaces)
│   ├── classification_core.py
│   ├── document_classifier_v2.pt   # not tracked in git — place here manually
│   ├── app.py                # FastAPI entry point — POST /classify
│   └── requirements.txt
├── frontend/                 # Vite + React app (Cloudflare Pages)
├── .gitignore
└── README.md
```

## Running locally

### Backend (CV pipeline)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`POST http://localhost:8000/scan` — multipart form field `file` = image file.

Returns JSON:
```json
{
  "document_found": true,
  "scan": "<base64-encoded PNG>",
  "regions": [{"x": 0, "y": 0, "w": 100, "h": 50}],
  "timings_ms": {"enhance": 12.3, "detect": 8.1, "warp": 2.0, "binarize": 1.5, "segment": 3.2},
  "total_ms": 27.1
}
```

### Classifier

```bash
cd classifier
# Place document_classifier_v2.pt in this directory first
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

`POST http://localhost:8001/classify` — multipart form field `file` = image file.

Returns JSON:
```json
{"label": "invoice", "confidence": 0.97}
```

## Model weights

`document_classifier_v2.pt` is excluded from git (see `.gitignore`). Place it in `classifier/` before running the classifier service.

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | backend, frontend | Supabase project URL |
| `SUPABASE_KEY` | backend, frontend | Supabase anon or service key |

Copy `.env.example` to `.env` in each service directory and fill in the values.
