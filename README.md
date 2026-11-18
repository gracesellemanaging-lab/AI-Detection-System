# AccuVision AI – browser-based YOLO detection (GitHub Pages, no backend)

All inference runs in the browser via ONNX Runtime Web (WebGPU, WebAssembly fallback). Python is used only once, to export the model.

## 1. Prepare the model
```
cd python && pip install -r requirements.txt
python export_model.py --weights yolo11n.pt --imgsz 640      # or your trained best.pt
python validate_model.py --image sample.jpg --weights yolo11n.pt   # expect PASS
```
This creates `models/best.onnx` and `models/labels.json`. Use `yolo11s.pt` for higher accuracy (slower). Keep each file under 100 MB for GitHub.

## 2. Make it work offline (recommended)
Download `ort.min.js` and the `ort-wasm-simd-threaded*.wasm` / `.mjs` files from `https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/` into `lib/`. The app tries `lib/` first and falls back to the CDN. Offline use after the first load needs a service worker or cached files; the browser cache usually covers reloads.

## 3. Deploy
1. Push the whole folder to a GitHub repository (root contains `index.html`).
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<user>.github.io/<repo>/` (HTTPS is required for the camera).

Local test: `python -m http.server 8000`, then open `http://localhost:8000` (not `file://`).

## Troubleshooting
- **Model failed to load / 404**: `models/best.onnx` missing or wrong path (paths are case-sensitive).
- **Wrong or no boxes**: `INPUT_SIZE` in `config.js` must equal `--imgsz`; run `validate_model.py`.
- **Camera blocked**: allow camera in the address bar; close other apps using it; use HTTPS.
- **Slow**: WebGPU unavailable so WASM is used. Use `yolo11n`, a smaller `--imgsz` (e.g. 416, update config), or a desktop browser.
- **Custom classes**: `labels.json` supplies names automatically.

## Notes
- Output shapes `[1,4+nc,N]`, `[1,N,4+nc]` and end-to-end `[1,N,6]` are detected automatically.
- Tracking IDs are temporary IoU-based links, not identification.
- Appearance classification is not included: it would need a separately trained, validated model, and it should not be treated as determining gender identity.
