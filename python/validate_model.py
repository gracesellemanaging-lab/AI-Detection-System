"""Validate models/best.onnx against the original weights on a sample image.
Usage: python validate_model.py --image sample.jpg --weights yolo11n.pt"""
import argparse, numpy as np, cv2, onnxruntime as ort
from pathlib import Path
from ultralytics import YOLO

ap = argparse.ArgumentParser(); ap.add_argument("--image", required=True); ap.add_argument("--weights", default="yolo11n.pt")
ap.add_argument("--conf", type=float, default=0.45); a = ap.parse_args()
onnx_path = Path(__file__).resolve().parent.parent / "models" / "best.onnx"
sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0]; S = inp.shape[2]; print("input", inp.shape, "output", sess.get_outputs()[0].shape)
img = cv2.imread(a.image); h, w = img.shape[:2]; r = min(S / w, S / h); nw, nh = round(w * r), round(h * r)
canvas = np.full((S, S, 3), 114, np.uint8); px, py = (S - nw) // 2, (S - nh) // 2
canvas[py:py + nh, px:px + nw] = cv2.resize(img, (nw, nh))
x = canvas[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32) / 255
o = sess.run(None, {inp.name: x})[0][0]
o = o if o.shape[0] < o.shape[1] else o.T
sc = o[4:].max(0); keep = sc >= a.conf
boxes = np.stack([o[0] - o[2] / 2, o[1] - o[3] / 2, o[2], o[3]], 1)[keep]
idx = cv2.dnn.NMSBoxes(boxes.tolist(), sc[keep].tolist(), a.conf, 0.5)
ref = YOLO(a.weights).predict(a.image, conf=a.conf, imgsz=S, verbose=False)[0]
print("ONNX detections:", len(idx), "| PyTorch detections:", len(ref.boxes))
print("PASS" if abs(len(idx) - len(ref.boxes)) <= 1 else "MISMATCH - check imgsz/opset/class count")
