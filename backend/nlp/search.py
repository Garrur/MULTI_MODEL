"""
nlp/search.py - Semantic Search using sentence-transformers/all-MiniLM-L6-v2 + FAISS
Embeds natural language queries and matches against stored surveillance metadata.
"""
import os
import time
import numpy as np
import faiss
import torch
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from loguru import logger
from config import settings, DEVICE, FAISS_DIR


class SemanticSearchEngine:
    """
    Encodes surveillance metadata (event descriptions, attributes) into
    sentence embeddings stored in FAISS. Supports natural-language querying.
    """

    INDEX_FILE = str(FAISS_DIR / "search_index.faiss")
    META_FILE = str(FAISS_DIR / "search_meta.npy")

    def __init__(self):
        logger.info(f"Loading semantic search model: {settings.SEMANTIC_SEARCH_MODEL}")
        self.model = SentenceTransformer(settings.SEMANTIC_SEARCH_MODEL, device=str(DEVICE))
        self.dim = settings.SEARCH_EMBEDDING_DIM
        self.index = self._load_or_create_index()
        self.meta: List[Dict] = self._load_meta()
        logger.info(f"✅ SemanticSearchEngine ready. Index size: {self.index.ntotal}")

    def _load_or_create_index(self) -> faiss.IndexFlatIP:
        if os.path.exists(self.INDEX_FILE):
            logger.info("Loading existing FAISS search index.")
            return faiss.read_index(self.INDEX_FILE)
        return faiss.IndexFlatIP(self.dim)

    def _load_meta(self) -> List[Dict]:
        if os.path.exists(self.META_FILE):
            return list(np.load(self.META_FILE, allow_pickle=True))
        return []

    def save(self):
        faiss.write_index(self.index, self.INDEX_FILE)
        np.save(self.META_FILE, np.array(self.meta, dtype=object))

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to L2-normalized embeddings (batch)."""
        embeddings = self.model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return embeddings.astype(np.float32)

    def index_event(self, text: str, metadata: Dict) -> int:
        """
        Add a single surveillance event description to the FAISS search index.

        Args:
            text: Natural language description of the event
            metadata: {"event_id", "person_id", "camera_id", "timestamp", "activity_type", ...}

        Returns:
            faiss_id (row index)
        """
        embedding = self.encode([text])
        faiss_id = self.index.ntotal
        self.index.add(embedding)
        self.meta.append({**metadata, "text": text, "faiss_id": faiss_id})
        self.save()
        return faiss_id

    def index_batch(self, texts: List[str], metadatas: List[Dict]):
        """Batch indexing for bulk ingestion."""
        embeddings = self.encode(texts)
        base_id = self.index.ntotal
        self.index.add(embeddings)
        for i, (text, meta) in enumerate(zip(texts, metadatas)):
            self.meta.append({**meta, "text": text, "faiss_id": base_id + i})
        self.save()
        logger.info(f"Indexed {len(texts)} events into search index.")

    def search(self, query: str, top_k: int = 10, score_threshold: float = 0.4) -> List[Dict]:
        """
        Search surveillance logs by natural language query.

        Returns:
            List of {"text": str, "score": float, ...metadata fields}
        """
        if self.index.ntotal == 0:
            return []

        t0 = time.perf_counter()
        query_emb = self.encode([query])
        k = min(top_k, self.index.ntotal)
        distances, indices = self.index.search(query_emb, k)
        latency = (time.perf_counter() - t0) * 1000

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1 or float(dist) < score_threshold:
                continue
            entry = dict(self.meta[idx])
            entry["score"] = round(float(dist), 4)
            results.append(entry)

        logger.debug(f"Semantic search '{query[:40]}...' → {len(results)} results in {latency:.1f}ms")
        return sorted(results, key=lambda x: -x["score"])
