"""
audio/asr.py - Automatic Speech Recognition using openai/whisper-small
audio/classifier.py - Audio classification using wav2vec2
audio/tts.py - Text-to-Speech using microsoft/speecht5_tts
"""
import time
import torch
import numpy as np
from typing import Dict, Optional, Union
from loguru import logger
from config import settings, DEVICE


# ═══════════════════════════════════════════════════════════════════════════
# ASR - Automatic Speech Recognition
# ═══════════════════════════════════════════════════════════════════════════

class WhisperASR:
    """Transcribes audio using openai/whisper-small."""

    def __init__(self):
        if not settings.ENABLE_AUDIO:
            logger.info("Audio module disabled. Set ENABLE_AUDIO=true to activate.")
            self._ready = False
            return
        logger.info(f"Loading Whisper ASR model: {settings.WHISPER_MODEL}")
        try:
            import whisper
            model_name = settings.WHISPER_MODEL.split("/")[-1]  # "whisper-small" → "small"
            self.model = whisper.load_model(model_name, device=str(DEVICE))
            self._ready = True
            logger.info("✅ WhisperASR ready.")
        except ImportError:
            logger.warning("openai-whisper not installed. ASR unavailable.")
            self._ready = False

    def transcribe(self, audio_path: str, language: Optional[str] = None) -> Dict:
        if not self._ready:
            return {"text": "", "error": "ASR not available"}
        t0 = time.perf_counter()
        opts = {}
        if language:
            opts["language"] = language
        result = self.model.transcribe(audio_path, **opts)
        latency_ms = (time.perf_counter() - t0) * 1000
        return {
            "text": result["text"],
            "language": result.get("language", "unknown"),
            "segments": result.get("segments", []),
            "latency_ms": round(latency_ms, 2),
        }

    def transcribe_bytes(self, audio_bytes: bytes, sample_rate: int = 16000) -> Dict:
        import tempfile, soundfile as sf, os
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmp_path = f.name
        try:
            audio_array = np.frombuffer(audio_bytes, dtype=np.float32)
            sf.write(tmp_path, audio_array, sample_rate)
            return self.transcribe(tmp_path)
        finally:
            os.unlink(tmp_path)


# ═══════════════════════════════════════════════════════════════════════════
# Audio Classifier
# ═══════════════════════════════════════════════════════════════════════════

class AudioClassifier:
    """Classifies audio events (gunshot, scream, etc.) using wav2vec2."""

    KEYWORDS = ["yes", "no", "up", "down", "left", "right", "on", "off", "stop", "go"]

    def __init__(self):
        if not settings.ENABLE_AUDIO:
            self._ready = False
            return
        logger.info(f"Loading audio classifier: {settings.AUDIO_CLASS_MODEL}")
        try:
            from transformers import pipeline
            device_id = 0 if str(DEVICE) == "cuda" else -1
            self.classifier = pipeline(
                "audio-classification",
                model=settings.AUDIO_CLASS_MODEL,
                device=device_id,
            )
            self._ready = True
            logger.info("✅ AudioClassifier ready.")
        except Exception as e:
            logger.warning(f"AudioClassifier init failed: {e}")
            self._ready = False

    def classify(self, audio_path: str, top_k: int = 5) -> Dict:
        if not self._ready:
            return {"classes": [], "error": "Audio classifier not available"}
        t0 = time.perf_counter()
        results = self.classifier(audio_path, top_k=top_k)
        latency_ms = (time.perf_counter() - t0) * 1000
        return {
            "classes": [{"label": r["label"], "score": round(r["score"], 4)} for r in results],
            "latency_ms": round(latency_ms, 2),
        }


# ═══════════════════════════════════════════════════════════════════════════
# TTS - Text to Speech
# ═══════════════════════════════════════════════════════════════════════════

class SpeechSynthesizer:
    """Generates speech from text using microsoft/speecht5_tts."""

    def __init__(self):
        if not settings.ENABLE_AUDIO:
            self._ready = False
            return
        logger.info(f"Loading TTS model: {settings.TTS_MODEL}")
        try:
            from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
            from datasets import load_dataset
            self.processor = SpeechT5Processor.from_pretrained(settings.TTS_MODEL)
            self.model = SpeechT5ForTextToSpeech.from_pretrained(settings.TTS_MODEL).to(DEVICE)
            self.vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan").to(DEVICE)
            # Load speaker embeddings
            ds = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
            self.speaker_embeddings = torch.tensor(ds[7306]["xvector"]).unsqueeze(0).to(DEVICE)
            self._ready = True
            logger.info("✅ SpeechSynthesizer ready.")
        except Exception as e:
            logger.warning(f"TTS init failed: {e}")
            self._ready = False

    def synthesize(self, text: str) -> Optional[np.ndarray]:
        """Synthesize text to audio. Returns numpy array (float32) or None."""
        if not self._ready:
            return None
        inputs = self.processor(text=text, return_tensors="pt").to(DEVICE)
        with torch.inference_mode():
            speech = self.model.generate_speech(
                inputs["input_ids"], self.speaker_embeddings, vocoder=self.vocoder
            )
        return speech.cpu().numpy()
