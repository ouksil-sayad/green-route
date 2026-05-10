#!/usr/bin/env python3
import argparse
import itertools
import json
import random
import statistics
from pathlib import Path
import sys


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.algorithms.dijkstra import DijkstraRouter
from app.core.config import NORM_CO2, NORM_PRICE, NORM_TIME, EDGES_CSV, NODES_CSV
from app.core.graph_loader import load_graph


WEIGHT_PROFILES = [
    {"name": "fastest", "weights": {"time": 1.0, "price": 0.0, "co2": 0.0}},
    {"name": "cheapest", "weights": {"time": 0.0, "price": 1.0, "co2": 0.0}},
    {"name": "greenest", "weights": {"time": 0.0, "price": 0.0, "co2": 1.0}},
    {"name": "balanced", "weights": {"time": 1.0 / 3.0, "price": 1.0 / 3.0, "co2": 1.0 / 3.0}},
]


def route_metrics(result):
    total_time = 0.0
    total_price = 0.0
    total_co2 = 0.0
    for _u, _v, edge in result.get("edges", []):
        total_time += float(edge.get("time", 0.0))
        total_price += float(edge.get("price", 0.0))
        total_co2 += float(edge.get("co2", 0.0))
    return {
        "time": total_time,
        "price": total_price,
        "co2": total_co2,
    }


def median_or_default(values, default):
    return statistics.median(values) if values else default


def resolve_csv_paths(nodes_csv=None, edges_csv=None):
    if nodes_csv and edges_csv:
        return Path(nodes_csv), Path(edges_csv)

    backend_data_processed = BACKEND_ROOT / "data" / "processed"
    candidates = [
        (Path(NODES_CSV), Path(EDGES_CSV)),
        (backend_data_processed / "nodes.csv", backend_data_processed / "edges.csv"),
    ]
    for n_path, e_path in candidates:
        if n_path.exists() and e_path.exists():
            return n_path, e_path
    raise FileNotFoundError(
        "Could not find nodes/edges CSV files. "
        "Use --nodes-csv and --edges-csv to pass explicit paths."
    )


def calibrate(max_pairs, seed, nodes_csv=None, edges_csv=None):
    nodes_path, edges_path = resolve_csv_paths(nodes_csv=nodes_csv, edges_csv=edges_csv)
    graph, node_database = load_graph(str(nodes_path), str(edges_path))
    router = DijkstraRouter(graph=graph, node_database=node_database)

    nodes = list(graph.nodes())
    if len(nodes) < 2:
        raise RuntimeError("Graph has fewer than 2 nodes; cannot calibrate.")

    random.seed(seed)
    pair_count = min(max_pairs, len(nodes) * (len(nodes) - 1))

    sampled_pairs = []
    used = set()
    while len(sampled_pairs) < pair_count:
        a = random.choice(nodes)
        b = random.choice(nodes)
        if a == b or (a, b) in used:
            continue
        used.add((a, b))
        sampled_pairs.append((a, b))

    time_deltas = []
    price_deltas = []
    co2_deltas = []
    considered_od = 0

    for start, end in sampled_pairs:
        alternatives = []
        seen_paths = set()

        for profile in WEIGHT_PROFILES:
            result = router.find_path(start, end, profile["weights"])
            if not result:
                continue
            path_key = tuple(result.get("nodes", []))
            if not path_key or path_key in seen_paths:
                continue
            seen_paths.add(path_key)
            alternatives.append(route_metrics(result))

        if len(alternatives) < 2:
            continue

        considered_od += 1
        for a, b in itertools.combinations(alternatives, 2):
            dt = abs(a["time"] - b["time"])
            dp = abs(a["price"] - b["price"])
            dc = abs(a["co2"] - b["co2"])
            if dt > 0.0:
                time_deltas.append(dt)
            if dp > 0.0:
                price_deltas.append(dp)
            if dc > 0.0:
                co2_deltas.append(dc)

    recommended = {
        "NORM_TIME": median_or_default(time_deltas, NORM_TIME),
        "NORM_PRICE": median_or_default(price_deltas, NORM_PRICE),
        "NORM_CO2": median_or_default(co2_deltas, NORM_CO2),
    }

    diagnostics = {
        "sampled_od_pairs": len(sampled_pairs),
        "od_pairs_with_2plus_alternatives": considered_od,
        "delta_samples": {
            "time": len(time_deltas),
            "price": len(price_deltas),
            "co2": len(co2_deltas),
        },
        "current_config": {
            "NORM_TIME": NORM_TIME,
            "NORM_PRICE": NORM_PRICE,
            "NORM_CO2": NORM_CO2,
        },
        "recommended": recommended,
    }
    return diagnostics


def main():
    parser = argparse.ArgumentParser(
        description="Recommend fixed normalization constants from route trade-offs."
    )
    parser.add_argument("--max-pairs", type=int, default=300, help="Max OD pairs to sample")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for OD sampling")
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Print only JSON diagnostics",
    )
    parser.add_argument("--nodes-csv", type=str, default=None, help="Optional explicit nodes.csv path")
    parser.add_argument("--edges-csv", type=str, default=None, help="Optional explicit edges.csv path")
    args = parser.parse_args()

    diagnostics = calibrate(
        max_pairs=max(1, args.max_pairs),
        seed=args.seed,
        nodes_csv=args.nodes_csv,
        edges_csv=args.edges_csv,
    )
    if args.json_only:
        print(json.dumps(diagnostics, indent=2))
        return

    print("Calibration diagnostics:")
    print(json.dumps(diagnostics, indent=2))
    print("\nSuggested config block:")
    print(f"NORM_TIME = {diagnostics['recommended']['NORM_TIME']:.6g}")
    print(f"NORM_PRICE = {diagnostics['recommended']['NORM_PRICE']:.6g}")
    print(f"NORM_CO2 = {diagnostics['recommended']['NORM_CO2']:.6g}")


if __name__ == "__main__":
    main()
