"""
benchmarks/latency_logger.py
Real-time latency logger that monitors the running FastAPI server
and logs per-endpoint latency with rolling statistics.
"""
import sys
import time
import json
import argparse
import csv
import statistics
from pathlib import Path
from datetime import datetime
import httpx

API_BASE = "http://localhost:8000"


def log_health(client: httpx.Client, log_writer) -> dict:
    t0 = time.perf_counter()
    try:
        r = client.get(f"{API_BASE}/health", timeout=5)
        latency = (time.perf_counter() - t0) * 1000
        data = r.json()
        row = {
            "timestamp": datetime.utcnow().isoformat(),
            "endpoint": "/health",
            "status": r.status_code,
            "latency_ms": round(latency, 2),
            "cpu_percent": data.get("cpu_percent"),
            "memory_mb": data.get("memory_mb"),
            "gpu_mem_mb": data.get("gpu", {}).get("memory_allocated_mb") if data.get("gpu") else None,
        }
        log_writer.writerow(row)
        return data
    except Exception as e:
        print(f"  [!] Health check failed: {e}")
        return {}


def log_search(client: httpx.Client, log_writer, query: str = "person detected"):
    t0 = time.perf_counter()
    try:
        r = client.get(f"{API_BASE}/api/v1/search", params={"q": query, "top_k": 5}, timeout=30)
        latency = (time.perf_counter() - t0) * 1000
        log_writer.writerow({
            "timestamp": datetime.utcnow().isoformat(),
            "endpoint": "/api/v1/search",
            "status": r.status_code,
            "latency_ms": round(latency, 2),
            "cpu_percent": None,
            "memory_mb": None,
            "gpu_mem_mb": None,
        })
        return latency
    except Exception as e:
        print(f"  [!] Search failed: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Endpoint Latency Logger")
    parser.add_argument("--duration", type=int, default=60, help="Logging duration in seconds")
    parser.add_argument("--interval", type=float, default=2.0, help="Poll interval in seconds")
    parser.add_argument("--output", type=str, default="latency_log.csv")
    parser.add_argument("--endpoints", nargs="+", default=["health", "search"],
                        choices=["health", "search"])
    args = parser.parse_args()

    print(f"{'='*60}")
    print(f"Latency Logger — Target: {API_BASE}")
    print(f"Duration: {args.duration}s | Interval: {args.interval}s | Output: {args.output}")
    print(f"{'='*60}\n")

    fieldnames = ["timestamp", "endpoint", "status", "latency_ms", "cpu_percent", "memory_mb", "gpu_mem_mb"]
    all_latencies = []

    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        with httpx.Client() as client:
            start = time.perf_counter()
            iteration = 0

            while (time.perf_counter() - start) < args.duration:
                iteration += 1
                elapsed = time.perf_counter() - start
                print(f"[{elapsed:.1f}s] Iteration {iteration}")

                if "health" in args.endpoints:
                    data = log_health(client, writer)
                    if data:
                        cpu = data.get("cpu_percent", "?")
                        mem = data.get("memory_mb", "?")
                        print(f"  /health → CPU: {cpu}% | RAM: {mem}MB")

                if "search" in args.endpoints:
                    ms = log_search(client, writer)
                    if ms:
                        all_latencies.append(ms)
                        print(f"  /search → {ms:.1f}ms")

                f.flush()
                time.sleep(args.interval)

    # Summary stats
    if all_latencies:
        print(f"\n{'='*60}")
        print("LATENCY SUMMARY (/api/v1/search)")
        print(f"  Samples : {len(all_latencies)}")
        print(f"  Mean    : {statistics.mean(all_latencies):.1f}ms")
        print(f"  Median  : {statistics.median(all_latencies):.1f}ms")
        print(f"  P95     : {sorted(all_latencies)[int(len(all_latencies)*0.95)]:.1f}ms")
        print(f"  Min/Max : {min(all_latencies):.1f}ms / {max(all_latencies):.1f}ms")

    print(f"\n✅ Log saved to: {args.output}")


if __name__ == "__main__":
    main()
