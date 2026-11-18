// AccuVision AI - configuration
window.CONFIG = {
  MODEL_URL: 'models/best.onnx',
  LABELS_URL: 'models/labels.json',   // written by python/export_model.py
  INPUT_SIZE: 640,                    // must match --imgsz used at export
  CONF: 0.45, IOU: 0.5, MAX_DET: 100,
  ORT_LOCAL: 'lib/',                  // put onnxruntime-web dist files here for offline use
  ORT_CDN: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/',
  HISTORY_MAX: 200,
  COCO: ['person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush']
};
