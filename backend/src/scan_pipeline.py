import time
from dataclasses import dataclass, field

import numpy as np

from . import preprocessing
from . import document_detection
from . import perspective
from . import segmentation


@dataclass
class ScanResult:
    original: np.ndarray
    enhanced: np.ndarray
    detected_overlay: np.ndarray      # original w/ the page quad drawn on top
    corners: np.ndarray               # (4,2) corners used for warp
    document_found: bool              # False = fell back to full frame
    warped: np.ndarray                # perspective-corrected page (color)
    scan: np.ndarray                  # binarized final scan
    regions: list                     # list of (x,y,w,h) boxes on the scan
    region_overlay: np.ndarray        # scan w/ region boxes drawn
    timings_ms: dict = field(default_factory=dict)

    @property
    def total_ms(self):
        return sum(self.timings_ms.values())


def scan_document(image, work_height=500):
    t = {}

    t0 = time.perf_counter()
    enhanced = preprocessing.enhance(image)
    t["enhance"] = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    corners, found = document_detection.find_document_contour(enhanced, work_height=work_height)
    t["detect"] = (time.perf_counter() - t0) * 1000
    overlay = document_detection.draw_contour(image, corners)

    t0 = time.perf_counter()
    warped = perspective.four_point_transform(image, corners)
    t["warp"] = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    scan = preprocessing.to_scan(warped)
    t["binarize"] = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    regions = segmentation.segment_regions(warped)
    t["segment"] = (time.perf_counter() - t0) * 1000
    region_overlay = segmentation.draw_regions(warped, regions)

    return ScanResult(
        original=image,
        enhanced=enhanced,
        detected_overlay=overlay,
        corners=corners,
        document_found=found,
        warped=warped,
        scan=scan,
        regions=regions,
        region_overlay=region_overlay,
        timings_ms=t,
    )
