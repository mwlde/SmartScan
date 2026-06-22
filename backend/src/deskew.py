"""
Residual deskewing for already-warped document images.

This runs AFTER perspective.four_point_transform() — it does not replace
document detection or perspective correction. Its job is to catch small
leftover tilt (a few degrees) caused by imperfect corner detection, using
the classic Canny + Hough Transform approach (same idea as Alyn / text_deskewing).
"""
import cv2
import numpy as np
from .utils import to_gray


def _detect_skew_angle(image, max_angle=15.0):
    """
    Estimate the dominant skew angle of text/document lines in a warped image.

    Returns the angle in degrees needed to correct the skew (positive = rotate
    counter-clockwise). Returns 0.0 if no reliable angle is found, so callers
    can safely skip rotation rather than risk a bad correction.
    """
    gray = to_gray(image)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    # Hough Transform to find dominant straight lines (text lines, table borders)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=100,
        minLineLength=image.shape[1] // 4,
        maxLineGap=20
    )

    if lines is None or len(lines) == 0:
        return 0.0

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))

        # Normalize to -45..45 range (we only care about near-horizontal lines,
        # which represent text lines or top/bottom document edges)
        if angle > 45:
            angle -= 90
        elif angle < -45:
            angle += 90

        # Ignore near-vertical outliers and anything beyond our correction limit
        if abs(angle) <= max_angle:
            angles.append(angle)

    if not angles:
        return 0.0

    # Median is more robust than mean — a handful of noisy lines won't skew the result
    return float(np.median(angles))


def deskew(image, min_correction=0.5, max_angle=15.0):
    """
    Detects and corrects small residual skew in a warped document image.

    Args:
        image: warped BGR image (output of four_point_transform)
        min_correction: skip rotation if detected angle is smaller than this
                        (degrees) — avoids introducing noise on already-straight images
        max_angle: ignore angle estimates beyond this — a large "skew" usually
                   means Hough picked up something other than the document lines

    Returns:
        (corrected_image, angle_applied)
        angle_applied is 0.0 if no correction was made.
    """
    angle = _detect_skew_angle(image, max_angle=max_angle)

    if abs(angle) < min_correction:
        return image, 0.0

    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)

    # Use white border fill so rotated edges don't introduce black corners
    # on a document that's meant to look like a clean scan
    corrected = cv2.warpAffine(
        image, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255)
    )

    return corrected, angle
