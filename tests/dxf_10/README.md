# Muse KAKU DXF test set (10 drawings)

- Ten ASCII DXF files, one test case per file.
- Units are millimetres (DXF $INSUNITS=4).
- DXF version: AutoCAD R12 / AC1009.
- Ground truth: ground_truth.csv.
- These are synthetic test drawings, not construction-ready drawings.

## Test procedure
1. Import each DXF separately.
2. Record detected rooms, dimensions, areas, openings, and symbols.
3. Compare results with ground_truth.csv.
4. Record missed items, false positives, unit/scale errors, and any manual corrections.
5. For test 10, the small endpoint gaps and uncertain opening are intentional. The expected behavior is to flag uncertainty rather than silently confirm.
6. For test 07, circles and rectangles represent sanitary fixtures; do not interpret them as room boundaries.
7. For test 08, test layer-aware and geometry-aware classification (LIGHT, POWER, SWITCH).

## Metrics
- Room-count accuracy
- Area error percentage
- Wall/opening detection precision and recall
- Fixture-symbol precision and recall
- Annotation-vs-geometry confusion rate
- Rate of uncertain cases correctly flagged for review

This is a starter regression set only. Sales-readiness requires a larger anonymized set of real JWW/DXF/PDF plans with human-verified ground truth.
