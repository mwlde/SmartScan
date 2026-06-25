import cv2
import numpy as np

from .utils import to_gray


def segment_regions(image, min_area_frac=0.0008, merge_kernel=(25, 5)):
    """find text/content bounding boxes on a warped doc img.
    binarize, open to kill specks, dilate to glue chars into line blobs, bounding boxes."""

    gray = to_gray(image)
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,   # text becomes white (foreground)
        25, 15,
    )
    # kill isolated specks smaller than 2x2
    binary = cv2.morphologyEx(
        binary, cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)),
    )
    # wide-short kernel glues chars of a line into one blob, narrow enough to keep lines separate
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
        # skip anything covering basically the whole page (usually the border)
        if w * h > 0.95 * page_area:
            continue
        boxes.append((x, y, w, h))

    # reading order: top-to-bottom then left-to-right within 20px bands
    boxes.sort(key=lambda b: (b[1] // 20, b[0]))
    return boxes


def draw_regions(image, boxes, color=(255, 0, 0), thickness=2):
    # draws numbered bounding boxes on a copy of the img
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
