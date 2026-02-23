"""
benchmarks/fps_benchmark.py
Benchmarks the vision pipeline FPS and per-component latency.
Generates a detailed performance report.
"""
import sys
import os
import time
import json
import argparse
import statistics
import numpy as np
from pathlib import Path
from PIL import Image

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from config import settings, DEVICE


def generate_test_frame(width: int = 640, height: int = 480) -> Image.Image:
    """Generate a random test frame."""
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    return Image.fromarray(arr)


def benchmark_detection(n_frames: int = 50, resolution: tuple = (640, 480)):
    """Benchmark person detection alone."""
    print(f"\n{'='*60}")
    print(f"DETECTION BENCHMARK ({settings.DETECTION_MODEL})")
    print(f"Device: {DEVICE} | Frames: {n_frames} | Resolution: {resolution}")
    print('='*60)

    from vision.detector import PersonDetector
    detector = PersonDetector()

    # Warm up
    for _ in range(3):
        frame = generate_test_frame(*resolution)
        detector.detect(frame)

    latencies = []
    for i in range(n_frames):
        frame = generate_test_frame(*resolution)
        _, ms = detector.detect(frame)
        latencies.append(ms)
        if (i + 1) % 10 == 0:
            print(f"  Frame {i+1}/{n_frames}: {ms:.1f}ms")

    return _report("Detection", latencies)


def benchmark_reid(n_images: int = 50):
    """Benchmark ReID embedding extraction."""
    print(f"\n{'='*60}")
    print(f"REID BENCHMARK ({settings.REID_MODEL})")
    print(f"Device: {DEVICE} | Images: {n_images}")
    print('='*60)

    from vision.reid import PersonReID
    reid = PersonReID()

    latencies = []
    for i in range(n_images):
        frame = generate_test_frame(128, 256)
        t0 = time.perf_counter()
        reid.extract_embedding(frame)
        latencies.append((time.perf_counter() - t0) * 1000)
        if (i + 1) % 10 == 0:
            print(f"  Image {i+1}/{n_images}: {latencies[-1]:.1f}ms")

    return _report("ReID Embedding", latencies)


def benchmark_attributes(n_images: int = 30):
    """Benchmark CLIP attribute recognition."""
    print(f"\n{'='*60}")
    print(f"ATTRIBUTE BENCHMARK ({settings.CLIP_MODEL})")
    print(f"Device: {DEVICE} | Images: {n_images}")
    print('='*60)

    from vision.attributes import AttributeRecognizer
    attr = AttributeRecognizer()

    latencies = []
    for i in range(n_images):
        frame = generate_test_frame(128, 256)
        t0 = time.perf_counter()
        attr.recognize(frame)
        latencies.append((time.perf_counter() - t0) * 1000)
        if (i + 1) % 10 == 0:
            print(f"  Image {i+1}/{n_images}: {latencies[-1]:.1f}ms")

    return _report("Attribute Recognition", latencies)


def benchmark_full_pipeline(n_frames: int = 20):
    """Benchmark the full end-to-end pipeline."""
    print(f"\n{'='*60}")
    print("FULL PIPELINE BENCHMARK")
    print(f"Device: {DEVICE} | Frames: {n_frames}")
    print('='*60)

    from vision.pipeline import VisionPipeline
    pipeline = VisionPipeline()

    # Warm up
    for _ in range(2):
        frame = generate_test_frame()
        pipeline.process_frame(frame, "bench-cam", run_attributes=True, run_reid=True)

    latencies = []
    for i in range(n_frames):
        frame = generate_test_frame()
        result = pipeline.process_frame(frame, "bench-cam", run_attributes=True, run_reid=True)
        ms = result["latency"]["total_ms"]
        latencies.append(ms)
        fps = result["fps"]
        print(f"  Frame {i+1}/{n_frames}: {ms:.1f}ms | FPS: {fps:.1f} | Persons: {result['person_count']}")

    return _report("Full Pipeline", latencies)


def _report(name: str, latencies: list) -> dict:
    fps = [1000 / ms for ms in latencies if ms > 0]
    report = {
        "component": name,
        "n_samples": len(latencies),
        "latency_ms": {
            "mean": round(statistics.mean(latencies), 2),
            "median": round(statistics.median(latencies), 2),
            "p95": round(sorted(latencies)[int(len(latencies) * 0.95)], 2),
            "p99": round(sorted(latencies)[int(len(latencies) * 0.99)], 2),
            "min": round(min(latencies), 2),
            "max": round(max(latencies), 2),
        },
        "fps": {
            "mean": round(statistics.mean(fps), 2) if fps else 0,
            "peak": round(max(fps), 2) if fps else 0,
        },
    }
    print(f"\n📊 {name} Results:")
    print(f"   Mean latency : {report['latency_ms']['mean']}ms")
    print(f"   P95 latency  : {report['latency_ms']['p95']}ms")
    print(f"   Mean FPS     : {report['fps']['mean']}")
    return report


def main():
    parser = argparse.ArgumentParser(description="Surveillance System Benchmark")
    parser.add_argument("--component", choices=["detection", "reid", "attributes", "pipeline", "all"],
                        default="all")
    parser.add_argument("--frames", type=int, default=30)
    parser.add_argument("--output", type=str, default="benchmark_results.json")
    args = parser.parse_args()

    results = {}
    if args.component in ("detection", "all"):
        results["detection"] = benchmark_detection(args.frames)
    if args.component in ("reid", "all"):
        results["reid"] = benchmark_reid(args.frames)
    if args.component in ("attributes", "all"):
        results["attributes"] = benchmark_attributes(min(args.frames, 20))
    if args.component in ("pipeline", "all"):
        results["full_pipeline"] = benchmark_full_pipeline(min(args.frames, 15))

    # Save results
    with open(args.output, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n✅ Benchmark results saved to: {args.output}")


if __name__ == "__main__":
    main()
