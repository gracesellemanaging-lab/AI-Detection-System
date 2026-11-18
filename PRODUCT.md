# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Security and monitoring staff who watch cameras and review detections in real time.

## Product Purpose

Browser-based object and person detection using a YOLO model running via ONNX Runtime Web. It helps staff monitor live camera feeds and uploaded images/videos without sending any media off-device.

## Positioning

Runs entirely in the browser (WebGPU with WebAssembly fallback): no backend, privacy-first, and usable offline after assets are cached.

## Operating Context

Used in browser on desktop or mobile; camera access requires HTTPS. Detection runs locally; tracking IDs are temporary per-frame links, not identification.

## Capabilities and Constraints

- Live camera detection with start/stop/switch camera
- Image and video upload detection
- Adjustable confidence and NMS IoU thresholds
- Detection history stored locally (optional)
- Model assets served from `models/`
- Must keep all inference and media on-device; no data leaves the browser

## Brand Commitments

Name: AccuVision AI. Voice: clear, technical but accessible. Assets: `assets/logo.svg`.

## Evidence on Hand

- `models/best.onnx`, `models/labels.json` (optional, written by export script)
- COCO label set fallback in `config.js`

## Product Principles

- Privacy first: never transmit media or detections.
- Local-first performance: prefer WebGPU, fall back to WASM.
- Clear feedback: status, progress, errors, and empty states.
- Accessible and keyboard-friendly controls.

## Accessibility & Inclusion

WCAG AA contrast and keyboard navigation for all controls.
