#!/usr/bin/env python3
# retraining script for the core 4-class document classifier
# takes confirmed misclassifications from corrections/ (populated by export_corrections.py)
# and injects them into the training split only, then continues training from v2 weights
#
# usage:
#   python retrain_classifier.py
#   python retrain_classifier.py --dry-run
#   python retrain_classifier.py --senju-path /path/to/senju14 --suvroo-path /path/to/suvroo
#
# default paths assume you run this from backend/scripts/ or backend/
# corrections go to training only — val and test remain the original dataset, unmodified
# output is document_classifier_v3.pt, v2 is never overwritten

import argparse
import collections
import pathlib
import random
import sys
import time

import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms

# 𓆝 𓆟 𓆞 𓆟 𓆝 config — mirrors notebook exactly

CLASSES      = ['handwritten', 'invoice', 'form', 'printed_page']
CLASS_TO_IDX = {cls: i for i, cls in enumerate(CLASSES)}
IMG_SIZE     = 224
BATCH_SIZE   = 32
DEFAULT_EPOCHS = 10

# senju14 folder name -> our class name (matches notebook)
SENJU_MAP = {'handwritten': 'document', 'invoice': 'invoice', 'form': 'form'}

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.tif', '.tiff'}

# 𓆝 𓆟 𓆞 𓆟 𓆝 transforms — exact copies from csci435_version1.ipynb

TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.4, contrast=0.4),
    transforms.RandomAffine(degrees=0, shear=5, scale=(0.9, 1.1)),
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
    transforms.ToTensor(),
    transforms.RandomErasing(p=0.1, scale=(0.02, 0.08)),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

EVAL_TRANSFORM = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# 𓆝 𓆟 𓆞 𓆟 𓆝 dataset

class DocumentDataset(Dataset):
    def __init__(self, samples: list, transform=None):
        self.samples   = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        image = Image.open(path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, label


# 𓆝 𓆟 𓆞 𓆟 𓆝 data loading

def _image_files(folder: pathlib.Path) -> list[pathlib.Path]:
    return [p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS]


def load_split_samples(dataset_path: str, folder_name: str, label: int, split: str) -> list:
    img_dir = pathlib.Path(dataset_path) / folder_name / split / 'images'
    if not img_dir.exists():
        return []
    return [(str(p), label) for p in _image_files(img_dir)]


def load_flat_samples(folder_path: str, label: int, seed: int = 42) -> dict:
    # suvroo has no pre-made splits so we mirror the notebook's 80/10/10
    all_files = sorted(str(p) for p in _image_files(pathlib.Path(folder_path)))
    random.seed(seed)
    random.shuffle(all_files)
    n       = len(all_files)
    n_train = int(n * 0.80)
    n_val   = int(n * 0.10)
    return {
        'train': [(p, label) for p in all_files[:n_train]],
        'val':   [(p, label) for p in all_files[n_train:n_train + n_val]],
        'test':  [(p, label) for p in all_files[n_train + n_val:]],
    }


def load_corrections(corrections_root: pathlib.Path) -> list:
    samples = []
    for label, idx in CLASS_TO_IDX.items():
        folder = corrections_root / label
        if not folder.exists():
            continue
        for p in _image_files(folder):
            samples.append((str(p), idx))
    return samples


def resolve_dataset_paths(args) -> tuple:
    senju_path  = args.senju_path
    suvroo_path = args.suvroo_path
    if senju_path and suvroo_path:
        return senju_path, suvroo_path
    try:
        import kagglehub
    except ImportError:
        print(
            "error: kagglehub not installed and --senju-path / --suvroo-path not provided.\n"
            "install it with:  pip install kagglehub\n"
            "or pass local paths directly.",
            file=sys.stderr,
        )
        sys.exit(1)
    if not senju_path:
        print("downloading senju14 via kagglehub (cached after first run)...")
        senju_path = kagglehub.dataset_download("senju14/ocr-dataset-of-multi-type-documents")
        print(f"senju14: {senju_path}")
    if not suvroo_path:
        print("downloading suvroo via kagglehub (cached after first run)...")
        suvroo_path = kagglehub.dataset_download("suvroo/scanned-images-dataset-for-ocr-and-vlm-finetuning")
        print(f"suvroo:  {suvroo_path}")
    return senju_path, suvroo_path


def build_original_splits(senju_path: str, suvroo_path: str) -> dict:
    splits = {'train': [], 'val': [], 'test': []}
    for class_name, folder_name in SENJU_MAP.items():
        for split in ['train', 'val', 'test']:
            splits[split] += load_split_samples(
                senju_path, folder_name, CLASS_TO_IDX[class_name], split
            )
    printed_splits = load_flat_samples(
        str(pathlib.Path(suvroo_path) / 'dataset' / 'Report'),
        label=CLASS_TO_IDX['printed_page'],
    )
    for split in ['train', 'val', 'test']:
        splits[split] += printed_splits[split]
    return splits


# 𓆝 𓆟 𓆞 𓆟 𓆝 model helpers

def build_model(model_path: pathlib.Path, device: torch.device) -> nn.Module:
    m = models.mobilenet_v2(weights=None)
    m.classifier = nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(m.last_channel, len(CLASSES)),
    )
    m.load_state_dict(torch.load(model_path, map_location=device))
    return m.to(device)


# 𓆝 𓆟 𓆞 𓆟 𓆝 evaluation

def evaluate(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple:
    model.eval()
    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in loader:
            _, predicted = model(images.to(device)).max(1)
            all_preds.extend(predicted.cpu().tolist())
            all_labels.extend(labels.tolist())

    overall_acc = 100.0 * sum(p == l for p, l in zip(all_preds, all_labels)) / len(all_labels)

    per_class = {}
    for cls, idx in CLASS_TO_IDX.items():
        correct   = sum(p == idx and l == idx for p, l in zip(all_preds, all_labels))
        total_cls = sum(l == idx for l in all_labels)
        per_class[cls] = {
            'correct': correct,
            'total':   total_cls,
            'acc':     100.0 * correct / total_cls if total_cls else 0.0,
        }
    return overall_acc, per_class


# 𓆝 𓆟 𓆞 𓆟 𓆝 training

def run_train_epoch(model, loader, criterion, optimizer, device, epoch, total_epochs) -> float:
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for batch_idx, (images, labels) in enumerate(loader):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss    = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total   += labels.size(0)
        if (batch_idx + 1) % 10 == 0 or (batch_idx + 1) == len(loader):
            print(
                f"  epoch {epoch}/{total_epochs}  batch {batch_idx+1}/{len(loader)}"
                f"  loss: {loss.item():.4f}  running acc: {100.*correct/total:.1f}%"
            )
    return 100.0 * correct / total


def run_val_epoch(model, loader, device) -> float:
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            _, predicted = model(images).max(1)
            correct += predicted.eq(labels).sum().item()
            total   += labels.size(0)
    return 100.0 * correct / total


# 𓆝 𓆟 𓆞 𓆟 𓆝 main

def main():
    script_dir = pathlib.Path(__file__).parent        # backend/scripts/
    backend    = script_dir.parent                    # backend/
    repo_root  = backend.parent                       # SmartScan/

    parser = argparse.ArgumentParser(
        description="retrain the 4-class classifier with correction images",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "run export_corrections.py first to populate the corrections/ folder.\n"
            "corrections are added to training only — val and test stay untouched.\n"
            "output is document_classifier_v3.pt; v2 is never overwritten."
        ),
    )
    parser.add_argument(
        '--model',
        default=str(repo_root / 'classifier' / 'document_classifier_v2.pt'),
        help='path to document_classifier_v2.pt (default: ../../classifier/document_classifier_v2.pt)',
    )
    parser.add_argument(
        '--corrections',
        default=str(backend / 'corrections'),
        help='path to corrections/ folder (default: ../corrections)',
    )
    parser.add_argument(
        '--output',
        default=str(repo_root / 'classifier' / 'document_classifier_v3.pt'),
        help='where to save the retrained model (default: ../../classifier/document_classifier_v3.pt)',
    )
    parser.add_argument(
        '--senju-path',
        default=None,
        help='local path to senju14 dataset root; downloaded via kagglehub if omitted',
    )
    parser.add_argument(
        '--suvroo-path',
        default=None,
        help='local path to suvroo dataset root; downloaded via kagglehub if omitted',
    )
    parser.add_argument(
        '--epochs',
        type=int,
        default=DEFAULT_EPOCHS,
        help=f'training epochs (default: {DEFAULT_EPOCHS})',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='show correction counts and resulting class distribution without training',
    )
    args = parser.parse_args()

    model_path      = pathlib.Path(args.model)
    corrections_dir = pathlib.Path(args.corrections)
    output_path     = pathlib.Path(args.output)

    divider = '-' * 58

    # --- always show correction summary ---
    correction_samples = load_corrections(corrections_dir)
    correction_counts  = collections.Counter(CLASSES[l] for _, l in correction_samples)

    print(divider)
    print(f"corrections found in: {corrections_dir}")
    print(divider)
    for cls in CLASSES:
        n = correction_counts.get(cls, 0)
        print(f"  {cls:<22} {n:>4} image{'s' if n != 1 else ''}")
    print(f"  {'total':<22} {sum(correction_counts.values()):>4}")

    if sum(correction_counts.values()) == 0:
        print("\nno correction images found.")
        print("run export_corrections.py first to populate the corrections/ folder.")
        if not args.dry_run:
            print("continuing without corrections (training will be identical to original)...")

    # --- dry run: show projected class distribution and exit ---
    if args.dry_run:
        senju_path, suvroo_path = resolve_dataset_paths(args)
        splits = build_original_splits(senju_path, suvroo_path)
        orig_counts = collections.Counter(CLASSES[l] for _, l in splits['train'])

        print(f"\n{divider}")
        print("projected training distribution after adding corrections")
        print(divider)
        print(f"  {'class':<22} {'original':>8}  {'added':>6}  {'total':>7}")
        print(f"  {'-'*22}  {'-'*8}  {'-'*6}  {'-'*7}")
        for cls in CLASSES:
            orig  = orig_counts.get(cls, 0)
            added = correction_counts.get(cls, 0)
            print(f"  {cls:<22} {orig:>8}  {f'+{added}' if added else '':>6}  {orig+added:>7}")
        grand_orig  = sum(orig_counts.values())
        grand_added = sum(correction_counts.values())
        print(f"  {'total':<22} {grand_orig:>8}  {f'+{grand_added}':>6}  {grand_orig+grand_added:>7}")
        print(f"\n  val:  {len(splits['val'])}  |  test: {len(splits['test'])}  (original, unchanged)")
        print("\ndry run complete, no training performed.")
        return

    # --- validate before loading anything heavy ---
    if not model_path.exists():
        print(f"\nerror: model not found at {model_path}", file=sys.stderr)
        print("place document_classifier_v2.pt in classifier/ or pass --model <path>", file=sys.stderr)
        sys.exit(1)

    if output_path.exists():
        print(f"\nwarning: {output_path} already exists and will be overwritten.")

    # --- load datasets ---
    senju_path, suvroo_path = resolve_dataset_paths(args)
    splits = build_original_splits(senju_path, suvroo_path)

    # corrections injected into training only — val and test are never touched
    combined_train = splits['train'] + correction_samples

    train_dataset = DocumentDataset(combined_train,  TRAIN_TRANSFORM)
    val_dataset   = DocumentDataset(splits['val'],   EVAL_TRANSFORM)
    test_dataset  = DocumentDataset(splits['test'],  EVAL_TRANSFORM)

    # num_workers=0 avoids macOS multiprocessing issues
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_dataset,   batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader  = DataLoader(test_dataset,  batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    label_counts = collections.Counter(l for _, l in combined_train)

    print(f"\n{divider}")
    print("training set composition")
    print(divider)
    orig_counts = collections.Counter(l for _, l in splits['train'])
    for cls, idx in CLASS_TO_IDX.items():
        orig  = orig_counts.get(idx, 0)
        added = correction_counts.get(cls, 0)
        tag   = f"  (+{added} corrections)" if added else ""
        print(f"  {cls:<22} {label_counts[idx]:>4}{tag}")
    print(f"\n  val: {len(val_dataset)}  |  test: {len(test_dataset)}  (original, unchanged)")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\ndevice: {device}")

    # --- load v2 and capture baseline accuracy on the ORIGINAL test set ---
    print(f"\nloading {model_path}...")
    model = build_model(model_path, device)

    print("evaluating v2 on original test set (baseline)...")
    v2_acc, v2_per_class = evaluate(model, test_loader, device)
    print(f"v2 baseline test accuracy: {v2_acc:.2f}%")

    # --- recalculate class weights for the expanded training set ---
    total_train = len(combined_train)
    weights = [
        total_train / (len(CLASSES) * label_counts[CLASS_TO_IDX[cls]])
        for cls in CLASSES
    ]
    class_weights = torch.tensor(weights, dtype=torch.float32).to(device)

    print(f"\n{divider}")
    print("class weights (recalculated for expanded training set)")
    print(divider)
    for cls, w in zip(CLASSES, weights):
        print(f"  {cls:<22} {w:.4f}")

    # --- freeze backbone, train classifier head only (mirrors notebook) ---
    for param in model.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\ntrainable parameters: {trainable:,}  (head only, backbone frozen)")

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(model.classifier.parameters(), lr=0.001)

    # --- training loop ---
    print(f"\n{divider}")
    print(f"training for {args.epochs} epochs")
    print(divider)

    best_val_acc    = 0.0
    best_state_dict = None

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_acc = run_train_epoch(model, train_loader, criterion, optimizer, device, epoch, args.epochs)
        val_acc   = run_val_epoch(model, val_loader, device)
        elapsed   = time.time() - t0
        print(f"epoch {epoch:02d}/{args.epochs}: train {train_acc:.1f}%  val {val_acc:.1f}%  ({elapsed:.0f}s)")
        if val_acc > best_val_acc:
            best_val_acc    = val_acc
            best_state_dict = {k: v.clone() for k, v in model.state_dict().items()}
            print(f"  -> new best (val {val_acc:.1f}%), checkpoint saved")
        print()

    # --- evaluate best checkpoint on original test set ---
    print(f"best val accuracy: {best_val_acc:.1f}%")
    model.load_state_dict(best_state_dict)

    print("evaluating best checkpoint on original test set...")
    v3_acc, v3_per_class = evaluate(model, test_loader, device)

    # --- save v3 ---
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), output_path)
    print(f"\nmodel saved -> {output_path}")

    # --- before / after comparison ---
    print(f"\n{divider}")
    print("before / after  (original test set, unchanged)")
    print(divider)
    print(f"  {'class':<22}  {'v2 baseline':>11}  {'v3 retrained':>12}  {'delta':>7}")
    print(f"  {'-'*22}  {'-'*11}  {'-'*12}  {'-'*7}")
    for cls in CLASSES:
        v2c   = v2_per_class[cls]
        v3c   = v3_per_class[cls]
        delta = v3c['acc'] - v2c['acc']
        delta_str = f"{delta:+.2f}%" if delta != 0 else "  —"
        print(
            f"  {cls:<22}  {v2c['acc']:>10.2f}%  {v3c['acc']:>11.2f}%  {delta_str:>7}"
            f"  ({v3c['correct']}/{v3c['total']})"
        )
    print(f"  {'-'*22}  {'-'*11}  {'-'*12}  {'-'*7}")
    delta_overall = v3_acc - v2_acc
    delta_str     = f"{delta_overall:+.2f}%" if delta_overall != 0 else "  —"
    print(f"  {'overall':<22}  {v2_acc:>10.2f}%  {v3_acc:>11.2f}%  {delta_str:>7}")
    print()


if __name__ == '__main__':
    main()
