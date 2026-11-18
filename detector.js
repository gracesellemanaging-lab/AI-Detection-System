// YOLO (v8/v11) ONNX detector: letterbox -> inference -> decode -> class-aware NMS
class Detector {
  constructor(cfg) {
    this.cfg = cfg; this.S = cfg.INPUT_SIZE; this.session = null; this.labels = cfg.COCO; this.provider = '';
    this.cv = document.createElement('canvas'); this.cv.width = this.cv.height = this.S;
    this.ctx = this.cv.getContext('2d', { willReadFrequently: true });
  }
  async fetchWithProgress(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cannot load ${url} (HTTP ${res.status}). Is the file in the repository?`);
    const total = +res.headers.get('Content-Length') || 0, reader = res.body.getReader(), chunks = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onProgress && onProgress(total ? got / total : null, got); }
    const buf = new Uint8Array(got); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
    return buf;
  }
  async load(onProgress) {
    if (!window.ort) throw new Error('ONNX Runtime Web failed to load. Check lib/ files or internet connection.');
    const bytes = await this.fetchWithProgress(this.cfg.MODEL_URL, onProgress);
    try { const r = await fetch(this.cfg.LABELS_URL); if (r.ok) this.labels = await r.json(); } catch (e) {}
    const order = ('gpu' in navigator) ? [['webgpu'], ['wasm']] : [['wasm']];
    let lastErr;
    for (const ep of order) {
      try { this.session = await ort.InferenceSession.create(bytes, { executionProviders: ep, graphOptimizationLevel: 'all' }); this.provider = ep[0]; break; }
      catch (e) { lastErr = e; }
    }
    if (!this.session) throw new Error('Model could not be loaded: ' + (lastErr && lastErr.message));
    this.inName = this.session.inputNames[0]; this.outName = this.session.outputNames[0];
    // validation: dry run on blank input, check output shape
    const out = await this.session.run({ [this.inName]: new ort.Tensor('float32', new Float32Array(3 * this.S * this.S), [1, 3, this.S, this.S]) });
    const dims = out[this.outName].dims;
    if (![2, 3].includes(dims.length) && dims.length !== 3) throw new Error('Unsupported output shape [' + dims + ']');
    this.outDims = dims;
    return { provider: this.provider, outDims: dims, classes: this.labels.length };
  }
  preprocess(src, w, h) {
    const S = this.S, scale = Math.min(S / w, S / h), nw = Math.round(w * scale), nh = Math.round(h * scale);
    const px = Math.floor((S - nw) / 2), py = Math.floor((S - nh) / 2);
    this.ctx.fillStyle = 'rgb(114,114,114)'; this.ctx.fillRect(0, 0, S, S);
    this.ctx.drawImage(src, 0, 0, w, h, px, py, nw, nh);
    const d = this.ctx.getImageData(0, 0, S, S).data, n = S * S, f = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { f[i] = d[i * 4] / 255; f[n + i] = d[i * 4 + 1] / 255; f[2 * n + i] = d[i * 4 + 2] / 255; } // RGB, CHW, 0-1
    return { tensor: new ort.Tensor('float32', f, [1, 3, S, S]), scale, px, py };
  }
  async detect(src, w, h, conf = this.cfg.CONF, iou = this.cfg.IOU) {
    const { tensor, scale, px, py } = this.preprocess(src, w, h);
    const out = (await this.session.run({ [this.inName]: tensor }))[this.outName];
    let boxes = this.decode(out, conf);
    boxes = this.nms(boxes, iou).slice(0, this.cfg.MAX_DET);
    return boxes.map(b => {
      const x1 = Math.max(0, (b.x1 - px) / scale), y1 = Math.max(0, (b.y1 - py) / scale);
      const x2 = Math.min(w, (b.x2 - px) / scale), y2 = Math.min(h, (b.y2 - py) / scale);
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, score: b.score, cls: b.cls, label: this.labels[b.cls] || ('class ' + b.cls) };
    }).filter(b => b.w > 1 && b.h > 1);
  }
  decode(t, conf) {
    const d = t.dims, a = t.data, res = [];
    const dd = d.length === 3 ? d.slice(1) : d; // drop batch
    if (dd[1] === 6 && dd[0] <= 1000) { // end-to-end: [N,6] = x1,y1,x2,y2,score,cls
      for (let i = 0; i < dd[0]; i++) { const o = i * 6; if (a[o + 4] >= conf) res.push({ x1: a[o], y1: a[o + 1], x2: a[o + 2], y2: a[o + 3], score: a[o + 4], cls: a[o + 5] | 0 }); }
      return res;
    }
    const chFirst = dd[0] < dd[1], C = chFirst ? dd[0] : dd[1], N = chFirst ? dd[1] : dd[0], nc = C - 4;
    const at = (c, i) => chFirst ? a[c * N + i] : a[i * C + c];
    for (let i = 0; i < N; i++) {
      let best = 0, bc = -1;
      for (let c = 0; c < nc; c++) { const s = at(4 + c, i); if (s > best) { best = s; bc = c; } }
      if (best < conf) continue;
      const cx = at(0, i), cy = at(1, i), w = at(2, i), h = at(3, i);
      res.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, score: best, cls: bc });
    }
    return res;
  }
  nms(boxes, thr) { // class-aware
    boxes.sort((p, q) => q.score - p.score); const keep = [];
    for (const b of boxes) { let ok = true; for (const k of keep) { if (k.cls === b.cls && Detector.iou(k, b) > thr) { ok = false; break; } } if (ok) keep.push(b); }
    return keep;
  }
  static iou(a, b) {
    const ax2 = a.x2 ?? a.x + a.w, ay2 = a.y2 ?? a.y + a.h, bx2 = b.x2 ?? b.x + b.w, by2 = b.y2 ?? b.y + b.h;
    const ax1 = a.x1 ?? a.x, ay1 = a.y1 ?? a.y, bx1 = b.x1 ?? b.x, by1 = b.y1 ?? b.y;
    const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1)), ih = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
    const inter = iw * ih, u = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter;
    return u > 0 ? inter / u : 0;
  }
}
window.Detector = Detector;
