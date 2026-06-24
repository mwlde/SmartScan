# SmartScan

A mobile document scanner that detects, corrects perspective, and classifies document images using computer vision and deep learning. Built for CSCI435 at the University of Wollongong in Dubai.

**Current version: v0.14**

---

## What it does

1. **Scan** — detects the document boundary in a photo using a five-pass Canny/HSV/Otsu cascade, applies a perspective transform, binarises the result into a clean scan, and identifies text regions.
2. **Classify** — runs the corrected image through a MobileNetV2 model to label it as one of: `handwritten`, `invoice`, `form`, or `printed_page`.
3. **Organise** — stores scan history locally, lets users save and folder-organise results, filter by category, and download scans to device.
4. **Feedback** — after each classification, prompts the user to confirm or correct the predicted label. Responses are stored in Supabase (with `user_id` when signed in, anonymous otherwise) and mirrored to localStorage as a backup.

---

## Project structure

```
smartscan/
├── backend/                    # FastAPI + OpenCV scan pipeline
│   ├── src/
│   │   ├── document_detection.py
│   │   ├── perspective.py
│   │   ├── preprocessing.py
│   │   ├── segmentation.py
│   │   └── scan_pipeline.py
│   ├── main.py                 # POST /scan  (accepts quality: low|medium|high)
│   ├── requirements.txt
│   └── Dockerfile
├── classifier/                 # FastAPI + PyTorch document classifier
│   ├── classification_core.py
│   ├── app.py                  # POST /classify
│   ├── csci435_version1.ipynb  # Training notebook (MobileNetV2, 4 classes)
│   └── requirements.txt
│   # document_classifier_v2.pt — NOT in git, share manually
├── frontend/                   # Next.js 15 mobile web app
│   ├── app/
│   │   ├── page.tsx            # Home screen
│   │   ├── camera/             # Live camera capture
│   │   ├── processing/         # Scan + classify pipeline with step progress
│   │   ├── results/            # Results carousel, stat chips, feedback prompt
│   │   ├── history/            # Full scan log with category filters
│   │   ├── saved/              # Folder-based organiser (All Scans + user folders)
│   │   ├── settings/           # Quality, storage, version history, account
│   │   └── auth/               # Login / Sign Up (Supabase Auth, email + password)
│   ├── components/
│   │   └── BottomNav.tsx       # Fixed bottom navigation
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client singleton
│   │   ├── useAuth.ts          # Auth state hook (user + loading)
│   │   ├── useDogeMode.ts      # Easter egg toggle hook
│   │   ├── scanStore.ts        # In-memory store for current scan result
│   │   ├── history.ts          # Scan history (localStorage, 600px JPEG thumbnails)
│   │   ├── folders.ts          # Folder organisation (localStorage)
│   │   └── feedback.ts         # Feedback log (localStorage + Supabase insert)
│   └── .env.local              # API URLs + Supabase keys — gitignored
├── supabase/
│   └── migrations/
│       └── 20260623120000_create_feedback_table.sql
├── .gitignore
└── README.md
```

---

## Running the demo locally

You need three terminals — one per service. Start them in this order.

### Prerequisites

- **Python 3.9+** — `python3 --version`
- **Node.js 18+** — `node --version`
- **The model weights file** — `document_classifier_v2.pt` is not in git. Get it from Maria and place it in `classifier/`.

---

### 1 — Backend (CV pipeline) · port 8000

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok"}`

---

### 2 — Classifier · port 8001

```bash
cd classifier
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8001
```

> `torch` and `torchvision` are large (~1 GB). First install takes a few minutes.

Health check: [http://localhost:8001/health](http://localhost:8001/health) → `{"status":"ok"}`

---

### 3 — Frontend · port 3000

Create `frontend/.env.local` (gitignored — create manually):

```bash
NEXT_PUBLIC_SCAN_API=http://localhost:8000
NEXT_PUBLIC_CLASSIFY_API=http://localhost:8001
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Then:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Camera on phone:** `getUserMedia` requires HTTPS outside of localhost. Use `npm run dev -- --hostname 0.0.0.0` and open `http://<your-laptop-ip>:3000` on your phone, but the camera button won't work without HTTPS — use "Upload Image" for phone testing instead.

---

## Supabase setup

The app uses Supabase for:
- **Feedback storage** — classification feedback is inserted into the `feedback` table
- **Authentication** — optional email + password login (Supabase Auth)

To apply the database migration, run:

```bash
supabase db push
```

Or paste `supabase/migrations/20260623120000_create_feedback_table.sql` into the Supabase dashboard SQL editor.

Users are **not required to log in** — all features (scan, classify, history, folders, feedback) work fully as a guest. When signed in, `user_id` is attached to feedback rows. When not signed in, `user_id` is `null`.

---

## Model weights

`document_classifier_v2.pt` is gitignored. The training notebook is at `classifier/csci435_version1.ipynb`. Place the `.pt` file in `classifier/` before starting the classifier service.

The training pipeline uses MobileNetV2 with augmentation: random flips, rotation, colour jitter, affine shear, Gaussian blur, and random erasing — tuned to simulate real-world handheld document photos.

---

## Version history

| Version | Feature |
|---------|---------|
| v0.14 | Removed deskew step from CV pipeline — perspective correction already produces near-straight output |
| v0.13 | Upload security hardening on /scan and /classify: MIME + magic-byte validation, 10 MB size limit, dimension cap, generic error responses |
| v0.12 | Optional Supabase Auth (email + password, guest-first); CHECK constraints on feedback label columns |
| v0.11 | Classification feedback prompt (Supabase + localStorage dual-write) |
| v0.10 | Folder system in Saved screen, All Scans default folder |
| v0.9  | Default scan quality setting (Low / Medium / High) |
| v0.8  | Category filters, Save to Device, improved thumbnails |
| v0.7  | Deskewing step in CV pipeline |
| v0.6  | Local scan history and Settings screen |
| v0.5  | Region segmentation overlay |
| v0.4  | Document classifier (MobileNetV2) |
| v0.3  | Perspective transform + binarisation |
| v0.2  | Document boundary detection |
| v0.1  | Initial scaffold |
