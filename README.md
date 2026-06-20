# SmartScan

A mobile document scanner that detects, deskews, and classifies document images using computer vision and deep learning.

## What it does

1. **Scan** — detects the document boundary in a photo, applies a perspective transform, binarises the result into a clean scanned image, and identifies text regions.
2. **Classify** — runs the corrected image through a MobileNetV2 model to label it as one of: `handwritten`, `invoice`, `form`, or `printed_page`.

## Project structure

```
smartscan/
├── backend/            # FastAPI + OpenCV scan service
│   ├── src/            # Core CV modules (Magamed's — do not modify)
│   ├── main.py         # POST /scan entry point
│   ├── requirements.txt
│   └── Dockerfile
├── classifier/         # FastAPI + PyTorch classifier
│   ├── classification_core.py
│   ├── app.py          # POST /classify entry point
│   ├── csci435_version1.ipynb  # training notebook
│   └── requirements.txt
│   # document_classifier_v2.pt goes here — NOT in git, share manually
├── frontend/           # Next.js 15 mobile web app
│   ├── app/            # Pages: home, camera, processing, results, history, saved, settings
│   ├── components/     # BottomNav
│   ├── lib/            # scanStore (in-memory), history (localStorage)
│   └── .env.local      # API URLs — gitignored, create from template below
├── .gitignore
└── README.md
```

---

## Running the demo locally

You need three terminals — one per service. Start them in this order.

### Prerequisites

- **Python 3.9+** — `python3 --version`
- **Node.js 18+** — `node --version` (install via [nodejs.org](https://nodejs.org) or `brew install node`)
- **The model weights file** — `document_classifier_v2.pt` is not in git. Get it from Maria (WeChat / USB) and place it in `classifier/`.

---

### 1 — Backend (CV pipeline) · port 8000

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Check it's running: open [http://localhost:8000/health](http://localhost:8000/health) — should return `{"status":"ok"}`.

---

### 2 — Classifier · port 8001

```bash
cd classifier
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

> **Note:** `torch` and `torchvision` are large (~1 GB). First install will take a few minutes.

Check it's running: [http://localhost:8001/health](http://localhost:8001/health) → `{"status":"ok"}`.

---

### 3 — Frontend · port 3000

```bash
cd frontend
npm install
```

Create `.env.local` (it's gitignored — you have to make it yourself):

```bash
# frontend/.env.local
NEXT_PUBLIC_SCAN_API=http://localhost:8000
NEXT_PUBLIC_CLASSIFY_API=http://localhost:8001
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Camera:** `getUserMedia` requires either `localhost` or HTTPS. It works on `localhost:3000` out of the box. If you want to test on a phone, run `npm run dev -- --hostname 0.0.0.0`, find your laptop IP (`ipconfig`/`ifconfig`), and open `http://<your-ip>:3000` — but you'll need HTTPS for the camera to work on the phone, so just use the "Upload Image" button instead for phone testing.

---

## Common issues

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: cv2` | Make sure you activated the venv before running uvicorn |
| `FileNotFoundError: document_classifier_v2.pt` | Put the weights file in `classifier/` (ask Maria) |
| `npm: command not found` | Install Node.js: `brew install node` |
| Backend returns 500 on large photos | The resize fix is already in `main.py` (max 1000px), but try a smaller image if it still times out |
| Camera doesn't work | Must be on `localhost` — opening via IP address requires HTTPS |

---

## Model weights

`document_classifier_v2.pt` is gitignored. The training notebook is at `classifier/csci435_version1.ipynb` if you need to retrain. To run inference, just place the `.pt` file in `classifier/` before starting the classifier service.
