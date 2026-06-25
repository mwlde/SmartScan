# four-point perspective transform - takes detected corners, returns flat top-down view
import cv2
import numpy as np


def order_points(pts):
    pts = np.asarray(pts, dtype="float32").reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    diff = np.diff(pts, axis=1).ravel()
    # np.diff gives (y-x), flip to get x-y ordering
    diff = pts[:, 0] - pts[:, 1]
    rect[1] = pts[np.argmax(diff)]  # top-right (large x, small y)
    rect[3] = pts[np.argmin(diff)]  # bottom-left (small x, large y)
    return rect


def four_point_transform(image, corners):
    """warp the img to a flat rectangle using the 4 detected corners. output size preserves real page aspect ratio."""
    rect = order_points(corners)
    (tl, tr, br, bl) = rect

    # width = max of the two horizontal edge lengths
    width_top = np.linalg.norm(tr - tl)
    width_bottom = np.linalg.norm(br - bl)
    max_w = int(max(width_top, width_bottom))

    # height = max of the two vertical edge lengths
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
