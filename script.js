(() => {
const C = window.CONFIG, $ = id => document.getElementById(id);
const store = { get: (k, d) => { try { const v = localStorage.getItem('av_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('av_' + k, JSON.stringify(v)); } catch (e) {} } };
const S = { conf: store.get('conf', C.CONF), iou: store.get('iou', C.IOU), labels: store.get('labels', true), hist: store.get('hist', true) };
let history = store.get('history', []), det, cam, tracker = new Tracker(), mode = 'idle', running = false, ready = false, nextHid = store.get('hid', 1), lastLog = 0, fpsT = [];
const video = $('video'), cv = $('out'), ctx = cv.getContext('2d');
function alertMsg(m) { $('alert').textContent = m; $('alert').hidden = !m; }
// navigation
$('nav').onclick = e => { const v = e.target.dataset.v; if (!v) return; document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b === e.target)); document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v)); };
// settings
function syncSettings() {
  $('conf').value = $('sConf').value = Math.round(S.conf * 100); $('sIou').value = Math.round(S.iou * 100);
  $('confVal').textContent = $('sConfVal').textContent = Math.round(S.conf * 100) + '%'; $('sIouVal').textContent = Math.round(S.iou * 100) + '%';
  $('sLabels').checked = S.labels; $('sHist').checked = S.hist;
}
const setConf = v => { S.conf = v / 100; store.set('conf', S.conf); syncSettings(); };
$('conf').oninput = e => setConf(+e.target.value); $('sConf').oninput = e => setConf(+e.target.value);
$('sIou').oninput = e => { S.iou = e.target.value / 100; store.set('iou', S.iou); syncSettings(); };
$('sLabels').onchange = e => { S.labels = e.target.checked; store.set('labels', S.labels); };
$('sHist').onchange = e => { S.hist = e.target.checked; store.set('hist', S.hist); };
syncSettings();
// history
function renderHistory() { $('hBody').innerHTML = history.slice().reverse().map(h => `<tr><td>${h.id}</td><td>${h.name}</td><td>${h.conf}%</td><td>${h.time}</td></tr>`).join('') || '<tr><td colspan="4">No detections saved yet.</td></tr>'; }
function logDet(dets) {
  if (!S.hist || performance.now() - lastLog < 2000) return; lastLog = performance.now();
  const t = new Date().toLocaleString(); dets.forEach(d => history.push({ id: nextHid++, name: d.label, conf: Math.round(d.score * 100), time: t }));
  history = history.slice(-C.HISTORY_MAX); store.set('history', history); store.set('hid', nextHid); renderHistory();
}
$('bClear').onclick = () => { history = []; store.set('history', history); renderHistory(); }; renderHistory();
// drawing
function sizeCanvas(w, h) { if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
function colorFor(c) { return `hsl(${(c * 47) % 360} 85% 55%)`; }
function draw(src, w, h, dets) {
  sizeCanvas(w, h); ctx.drawImage(src, 0, 0, w, h); const lw = Math.max(2, w / 400), fs = Math.max(12, w / 55);
  ctx.lineWidth = lw; ctx.font = `600 ${fs}px system-ui,sans-serif`; ctx.textBaseline = 'top';
  for (const d of dets) {
    const col = colorFor(d.cls); ctx.strokeStyle = col; ctx.strokeRect(d.x, d.y, d.w, d.h);
    if (!S.labels) continue;
    const t = `${d.id ? '#' + d.id + ' ' : ''}${d.label} ${Math.round(d.score * 100)}%`, tw = ctx.measureText(t).width + 8, th = fs + 6, ty = d.y - th < 0 ? d.y : d.y - th;
    ctx.fillStyle = col; ctx.fillRect(d.x, ty, tw, th); ctx.fillStyle = '#000'; ctx.fillText(t, d.x + 4, ty + 3);
  }
}
function stats(dets) {
  const people = dets.filter(d => d.cls === 0 && d.label === 'person').length;
  $('sPeople').textContent = people; $('sObjects').textContent = dets.length - people;
}
async function infer(src, w, h) {
  let dets = await det.detect(src, w, h, S.conf, S.iou);
  tracker.update(dets.filter(d => d.label === 'person')); // assigns d.id on persons in place
  draw(src, w, h, dets); stats(dets); logDet(dets); return dets;
}
// loop
async function loop() {
  if (!running) return;
  if (video.readyState >= 2 && video.videoWidth) {
    const t0 = performance.now();
    try { await infer(video, video.videoWidth, video.videoHeight); } catch (e) { alertMsg('Inference error: ' + e.message); running = false; return; }
    fpsT.push(performance.now()); fpsT = fpsT.filter(t => t > performance.now() - 1000); $('sFps').textContent = fpsT.length;
  }
  if (mode === 'video' && video.ended) { running = false; $('sFps').textContent = 0; return; }
  requestAnimationFrame(loop);
}
function begin(m) { mode = m; $('empty').hidden = true; tracker.reset(); if (!running) { running = true; loop(); } }
function stopAll() { running = false; cam.stop(); video.pause(); video.removeAttribute('src'); video.load(); mode = 'idle'; $('sCam').textContent = 'Off'; $('sFps').textContent = 0; $('bStart').disabled = !ready; $('bStop').disabled = $('bSwitch').disabled = true; }
// controls
$('bStart').onclick = async () => {
  alertMsg(''); stopAll();
  try { await cam.start(); $('sCam').textContent = 'On'; $('bStart').disabled = true; $('bStop').disabled = false; $('bSwitch').disabled = false; begin('camera'); }
  catch (e) { $('sCam').textContent = 'Error'; alertMsg(e.message); }
};
$('bStop').onclick = stopAll;
$('bSwitch').onclick = async () => { try { await cam.switch(); tracker.reset(); } catch (e) { alertMsg(e.message); } };
$('fImg').onchange = async e => {
  const f = e.target.files[0]; if (!f || !ready) return; alertMsg(''); stopAll();
  const img = new Image(); img.onload = async () => { try { begin('image'); running = false; await infer(img, img.naturalWidth, img.naturalHeight); } catch (x) { alertMsg(x.message); } URL.revokeObjectURL(img.src); };
  img.onerror = () => alertMsg('Could not read that image.'); img.src = URL.createObjectURL(f); e.target.value = '';
};
$('fVid').onchange = async e => {
  const f = e.target.files[0]; if (!f || !ready) return; alertMsg(''); stopAll();
  video.src = URL.createObjectURL(f); video.loop = false;
  try { await video.play(); begin('video'); } catch (x) { alertMsg('Could not play that video.'); } e.target.value = '';
};
// ONNX Runtime loader: local first, CDN fallback
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load failed: ' + src)); document.head.appendChild(s); }); }
async function init() {
  cam = new Camera(video); $('bStart').disabled = true;
  if (!Camera.supported()) alertMsg('This browser or connection does not support camera access. Use HTTPS and a current browser. Image and video upload still work.');
  let base = C.ORT_LOCAL;
  try { await loadScript(base + 'ort.min.js'); } catch (e) { base = C.ORT_CDN; try { await loadScript(base + 'ort.min.js'); } catch (e2) { return fail('ONNX Runtime Web could not be loaded. Add it to lib/ or check your internet connection.'); } }
  ort.env.wasm.wasmPaths = base; ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  det = new Detector(C); $('modelState').textContent = 'Model: loading…';
  try {
    const info = await det.load(p => { if (p !== null) $('modelBar').style.width = Math.round(p * 100) + '%'; $('modelState').textContent = 'Model: downloading' + (p !== null ? ' ' + Math.round(p * 100) + '%' : '…'); });
    $('modelBar').style.width = '100%'; $('modelState').textContent = `Model ready (${info.provider}, ${info.classes} classes)`; ready = true; $('bStart').disabled = false;
  } catch (e) { fail(e.message); }
}
function fail(m) { $('modelState').textContent = 'Model: failed'; alertMsg(m); }
init();
})();
