import cv2
import numpy as np
from .utils import resize_to_height, to_gray, full_frame_corners
from .perspective import order_points


# canny edge detection needs two thresholds (lower and upper)
# instead of hardcoding them, this calculates them based on the median pixel intensity
# works better on images with varying brightness
def _auto_canny(gray, sigma=0.33):
    v = np.median(gray)
    lower = int(max(0, (1.0 - sigma) * v))
    upper = int(min(255, (1.0 + sigma) * v))
    return cv2.Canny(gray, lower, upper)


# checks whether a 4 point quad could realistically be a photo of a rectangle
# perspective projection of a rectangle always keeps opposite sides roughly parallel,
# they can converge a bit toward a vanishing point but never more than ~35 deg in a real photo
# catches stuff like a diagonal top edge when the other 3 sides are straight
def _sides_are_parallel(pts, max_angle_diff=35):
    def side_angle(p1, p2):
        dx = float(p2[0]) - float(p1[0])
        dy = float(p2[1]) - float(p1[1])
        return np.degrees(np.arctan2(dy, dx)) % 180

    # contour order is cw or ccw, opposite pairs are (0 1 vs 2 3) and (1 2 vs 3 0)
    a01 = side_angle(pts[0], pts[1])
    a12 = side_angle(pts[1], pts[2])
    a23 = side_angle(pts[2], pts[3])
    a30 = side_angle(pts[3], pts[0])

    diff1 = abs(a01 - a23) % 180
    diff1 = min(diff1, 180 - diff1)

    diff2 = abs(a12 - a30) % 180
    diff2 = min(diff2, 180 - diff2)

    return diff1 <= max_angle_diff and diff2 <= max_angle_diff


# rejects quads that dont look like a real document photo
# checks convexity (a real photo of a rect is always convex),
# parallelism of opposite sides, corner angles between 50 to 130 deg,
# area (cant be 90%+ of the frame, thats just the whole image) and aspect ratio (no crazy thin strips)
def _is_valid_quad(quad, frame_area=None):
    pts = quad.reshape(4, 2).astype("float32")

    # photo of a rectangle is always convex
    contour = pts.reshape(4, 1, 2).astype(np.float32)
    if not cv2.isContourConvex(contour):
        return False

    # opposite sides within 35 deg of parallel
    if not _sides_are_parallel(pts):
        return False

    # corner angles 50 to 130 deg
    for i in range(4):
        p1 = pts[(i - 1) % 4]
        p2 = pts[i]
        p3 = pts[(i + 1) % 4]
        v1 = p1 - p2
        v2 = p3 - p2
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        angle = np.degrees(np.arccos(np.clip(cos_angle, -1, 1)))
        if angle < 50 or angle > 130:
            return False

    # area and aspect ratio caps
    if frame_area is not None:
        quad_area = cv2.contourArea(quad.reshape(4, 1, 2).astype(np.float32))
        if quad_area > 0.90 * frame_area:
            return False

    x, y, w, h = cv2.boundingRect(quad.reshape(4, 1, 2).astype(np.int32))
    ratio = max(w, h) / (min(w, h) + 1e-6)
    if ratio > 8.0:
        return False

    return True


# tries to simplify a contour down to exactly 4 points that pass _is_valid_quad
# tries 6 different epsilon values (how aggressively to simplify the curve)
# if none of those work, falls back to the convex hull of the contour and tries again
# epsilon controls how much the simplified shape is allowed to deviate from the original
def _approx_to_quad(contour, frame_area=None):
    peri = cv2.arcLength(contour, True)
    for eps in [0.02, 0.03, 0.04, 0.05, 0.06, 0.08]:
        approx = cv2.approxPolyDP(contour, eps * peri, True)
        if len(approx) == 4 and _is_valid_quad(approx, frame_area):
            return approx
    hull = cv2.convexHull(contour)
    hull_peri = cv2.arcLength(hull, True)
    for eps in [0.05, 0.08, 0.10, 0.15]:
        approx = cv2.approxPolyDP(hull, eps * hull_peri, True)
        if len(approx) == 4 and _is_valid_quad(approx, frame_area):
            return approx
    return None


# alternative to _approx_to_quad for slightly curved or crumpled pages
# min area rect fits a rotated bounding box to the contour which gives a cleaner quad
# when the edges arent perfectly straight
def _min_area_rect_quad(contour, frame_area=None):
    rect = cv2.minAreaRect(contour)
    box = cv2.boxPoints(rect).reshape(4, 2)
    if _is_valid_quad(box, frame_area):
        return box
    return None


# sometimes one corner of the detected quad gets pulled off by a nearby edge in the image
# this tries to reconstruct the bad corner from the other 3 using the parallelogram rule (D = A + C - B)
# only applies the fix if it improves the rectangularity score by more than 40 degrees total
def _fix_bad_corner(quad, frame_h, frame_w):
    pts = quad.reshape(4, 2).astype("float32")

    def rectangularity_score(p):
        score = 0.0
        for i in range(4):
            p1 = p[(i - 1) % 4]
            p2 = p[i]
            p3 = p[(i + 1) % 4]
            v1 = p1 - p2
            v2 = p3 - p2
            cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
            angle = np.degrees(np.arccos(np.clip(cos_a, -1, 1)))
            score += abs(angle - 90)
        return score

    original_score = rectangularity_score(pts)
    best_score = original_score
    best_pts = pts.copy()

    for i in range(4):
        j = (i + 1) % 4
        k = (i + 2) % 4
        l = (i + 3) % 4
        computed = pts[j] + pts[l] - pts[k]
        if (computed[0] < 0 or computed[0] >= frame_w or
                computed[1] < 0 or computed[1] >= frame_h):
            continue
        candidate = pts.copy()
        candidate[i] = computed
        score = rectangularity_score(candidate)
        if score < best_score:
            best_score = score
            best_pts = candidate

    if original_score - best_score > 40:
        return best_pts.reshape(4, 1, 2).astype(np.float32)
    return quad


# detection pass 1, fast path for clean well lit images
# uses fixed canny thresholds (75, 200) which work well when contrast is good
def _detect_fixed_canny(gray, min_area_frac, frame_area):
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edged = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
    cnts, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    for c in cnts:
        area = cv2.contourArea(c)
        if area < min_area_frac * frame_area or area > 0.90 * frame_area:
            continue
        quad = _approx_to_quad(c, frame_area)
        if quad is not None:
            return quad
    return None


# detection pass 2, adaptive thresholds and heavier blur
# handles harder lighting, shadows, and lower contrast docs where fixed canny fails
def _detect_auto_canny(gray, min_area_frac, frame_area):
    blurred = cv2.GaussianBlur(gray, (9, 9), 0)
    edged = _auto_canny(blurred)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    edged = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
    cnts, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:8]
    for c in cnts:
        area = cv2.contourArea(c)
        if area < min_area_frac * frame_area or area > 0.90 * frame_area:
            continue
        quad = _approx_to_quad(c, frame_area)
        if quad is not None:
            return quad
    return None


# detection pass 4, specifically for white/bright docs on a dark background
# thresholds the hsv value channel at 190 to isolate the bright area, then finds its outline
def _detect_white_document(small, min_area_frac, frame_area):
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    value = hsv[:, :, 2]
    _, thresh = cv2.threshold(value, 190, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    for c in cnts:
        area = cv2.contourArea(c)
        if area < min_area_frac * frame_area or area > 0.90 * frame_area:
            continue
        quad = _min_area_rect_quad(c, frame_area)
        if quad is not None:
            return quad.reshape(4, 1, 2).astype(np.float32)
    return None


# detection pass 5, last resort when everything else fails
# otsu threshold automatically picks the best global threshold value, then dilates to clean up
# less accurate than edge based approaches but catches cases where edges are too faint
def _detect_otsu(gray, min_area_frac, frame_area):
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    closed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
    _, thresh = cv2.threshold(closed, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thresh = cv2.dilate(
        thresh,
        cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)),
        iterations=2
    )
    cnts, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    for c in cnts:
        area = cv2.contourArea(c)
        if area < min_area_frac * frame_area or area > 0.90 * frame_area:
            continue
        quad = _approx_to_quad(c, frame_area)
        if quad is not None:
            return quad
    return None


# the main detection function, tries 5 different methods in order and returns the first one that works
# we downscale the image first (to work_height) so edge detection is faster, then scale corners back up
# the padding trick stops edge detection from missing a document that touches the image border
# returns (corners, true) on success, or (full frame corners, false) if nothing worked
def find_document_contour(image, work_height=500, min_area_frac=0.15):
    small, ratio = resize_to_height(image, work_height)
    orig_frame_area = small.shape[0] * small.shape[1]

    PAD = 10
    small = cv2.copyMakeBorder(
        small, PAD, PAD, PAD, PAD,
        cv2.BORDER_CONSTANT, value=0
    )

    gray = to_gray(small)

    # pass 1: fixed canny, fast path
    doc = _detect_fixed_canny(gray, min_area_frac, orig_frame_area)

    # pass 2: auto canny with bigger blur
    if doc is None:
        doc = _detect_auto_canny(gray, min_area_frac, orig_frame_area)

    # pass 3: lab l channel instead of gray (better for colored docs)
    if doc is None:
        l_channel = cv2.cvtColor(small, cv2.COLOR_BGR2LAB)[:, :, 0]
        doc = _detect_auto_canny(l_channel, min_area_frac, orig_frame_area)

    # pass 4: hsv white blob
    if doc is None:
        doc = _detect_white_document(small, min_area_frac, orig_frame_area)

    # pass 5: otsu, last resort
    if doc is None:
        doc = _detect_otsu(gray, min_area_frac, orig_frame_area)

    if doc is None:
        return full_frame_corners(image), False

    # try to fix any corner that got pulled off the doc
    doc = _fix_bad_corner(doc, small.shape[0], small.shape[1])

    corners = (doc.reshape(4, 2).astype("float32") - PAD) * ratio
    h, w = image.shape[:2]
    corners[:, 0] = np.clip(corners[:, 0], 0, w - 1)
    corners[:, 1] = np.clip(corners[:, 1], 0, h - 1)

    return order_points(corners), True


# draws the detected quad outline on a copy of the image so you can see what was found
def draw_contour(image, corners, color=(0, 255, 0), thickness=3):
    out = image.copy()
    pts = corners.astype(int).reshape(-1, 1, 2)
    cv2.polylines(out, [pts], isClosed=True, color=color, thickness=thickness)
    return out
