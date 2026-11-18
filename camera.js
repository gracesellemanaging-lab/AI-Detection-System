// MediaDevices camera wrapper
class Camera {
  constructor(video) { this.video = video; this.stream = null; this.devices = []; this.idx = 0; }
  static supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  async list() { this.devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); return this.devices; }
  async start(deviceId) {
    if (!Camera.supported()) throw new Error('Camera API not available. Use HTTPS (GitHub Pages) and a modern browser.');
    this.stop();
    const v = { width: { ideal: 1280 }, height: { ideal: 720 } }; if (deviceId) v.deviceId = { exact: deviceId };
    try { this.stream = await navigator.mediaDevices.getUserMedia({ video: v, audio: false }); }
    catch (e) {
      const m = { NotAllowedError: 'Camera permission denied. Allow camera access in the browser address bar.', NotFoundError: 'No camera found.', NotReadableError: 'Camera is in use by another application.' };
      throw new Error(m[e.name] || e.message);
    }
    this.video.srcObject = this.stream; await this.video.play(); await this.list();
    const cur = this.stream.getVideoTracks()[0].getSettings().deviceId; this.idx = Math.max(0, this.devices.findIndex(d => d.deviceId === cur));
  }
  async switch() { if (!this.devices.length) await this.list(); if (this.devices.length < 2) throw new Error('Only one camera detected.'); this.idx = (this.idx + 1) % this.devices.length; await this.start(this.devices[this.idx].deviceId); }
  stop() { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.stream = null; this.video.srcObject = null; }
  get active() { return !!this.stream; }
}
window.Camera = Camera;
