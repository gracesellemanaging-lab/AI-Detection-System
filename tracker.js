// Simple IoU tracker (greedy matching) with temporary IDs for people
class Tracker {
  constructor(iouThr = 0.3, maxAge = 10) { this.thr = iouThr; this.maxAge = maxAge; this.tracks = []; this.nextId = 1; }
  reset() { this.tracks = []; this.nextId = 1; }
  update(dets) {
    const pairs = [];
    this.tracks.forEach((t, ti) => dets.forEach((d, di) => { const v = Detector.iou(t, d); if (v >= this.thr) pairs.push([v, ti, di]); }));
    pairs.sort((a, b) => b[0] - a[0]);
    const usedT = new Set(), usedD = new Set();
    for (const [, ti, di] of pairs) {
      if (usedT.has(ti) || usedD.has(di)) continue;
      usedT.add(ti); usedD.add(di); Object.assign(this.tracks[ti], { x: dets[di].x, y: dets[di].y, w: dets[di].w, h: dets[di].h, age: 0 }); dets[di].id = this.tracks[ti].id;
    }
    dets.forEach((d, di) => { if (!usedD.has(di)) { const t = { id: this.nextId++, x: d.x, y: d.y, w: d.w, h: d.h, age: 0 }; this.tracks.push(t); d.id = t.id; } });
    this.tracks.forEach((t, ti) => { if (!usedT.has(ti) && t.age !== 0) t.age++; else if (!usedT.has(ti)) t.age = 1; });
    this.tracks = this.tracks.filter(t => t.age <= this.maxAge);
    return dets;
  }
}
window.Tracker = Tracker;
