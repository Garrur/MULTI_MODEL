"""
graph/movement_graph.py - PyTorch Geometric Movement Graph & Anomaly Detection
Builds a directed graph of person movements across cameras and zones.
Detects abnormal route patterns using GNN-based anomaly scoring.
"""
import time
import torch
import numpy as np
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from loguru import logger
from config import DEVICE, settings

try:
    import torch_geometric
    from torch_geometric.data import Data
    from torch_geometric.nn import GCNConv, global_mean_pool
    GEO_AVAILABLE = True
except ImportError:
    GEO_AVAILABLE = False
    logger.warning("torch-geometric not installed. Movement graph module will use fallback.")


# ── GNN Autoencoder for Anomaly Detection ──────────────────────────────────────

class MovementGNN(torch.nn.Module):
    """
    Simple GCN autoencoder to encode node features (camera visit patterns).
    Reconstruction error → anomaly score.
    """

    def __init__(self, in_channels: int = 8, hidden: int = 16, out_channels: int = 8):
        super().__init__()
        if GEO_AVAILABLE:
            self.enc1 = GCNConv(in_channels, hidden)
            self.enc2 = GCNConv(hidden, out_channels)
            self.dec1 = GCNConv(out_channels, hidden)
            self.dec2 = GCNConv(hidden, in_channels)
        self.relu = torch.nn.ReLU()

    def forward(self, x, edge_index):
        # Encode
        z = self.relu(self.enc1(x, edge_index))
        z = self.enc2(z, edge_index)
        # Decode
        x_hat = self.relu(self.dec1(z, edge_index))
        x_hat = self.dec2(x_hat, edge_index)
        return x_hat, z


# ── Movement Graph Builder ──────────────────────────────────────────────────────

class MovementGraph:
    """
    Maintains a person-level movement graph.
    Nodes = cameras/zones; Edges = observed transitions.
    """

    def __init__(self):
        # person_id → list of (camera_id, timestamp, zone)
        self.person_trails: Dict[str, List[Dict]] = defaultdict(list)
        # camera graph: edge_weights[cam_a][cam_b] = count
        self.edge_weights: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.camera_ids: List[str] = []
        self.cam_index: Dict[str, int] = {}

        if GEO_AVAILABLE:
            self.gnn = MovementGNN().to(DEVICE)
            self.gnn.eval()
        else:
            self.gnn = None

        logger.info(f"MovementGraph initialized. PyG available: {GEO_AVAILABLE}")

    def register_camera(self, camera_id: str):
        if camera_id not in self.cam_index:
            self.cam_index[camera_id] = len(self.camera_ids)
            self.camera_ids.append(camera_id)

    def add_observation(
        self,
        person_id: str,
        camera_id: str,
        timestamp: float,
        zone: Optional[str] = None,
    ):
        """Record that a person was observed at camera/zone at timestamp."""
        self.register_camera(camera_id)
        trail = self.person_trails[person_id]

        # Add transition edge if person has prior observation
        if trail:
            last_cam = trail[-1]["camera_id"]
            if last_cam != camera_id:
                self.edge_weights[last_cam][camera_id] += 1

        trail.append({"camera_id": camera_id, "timestamp": timestamp, "zone": zone})
        # Keep last 50 observations per person
        if len(trail) > 50:
            self.person_trails[person_id] = trail[-50:]

    def _build_graph(self) -> Optional["Data"]:
        """Convert current camera graph to PyG Data object."""
        if not GEO_AVAILABLE or len(self.camera_ids) == 0:
            return None

        n = len(self.camera_ids)
        # Node features: [visit_count_normalized, in_degree, out_degree, ...]
        node_features = np.zeros((n, 8), dtype=np.float32)
        edge_src, edge_dst = [], []

        # Count visits per camera
        cam_visits = defaultdict(int)
        for trails in self.person_trails.values():
            for obs in trails:
                cam_visits[obs["camera_id"]] += 1

        max_visits = max(cam_visits.values()) if cam_visits else 1
        for cam, idx in self.cam_index.items():
            node_features[idx, 0] = cam_visits[cam] / max_visits

        # Build edges and compute in/out degree
        for src_cam, dst_dict in self.edge_weights.items():
            for dst_cam, weight in dst_dict.items():
                si = self.cam_index.get(src_cam)
                di = self.cam_index.get(dst_cam)
                if si is not None and di is not None:
                    edge_src.append(si)
                    edge_dst.append(di)
                    node_features[si, 1] += 1  # out-degree
                    node_features[di, 2] += 1  # in-degree

        if not edge_src:
            # Add self-loops to avoid empty graph
            edge_src = list(range(n))
            edge_dst = list(range(n))

        x = torch.tensor(node_features, dtype=torch.float32).to(DEVICE)
        edge_index = torch.tensor([edge_src, edge_dst], dtype=torch.long).to(DEVICE)
        return Data(x=x, edge_index=edge_index)

    @torch.inference_mode()
    def compute_anomaly_score(self, person_id: str) -> Dict:
        """
        Compute anomaly score for a person's movement trail.

        Returns:
            {"person_id": str, "anomaly_score": float, "route": list, "verdict": str}
        """
        trail = self.person_trails.get(person_id, [])
        if len(trail) < 2:
            return {"person_id": person_id, "anomaly_score": 0.0, "verdict": "insufficient_data", "route": []}

        t0 = time.perf_counter()

        # Heuristic features for pattern scoring
        cameras = [obs["camera_id"] for obs in trail]
        timestamps = [obs["timestamp"] for obs in trail]
        unique_cams = len(set(cameras))
        total_obs = len(cameras)

        # Time between observations
        gaps = np.diff(timestamps)
        avg_gap = float(np.mean(gaps)) if len(gaps) > 0 else 0
        max_gap = float(np.max(gaps)) if len(gaps) > 0 else 0

        # Suspicious patterns:
        # 1. Too many unique cameras in short time → rapid movement
        # 2. Very short dwell time per camera → running/fleeing behavior
        # 3. Visiting same camera repeatedly in short time → loitering
        rapid_movement = unique_cams / max(total_obs, 1) > 0.8
        loitering = cameras.count(cameras[-1]) / total_obs > 0.6 if cameras else False
        fast_dwell = avg_gap < 10 and unique_cams > 3  # under 10s per camera

        heuristic_score = 0.0
        if rapid_movement:
            heuristic_score += 0.4
        if loitering:
            heuristic_score += 0.3
        if fast_dwell:
            heuristic_score += 0.3

        # GNN-based score (if available)
        gnn_score = 0.0
        if GEO_AVAILABLE and self.gnn is not None:
            graph = self._build_graph()
            if graph is not None and graph.num_nodes > 0:
                x_hat, _ = self.gnn(graph.x, graph.edge_index)
                reconstruction_error = float(torch.mean((graph.x - x_hat) ** 2))
                gnn_score = min(reconstruction_error * 5, 1.0)

        # Combined score
        anomaly_score = round(0.5 * heuristic_score + 0.5 * gnn_score, 4)
        anomaly_score = min(anomaly_score, 1.0)

        latency = (time.perf_counter() - t0) * 1000

        if anomaly_score > settings.ANOMALY_THRESHOLD:
            verdict = "anomalous"
        elif anomaly_score > 0.4:
            verdict = "suspicious"
        else:
            verdict = "normal"

        return {
            "person_id": person_id,
            "anomaly_score": anomaly_score,
            "verdict": verdict,
            "route": [{"camera_id": obs["camera_id"], "timestamp": obs["timestamp"]} for obs in trail[-10:]],
            "unique_cameras": unique_cams,
            "total_observations": total_obs,
            "avg_dwell_seconds": round(avg_gap, 2),
            "flags": {
                "rapid_movement": rapid_movement,
                "loitering": loitering,
                "fast_dwell": fast_dwell,
            },
            "latency_ms": round(latency, 2),
        }

    def get_all_anomalies(self, threshold: float = 0.75) -> List[Dict]:
        """Compute anomaly scores for all tracked persons."""
        results = []
        for pid in self.person_trails:
            score_data = self.compute_anomaly_score(pid)
            if score_data["anomaly_score"] >= threshold:
                results.append(score_data)
        return sorted(results, key=lambda x: -x["anomaly_score"])

    def get_movement_summary(self) -> Dict:
        return {
            "total_persons_tracked": len(self.person_trails),
            "total_cameras": len(self.camera_ids),
            "cameras": self.camera_ids,
            "edge_count": sum(len(v) for v in self.edge_weights.values()),
        }
