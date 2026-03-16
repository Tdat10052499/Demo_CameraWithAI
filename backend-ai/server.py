from fastapi import FastAPI, File, UploadFile
from ultralytics import YOLO
import cv2
import numpy as np
import uvicorn

# ĐÂY CHÍNH LÀ BIẾN "app" MÀ UVICORN ĐANG TÌM KIẾM
app = FastAPI() 

# Load mô hình YOLO bạn đã tải về
model = YOLO("best.pt") 

@app.post("/detect")
async def detect_disease(file: UploadFile = File(...)):
    # Đọc ảnh gửi lên
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Phân tích qua AI
    results = model(img)
    
    # Trích xuất kết quả
    detections = []
    for r in results:
        for box in r.boxes:
            detections.append({
                "label": model.names[int(box.cls)],
                "confidence": float(box.conf)
            })
    
    return {"status": "success", "detections": detections}