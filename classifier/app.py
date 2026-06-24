import io
import logging

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image

from classification_core import classify_document

log = logging.getLogger("smartscan.classifier")

app = FastAPI(title="SmartScan Document Classifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Upload guardrails ──────────────────────────────────────────────────────────

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png"})
MAX_FILE_BYTES = 10 * 1024 * 1024   # 10 MB
MAX_DIMENSION  = 10_000             # px per side

_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff",       "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
]


def _check_magic(data: bytes) -> bool:
    return any(data[:len(sig)] == sig for sig, _ in _MAGIC)


def _validate_upload(data: bytes, content_type: str | None) -> JSONResponse | None:
    if len(data) > MAX_FILE_BYTES:
        return JSONResponse(status_code=413, content={"error": "File too large. Maximum is 10 MB."})
    if content_type not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(status_code=415, content={"error": "Only JPEG and PNG images are accepted."})
    if not _check_magic(data):
        return JSONResponse(status_code=415, content={"error": "File content does not match a recognised image format."})
    return None


# ── /health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── /classify ──────────────────────────────────────────────────────────────────

@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    data = await file.read()

    err = _validate_upload(data, file.content_type)
    if err:
        return err

    try:
        image = Image.open(io.BytesIO(data))
        w, h = image.size  # reads header only — no full pixel decode yet
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Could not decode image."})

    if w > MAX_DIMENSION or h > MAX_DIMENSION:
        return JSONResponse(
            status_code=400,
            content={"error": f"Image dimensions too large. Maximum is {MAX_DIMENSION}×{MAX_DIMENSION} px."},
        )

    try:
        label, confidence = classify_document(image, model_path="document_classifier_v2.pt")
        return {"label": label, "confidence": confidence}
    except Exception:
        log.exception("classify_document raised an unhandled error")
        return JSONResponse(status_code=500, content={"error": "Classification failed."})
