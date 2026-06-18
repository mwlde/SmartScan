import io

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from classification_core import classify_document

app = FastAPI(title="SmartScan Document Classifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/classify")
async def classify(file: UploadFile = File(...)):
    data = await file.read()
    image = Image.open(io.BytesIO(data))
    label, confidence = classify_document(image, model_path="document_classifier_v2.pt")
    return {"label": label, "confidence": confidence}
