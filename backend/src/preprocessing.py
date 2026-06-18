
import cv2
import numpy as np

from .utils import to_gray


def enhance(image, denoise=True, clahe=True):
  # Returns a BGR image the same size as the input.
    out = image.copy()

    if denoise:
        out = cv2.bilateralFilter(out, d=9, sigmaColor=75, sigmaSpace=75)

    if clahe:
        lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe_op = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe_op.apply(l)
        out = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)

    return out


def to_scan(image, block_size=25, c=15):
    gray = to_gray(image)
    # mild blur to suppress paper texture / sensor noise before thresholding
    gray = cv2.medianBlur(gray, 3)
    if block_size % 2 == 0:
        block_size += 1
    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size,
        c,
    )
    return binary