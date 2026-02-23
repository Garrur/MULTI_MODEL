"""
vision/attributes.py - CLIP-based Zero-Shot Clothing & Attribute Recognition
"""
import time
import torch
import numpy as np
import faiss
import os
from PIL import Image
from typing import List, Dict, Tuple, Optional
from transformers import CLIPProcessor, CLIPModel
from loguru import logger
from config import settings, DEVICE, FAISS_DIR


# Attribute taxonomies for zero-shot classification
CLOTHING_LABELS = [
    "wearing a red shirt", "wearing a blue shirt", "wearing a white shirt",
    "wearing a black shirt", "wearing a yellow jacket", "wearing a green jacket",
    "wearing jeans", "wearing formal trousers", "wearing shorts", "wearing a dress",
    "wearing a hoodie", "wearing a suit", "wearing a uniform", "wearing a coat",
]

COLOR_LABELS = [
    "person in red clothing", "person in blue clothing", "person in black clothing",
    "person in white clothing", "person in gray clothing", "person in green clothing",
    "person in yellow clothing", "person in orange clothing", "person in brown clothing",
]

GENDER_LABELS = ["a male person", "a female person"]

ACCESSORY_LABELS = [
    "wearing a backpack", "carrying a bag", "wearing a hat", "wearing sunglasses",
    "carrying an umbrella", "wearing a mask", "no accessories",
]

AGE_LABELS = [
    "a child person", "a teenager person", "a young adult person",
    "a middle-aged person", "an elderly person",
]


class AttributeRecognizer:
    """
    Zero-shot attribute recognition using CLIP.
    Generates structured attribute dict and CLIP visual embeddings per person.
    """

    ATTR_INDEX_FILE = str(FAISS_DIR / "attr_index.faiss")
    ATTR_META_FILE = str(FAISS_DIR / "attr_meta.npy")

    def __init__(self):
        logger.info(f"Loading CLIP model: {settings.CLIP_MODEL}")
        self.processor = CLIPProcessor.from_pretrained(settings.CLIP_MODEL)
        self.model = CLIPModel.from_pretrained(settings.CLIP_MODEL)
        self.model.to(DEVICE)
        self.model.eval()

        self.dim = settings.CLIP_EMBEDDING_DIM
        self.index = self._load_or_create_index()
        self.meta: List[Dict] = self._load_meta()
        logger.info(f"✅ AttributeRecognizer ready. FAISS attr index size: {self.index.ntotal}")

    def _load_or_create_index(self):
        if os.path.exists(self.ATTR_INDEX_FILE):
            return faiss.read_index(self.ATTR_INDEX_FILE)
        return faiss.IndexFlatIP(self.dim)

    def _load_meta(self) -> List[Dict]:
        if os.path.exists(self.ATTR_META_FILE):
            return list(np.load(self.ATTR_META_FILE, allow_pickle=True))
        return []

    def save(self):
        faiss.write_index(self.index, self.ATTR_INDEX_FILE)
        np.save(self.ATTR_META_FILE, np.array(self.meta, dtype=object))

    @torch.inference_mode()
    def _classify(self, image: Image.Image, labels: List[str]) -> List[Tuple[str, float]]:
        """Run zero-shot CLIP classification. Returns sorted (label, prob) list."""
        inputs = self.processor(
            text=labels, images=image, return_tensors="pt", padding=True
        )
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        outputs = self.model(**inputs)
        logits = outputs.logits_per_image[0]
        probs = torch.softmax(logits, dim=0).cpu().numpy()
        return sorted(zip(labels, probs.tolist()), key=lambda x: -x[1])

    @torch.inference_mode()
    def extract_visual_embedding(self, image: Image.Image) -> np.ndarray:
        """Extract L2-normalized CLIP visual embedding."""
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        features = self.model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy().astype(np.float32)

    def recognize(self, image: Image.Image) -> Dict:
        """
        Run all attribute classifiers on a cropped person image.

        Returns:
            {
                "clothing": [{"label": str, "confidence": float}],
                "color": str,
                "gender": str,
                "accessories": [str],
                "age_group": str,
            }
        """
        t0 = time.perf_counter()

        clothing_results = self._classify(image, CLOTHING_LABELS)
        color_results = self._classify(image, COLOR_LABELS)
        gender_results = self._classify(image, GENDER_LABELS)
        accessory_results = self._classify(image, ACCESSORY_LABELS)
        age_results = self._classify(image, AGE_LABELS)

        latency = (time.perf_counter() - t0) * 1000

        attributes = {
            "clothing": [
                {"label": l, "confidence": round(p, 4)}
                for l, p in clothing_results[:3]
                if p > 0.1
            ],
            "color": color_results[0][0].replace("person in ", "").replace(" clothing", "") if color_results else "unknown",
            "gender": gender_results[0][0].replace("a ", "").replace(" person", "") if gender_results else "unknown",
            "accessories": [l for l, p in accessory_results if p > 0.3 and "no accessories" not in l],
            "age_group": age_results[0][0].replace("a ", "").replace(" person", "") if age_results else "unknown",
            "inference_ms": round(latency, 2),
        }

        logger.debug(f"Attributes recognized in {latency:.1f}ms")
        return attributes

    def add_to_gallery(self, image: Image.Image, person_id: str) -> int:
        """Store CLIP visual embedding in FAISS for attribute-based search."""
        embedding = self.extract_visual_embedding(image)
        faiss_id = self.index.ntotal
        self.index.add(embedding)
        self.meta.append({"person_id": person_id, "faiss_id": faiss_id})
        self.save()
        return faiss_id

    def search_by_attribute_query(self, text_query: str, top_k: int = 10) -> List[Dict]:
        """Search gallery using a natural language attribute query."""
        if self.index.ntotal == 0:
            return []
        inputs = self.processor(text=[text_query], return_tensors="pt", padding=True)
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        with torch.inference_mode():
            text_features = self.model.get_text_features(**inputs)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        query = text_features.cpu().numpy().astype(np.float32)
        k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(query, k)
        return [
            {"person_id": self.meta[idx]["person_id"], "similarity": round(float(dist), 4)}
            for dist, idx in zip(distances[0], indices[0])
            if idx != -1
        ]
