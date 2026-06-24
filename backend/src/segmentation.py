# Segmentation
# note: redo
import cv2
import numpy as np

from .utils import to_gray


def segment_regions(image, min_area_frac=0.0008, merge_kernel=(25, 5)):
    """Find content regions on a perspective-corrected document image.

    What I did:
      1. binarize (text -> white on black) with adaptive threshold
      2. dilate with a wide-but-short kernel to glue characters of a line
         into one connected blob, and adjacent lines into a block
      3. take bounding boxes of the resulting blobs, filtered by size
    """

    gray = to_gray(image)
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,   # text becomes white (foreground)
        25, 15,
    )
    # remove isolated specks
    binary = cv2.morphologyEx(
        binary, cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)),
    )
    # glue characters/lines into blocks
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, merge_kernel)
    dilated = cv2.dilate(binary, kernel, iterations=2)

    cnts, _ = cv2.findContours(
        dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    page_area = image.shape[0] * image.shape[1]
    boxes = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        if w * h < min_area_frac * page_area:
            continue
        # ignore boxes that span basically the whole page (usually the border)
        if w * h > 0.95 * page_area:
            continue
        boxes.append((x, y, w, h))

    # sort top-to-bottom, then left-to-right
    boxes.sort(key=lambda b: (b[1] // 20, b[0]))
    return boxes


def draw_regions(image, boxes, color=(255, 0, 0), thickness=2):
    # Return a copy of image with region bounding boxes drawn + numbered
    out = image.copy()
    if out.ndim == 2:
        out = cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)
    for i, (x, y, w, h) in enumerate(boxes, start=1):
        cv2.rectangle(out, (x, y), (x + w, y + h), color, thickness)
        cv2.putText(
            out, f"R{i}", (x, max(0, y - 5)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2,
        )
    return out