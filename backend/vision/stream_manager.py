import cv2
import threading
import time
import io
from PIL import Image, ImageDraw, ImageFont
from loguru import logger

class StreamManager:
    """
    Manages background threads that constantly pull frames from RTSP streams or local webcams,
    run the vision pipeline, and store annotated JPEG bytes for MJPEG streaming.
    """
    def __init__(self):
        self.streams = {}   # camera_id -> dict with thread info
        self.frames = {}    # camera_id -> latest JPEG bytes
        self.results = {}   # camera_id -> latest inference result dict
        self.running = True

    def add_stream(self, camera_id: str, source: str):
        """Add a new camera stream"""
        if camera_id in self.streams:
            logger.info(f"Stream {camera_id} is already running.")
            return
        
        # If source is just a digit like "0", handle it as an int for local webcam
        if source.isdigit():
            source = int(source)

        logger.info(f"Adding stream {camera_id} from {source}")
        thread = threading.Thread(target=self._stream_loop, args=(camera_id, source), daemon=True)
        self.streams[camera_id] = {
            "thread": thread, 
            "source": source, 
            "active": True
        }
        thread.start()

    def remove_stream(self, camera_id: str):
        if camera_id in self.streams:
            logger.info(f"Removing stream {camera_id}")
            self.streams[camera_id]["active"] = False
            del self.streams[camera_id]

    def _stream_loop(self, camera_id: str, source):
        # Import inside the loop to avoid circular import issues if imported from app.py
        from app import vision_pipeline
        
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            logger.error(f"Failed to open Stream: {camera_id} -> {source}")
            self.remove_stream(camera_id)
            return

        fps_native = cap.get(cv2.CAP_PROP_FPS) or 25.0
        delay = 1.0 / max(1, fps_native)

        logger.info(f"Stream {camera_id} connected. Target FPS: {fps_native}")

        while self.streams.get(camera_id, {}).get("active", False) and self.running:
            start_t = time.perf_counter()
            ret, frame = cap.read()
            
            if not ret:
                logger.warning(f"Stream {camera_id} disconnected. Attempting reconnect...")
                time.sleep(2)
                cap = cv2.VideoCapture(source)
                continue

            # Convert to PIL
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_frame)

            # ── Inference ──
            has_result = False
            result_data = None
            try:
                if vision_pipeline:
                    result_data = vision_pipeline.process_frame(
                        image_input=pil_img,
                        camera_id=camera_id,
                        run_attributes=True,
                        run_reid=True
                    )
                    self.results[camera_id] = result_data
                    has_result = True
            except Exception as e:
                logger.error(f"Inference error on stream {camera_id}: {e}")

            # ── Annotation ──
            if has_result and result_data:
                pil_img = self._annotate_frame(pil_img, result_data)

            # ── Encode to JPEG ──
            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=75)
            self.frames[camera_id] = buf.getvalue()

            # Enforce FPS limit
            elapsed = time.perf_counter() - start_t
            if elapsed < delay:
                time.sleep(delay - elapsed)

        cap.release()
        logger.info(f"Stream {camera_id} loop terminated.")

    def _annotate_frame(self, image: Image.Image, result: dict) -> Image.Image:
        """Draw bounding boxes natively on the PIL image before encoding to MJPEG"""
        draw = ImageDraw.Draw(image)
        try:
            # Using default font for robust cross-platform rendering
            font = ImageFont.load_default()
        except:
            font = None

        for p in result.get("persons", []):
            x1, y1, x2, y2 = p["bbox"]
            is_new = p.get("is_new_person", False)
            
            # Extract ReID sim
            reid_sim = 0
            if p.get("reid_matches"):
                reid_sim = p["reid_matches"][0].get("similarity", 0)
                
            is_alert = not is_new and reid_sim > 0.85
            
            # Colors match the frontend UI standard
            color = "#FF1744" if is_alert else ("#FFB300" if is_new else "#00E5FF")
            
            # Bounding Box
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
            
            # Label
            label = f"TRK-{p.get('track_id')} {(p.get('score', 0)*100):.0f}%"
            # Draw label background
            text_bg_y0 = max(0, y1 - 16)
            draw.rectangle([x1, text_bg_y0, x1 + 120, text_bg_y0 + 16], fill=color)
            
            if font:
                draw.text((x1 + 4, text_bg_y0 + 2), label, fill="black", font=font)
                
        return image

    def get_frame(self, camera_id: str):
        return self.frames.get(camera_id)

    def shutdown(self):
        self.running = False
        self.streams.clear()

# Global Singleton
stream_manager = StreamManager()
