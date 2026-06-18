import cv2
import numpy as np


def resize_to_height(image, height):
    # Resize an image to a target height, preserving aspect ratio
    h = image.shape[0]
    ratio = h / float(height)
    width = int(image.shape[1] / ratio)
    resized = cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
    return resized, ratio


def to_gray(image):
    # Convert BGR (or already-gray) image to single-channel grayscale
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def full_frame_corners(image):
    # Return the four corners of the whole image as a (4,2) float array
    # Used as a fallback when no document boundary is detected
    h, w = image.shape[:2]
    return np.array(
        [[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]],
        dtype="float32",
    )