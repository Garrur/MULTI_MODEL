"""
vision/reid.py - Cross-Camera Person Re-Identification using ViT + FAISS
"""
import os
import time
import numpy as np
import faiss
import torch
import torch.nn.functional as F
from PIL import Image
from typing import List, Dict, Optional, Tuple
from transformers import ViTImageProcessor, ViTModel
from loguru import logger
from config import settings, DEVICE, FAISS_DIR


class PersonReID:
    """
    Person Re-Identification using google/vit-base-patch16-224 embeddings.
    Embeddings are stored in a FAISS IndexFlatIP (inner product = cosine after normalization).
    """

    INDEX_FILE = str(FAISS_DIR / "reid_index.faiss")
    META_FILE = str(FAISS_DIR / "reid_meta.npy")

    def __init__(self):
        logger.info(f"Loading ReID model: {settings.REID_MODEL}")
        self.processor = ViTImageProcessor.from_pretrained(settings.REID_MODEL)
        self.model = ViTModel.from_pretrained(settings.REID_MODEL)
        self.model.to(DEVICE)
        self.model.eval()

        self.dim = settings.REID_EMBEDDING_DIM
        self.index = self._load_or_create_index()
        # meta list: maps faiss internal id (row index) → {"person_id": str, "camera_id": str}
        self.meta: List[Dict] = self._load_meta()
        logger.info(f"✅ ReID ready. FAISS index size: {self.index.ntotal}")

    # ── Index Management ──────────────────────────────────────────────────────

    def _load_or_create_index(self) -> faiss.IndexFlatIP:
        if os.path.exists(self.INDEX_FILE):
            logger.info("Loading existing FAISS ReID index.")
            return faiss.read_index(self.INDEX_FILE)
        logger.info("Creating new FAISS ReID index (IndexFlatIP).")
        return faiss.IndexFlatIP(self.dim)

    def _load_meta(self) -> List[Dict]:
        if os.path.exists(self.META_FILE):
            data = np.load(self.META_FILE, allow_pickle=True)
            return list(data)
        return []

    def save(self):
        faiss.write_index(self.index, self.INDEX_FILE)
        np.save(self.META_FILE, np.array(self.meta, dtype=object))
        logger.debug("FAISS ReID index saved.")

    # ── Embedding Extraction ──────────────────────────────────────────────────

    @torch.inference_mode()
    def extract_embedding(self, image: Image.Image) -> np.ndarray:
        """Extract L2-normalized ViT CLS token embedding from a cropped person image."""
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        outputs = self.model(**inputs)
        # CLS token → (1, hidden_size)
        cls = outputs.last_hidden_state[:, 0, :]
        # L2 normalize for cosine similarity via inner product
        embedding = F.normalize(cls, p=2, dim=-1).cpu().numpy().astype(np.float32)
        return embedding  # shape: (1, 768)

    # ── Gallery Operations ────────────────────────────────────────────────────

    def add_person(self, image: Image.Image, person_id: str, camera_id: str) -> int:
        """Add a new person embedding to the FAISS gallery. Returns faiss_id."""
        embedding = self.extract_embedding(image)
        faiss_id = self.index.ntotal
        self.index.add(embedding)
        self.meta.append({"person_id": person_id, "camera_id": camera_id, "faiss_id": faiss_id})
        self.save()
        return faiss_id

    def search(
        self,
        image: Image.Image,
        top_k: int = 5,
        similarity_threshold: float = 0.85,
    ) -> List[Dict]:
        """
        Search gallery for matching persons.

        Returns:
            list of {"person_id": str, "camera_id": str, "similarity": float, "faiss_id": int}
        """
        if self.index.ntotal == 0:
            return []

        t0 = time.perf_counter()
        query = self.extract_embedding(image)
        k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(query, k)
        latency = (time.perf_counter() - t0) * 1000

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
            similarity = float(dist)
            if similarity >= similarity_threshold:
                meta = self.meta[idx]
                results.append({
                    "person_id": meta["person_id"],
                    "camera_id": meta["camera_id"],
                    "similarity": round(similarity, 4),
                    "faiss_id": int(idx),
                })

        logger.debug(f"ReID search: {len(results)} matches in {latency:.1f}ms")
        return results

    def search_by_embedding(
        self,
        embedding: np.ndarray,
        top_k: int = 5,
        similarity_threshold: float = 0.85,
    ) -> List[Dict]:
        """Direct search with a precomputed embedding."""
        if self.index.ntotal == 0:
            return []
        k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(embedding, k)
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1 or float(dist) < similarity_threshold:
                continue
            meta = self.meta[idx]
            results.append({
                "person_id": meta["person_id"],
                "camera_id": meta["camera_id"],
                "similarity": round(float(dist), 4),
                "faiss_id": int(idx),
            })
        return results
