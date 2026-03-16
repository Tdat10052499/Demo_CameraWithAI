from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import cv2
import numpy as np
import uvicorn
import uuid
from supabase import create_client, Client

# ================= 1. CẤU HÌNH SUPABASE =================
SUPABASE_URL = "https://xmkstcpvqpmrsweyfate.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3N0Y3B2cXBtcnN3ZXlmYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzQxMDcsImV4cCI6MjA4OTI1MDEwN30.u8oDHo1MPWfZSOjMv68h3HmM47wSGC-GNWP4cuI3Gvw"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# =======================================================

app = FastAPI() 
model = YOLO("best.pt") 

@app.post("/detect")
async def detect_disease(file: UploadFile = File(...)):
    try:
        # 1. Đọc luồng byte ảnh
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print("❌ Lỗi: Khung hình từ ESP32 gửi lên bị hỏng!")
            return JSONResponse(status_code=400, content={"status": "error", "message": "Corrupted image"})

        # 2. AI Phân tích
        results = model(img)
        
        best_label = "No Detection"
        best_conf = 0.0
        found = False

        # Vẽ khung nhận diện lên ảnh để lưu trữ (Tính năng nâng cấp)
        # results[0].plot() trả về mảng numpy của ảnh đã vẽ khung
        annotated_img = results[0].plot() 
        
        for r in results:
            for box in r.boxes:
                found = True
                if float(box.conf) > best_conf:
                    best_conf = float(box.conf)
                    best_label = model.names[int(box.cls)]
        
        if not found:
            print("⚠️ AI không tìm thấy đối tượng nào trong ảnh.")
        else:
            print(f"🎯 Phát hiện: {best_label} với độ tự tin {round(best_conf, 2)}")

        # 3. Mã hóa ảnh đã vẽ khung để upload lên Storage
        # Thay vì upload 'contents' (ảnh thô), ta upload 'img_encoded' (ảnh có khung)
        _, buffer = cv2.imencode('.jpg', annotated_img)
        img_to_upload = buffer.tobytes()

        # 4. Lưu trữ lên Cloud (Phải nằm trong khối try này)
        file_name = f"{uuid.uuid4()}.jpg"
        
        # Upload lên Supabase Storage
        supabase.storage.from_("demo_images").upload(file_name, img_to_upload)
        
        # Lấy link ảnh Public
        image_url = supabase.storage.from_("demo_images").get_public_url(file_name)
        
        # Ghi data vào Database
        db_data = {
            "image_url": image_url,
            "label": best_label,
            "confidence": round(best_conf, 2)
        }
        supabase.table("detections").insert(db_data).execute()
        print(f"✅ Đã đồng bộ Cloud thành công.")
        
        return {"status": "success", "ai_result": best_label, "confidence": best_conf}

    except Exception as e:
        print(f"❌ Lỗi Backend: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)