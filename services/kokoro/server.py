import os
import sys
import io
import urllib.request
from pathlib import Path
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
import uvicorn
import soundfile as sf
from kokoro_onnx import Kokoro
from transcribe import align_audio_with_scenes

app = FastAPI(title="Kokoro TTS Sidecar & Whisper Auto-Caption")

MODELS_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODELS_DIR / "kokoro-v1.0.onnx"
VOICES_PATH = MODELS_DIR / "voices-v1.0.bin"

MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

kokoro_instance: Kokoro = None

def download_if_missing(url: str, dest_path: Path):
    if not dest_path.exists() or dest_path.stat().st_size == 0:
        print(f"[Kokoro Sidecar] Downloading {dest_path.name} from {url}...")
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dest_path)
        print(f"[Kokoro Sidecar] Downloaded {dest_path.name} successfully.")

def get_kokoro() -> Kokoro:
    global kokoro_instance
    if kokoro_instance is None:
        download_if_missing(MODEL_URL, MODEL_PATH)
        download_if_missing(VOICES_URL, VOICES_PATH)
        print("[Kokoro Sidecar] Loading Kokoro ONNX model weights...")
        kokoro_instance = Kokoro(str(MODEL_PATH), str(VOICES_PATH))
        print("[Kokoro Sidecar] Kokoro ONNX model loaded successfully.")
    return kokoro_instance

class TTSRequest(BaseModel):
    text: str
    voice: str = "bm_george"
    speed: float = 1.0
    output_format: str = "wav"

class AutoCaptionRequest(BaseModel):
    audio_path: str
    scenes: list = []
    model_size: str = "tiny.en"

@app.get("/health")
def health():
    return {"status": "ok", "service": "kokoro", "whisper": "ok"}

@app.get("/voices")
def list_voices():
    try:
        k = get_kokoro()
        return {"voices": k.get_voices()}
    except Exception as e:
        return {"voices": ["bm_george", "am_michael", "am_adam", "bf_emma", "af_nicole"], "error": str(e)}

@app.post("/tts")
def generate_tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        k = get_kokoro()
        # Kokoro ONNX requires valid BCP-47 lang code: 'en-gb' or 'en-us'
        lang = "en-gb" if req.voice.startswith("b") else "en-us"
        samples, sample_rate = k.create(
            text=req.text,
            voice=req.voice,
            speed=req.speed,
            lang=lang
        )
        
        # Write to in-memory WAV
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format='WAV')
        buf.seek(0)
        
        return Response(content=buf.getvalue(), media_type="audio/wav")
    except Exception as e:
        print(f"[Kokoro Sidecar Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/autocaption")
def auto_caption(req: AutoCaptionRequest):
    if not os.path.exists(req.audio_path):
        raise HTTPException(status_code=404, detail=f"Audio file not found: {req.audio_path}")
    
    try:
        print(f"[AutoCaption] Processing request for audio: {req.audio_path} ({len(req.scenes)} scenes)")
        result = align_audio_with_scenes(req.audio_path, req.scenes, model_size=req.model_size)
        return result
    except Exception as e:
        print(f"[AutoCaption Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("[Kokoro Sidecar] Starting Kokoro TTS & Whisper server on 127.0.0.1:8880...")
    uvicorn.run(app, host="127.0.0.1", port=8880, log_level="info")
