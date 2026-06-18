"""
Four-point perspective transform: take a tilted photo of a page plus its
four detected corners, return a flat top-down "scanned" view.
"""
import cv2
import numpy as np


def order_points(pts):
    pts = np.asarray(pts, dtype="float32").reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    diff = np.diff(pts, axis=1).ravel()  # x - y
    # np.diff on (x,y) rows gives (y - x); we want x - y ordering, so:
    diff = pts[:, 0] - pts[:, 1]
    rect[1] = pts[np.argmax(diff)] # top-right  (large x, small y)
    rect[3] = pts[np.argmin(diff)] # bottom-left (small x, large y)
    return rect


def four_point_transform(image, corners):
    """
    Warping the image (transforming)
    Output size is derived from the detected corner distances so the
    aspect ratio of the real page is roughly preserved.
    """
    rect = order_points(corners)
    (tl, tr, br, bl) = rect

    # width = max distance between the two horizontal edge pairs
    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_w = int(max(width_top, width_bottom))

    # height = max distance between the two vertical edge pairs
    height_left = np.linalg.norm(bl - tl)
    height_right = np.linalg.norm(br - tr)
    max_h = int(max(height_left, height_right))

    max_w = max(max_w, 1)
    max_h = max(max_h, 1)

    dst = np.array(
        [[0, 0], [max_w - 1, 0], [max_w - 1, max_h - 1], [0, max_h - 1]],
        dtype="float32",
    )

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (max_w, max_h))
    return warped