import cv2
import numpy as np


def resize_to_height(image, height):
    # resize preserving aspect ratio, returns (resized, original/new ratio)
    h = image.shape[0]
    ratio = h / float(height)
    width = int(image.shape[1] / ratio)
    resized = cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
    return resized, ratio


def to_gray(image):
    # handles already-gray imgs too
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def full_frame_corners(image):
    # fallback when no doc boundary found — just use the whole frame
    h, w = image.shape[:2]
    return np.array(
        [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]],
        dtype="float32",
    )
