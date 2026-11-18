"""Export a YOLOv8/YOLO11 .pt model to ONNX for the browser.
Usage: python export_model.py --weights yolo11n.pt --imgsz 640
Writes ../models/best.onnx and ../models/labels.json"""
import argparse, json, shutil
from pathlib import Path
from ultralytics import YOLO

ap = argparse.ArgumentParser()
ap.add_argument("--weights", default="yolo11n.pt")  # or your trained best.pt
ap.add_argument("--imgsz", type=int, default=640)   # must equal INPUT_SIZE in config.js
a = ap.parse_args()
m = YOLO(a.weights)
out = Path(m.export(format="onnx", imgsz=a.imgsz, opset=12, simplify=True, dynamic=False, half=False, nms=False))
models = Path(__file__).resolve().parent.parent / "models"; models.mkdir(exist_ok=True)
shutil.copy(out, models / "best.onnx")
names = m.names; (models / "labels.json").write_text(json.dumps([names[i] for i in range(len(names))]))
print("Saved", models / "best.onnx", "and labels.json (", len(names), "classes )")
