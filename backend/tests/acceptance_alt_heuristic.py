"""
ALT + Haversine heuristic acceptance tests.
Run from repo:  python backend/tests/acceptance_alt_heuristic.py
Or:             cd backend && python tests/acceptance_alt_heuristic.py
"""
import os
import sys

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

import networkx as nx  # noqa: E402

from app.core.graph_loader import load_graph  # noqa: E402
from app.core.config import NORM_TIME, NORM_PRICE, NORM_CO2  # noqa: E402

_DATA_DIR = os.path.join(BACKEND_ROOT, "data", "processed")
NODES_CSV = os.path.join(_DATA_DIR, "nodes.csv")
EDGES_CSV = os.path.join(_DATA_DIR, "edges.csv")
from app.algorithms.landmarks import precompute_landmark_distances  # noqa: E402
from app.algorithms.routers import AStarRouter, _heuristic_cost, _edge_cost, _normalize_weights  # noqa: E402


def _nx_time_weight(u, v, d):
    """NetworkX MultiDiGraph-safe time / NORM_TIME edge weight."""
    if not d:
        return float("inf")
    if all(isinstance(vv, dict) for vv in d.values()):
        return min(float(ed.get("time", 0.0)) / NORM_TIME for ed in d.values())
    return float(d.get("time", 0.0)) / NORM_TIME


def _path_total_cost(result, weights):
    if not result or not result.get("edges"):
        return 0.0
    w_time, w_price, w_co2 = _normalize_weights(weights)
    scales = {"time": NORM_TIME, "price": NORM_PRICE, "co2": NORM_CO2}
    total = 0.0
    for _u, _v, ed in result["edges"]:
        total += _edge_cost(ed, w_time, w_price, w_co2, scales=scales)
    return total


def main():
    if not os.path.exists(NODES_CSV) or not os.path.exists(EDGES_CSV):
        print("SKIP: no graph CSV data")
        return 0

    G, node_database = load_graph(NODES_CSV, EDGES_CSV)
    LANDMARK_DISTS = precompute_landmark_distances(G, node_database, k=12)

    nodes_list = list(node_database.keys())
    if len(nodes_list) < 2:
        print("SKIP: graph too small")
        return 0

    # Pick start/end with a path (time-only reachability)
    goal = nodes_list[-1]
    start = nodes_list[0]
    for s in nodes_list[:200]:
        if s != goal and nx.has_path(G, s, goal):
            start = s
            break

    def test_heuristic_admissible():
        for node in nodes_list[:50]:
            h = _heuristic_cost(node, goal, node_database, 1.0, LANDMARK_DISTS)
            try:
                true_cost = nx.dijkstra_path_length(
                    G,
                    node,
                    goal,
                    weight=_nx_time_weight,
                )
            except nx.NetworkXNoPath:
                continue
            assert h <= true_cost + 1e-5, (
                f"Heuristic {h} > true cost {true_cost} at node {node}"
            )
        print("PASS Test 1: heuristic is admissible")

    def test_alt_dominates_haversine():
        alt_wins = 0
        for node in nodes_list[:100]:
            h_geo = _heuristic_cost(node, goal, node_database, 1.0, None)
            h_combined = _heuristic_cost(node, goal, node_database, 1.0, LANDMARK_DISTS)
            if h_combined > h_geo + 1e-12:
                alt_wins += 1
        assert alt_wins >= 50, (
            f"ALT only dominates {alt_wins}/100 nodes — landmarks may be poorly placed"
        )
        print(f"PASS Test 2: ALT dominates haversine on {alt_wins}/100 nodes")

    def test_fewer_nodes_expanded():
        router_old = AStarRouter(G, node_database, landmark_dists=None)
        router_new = AStarRouter(G, node_database, landmark_dists=LANDMARK_DISTS)
        r_old = router_old.find_path(start, goal, {"time": 1.0, "price": 0, "co2": 0})
        r_new = router_new.find_path(start, goal, {"time": 1.0, "price": 0, "co2": 0})
        assert r_old is not None and r_new is not None, "need a valid route for expansion test"
        assert r_new["nodes_expanded"] <= r_old["nodes_expanded"], (
            f"New heuristic expanded MORE nodes: {r_new['nodes_expanded']} vs {r_old['nodes_expanded']}"
        )
        print(
            f"PASS Test 3: {r_old['nodes_expanded']} -> {r_new['nodes_expanded']} nodes"
        )
        return r_old["nodes_expanded"], r_new["nodes_expanded"]

    def test_path_cost_unchanged(exp_old, exp_new):
        router_old = AStarRouter(G, node_database, landmark_dists=None)
        router_new = AStarRouter(G, node_database, landmark_dists=LANDMARK_DISTS)
        w = {"time": 0.5, "price": 0.3, "co2": 0.2}
        r_old = router_old.find_path(start, goal, w)
        r_new = router_new.find_path(start, goal, w)
        assert r_old is not None and r_new is not None
        old_cost = _path_total_cost(r_old, w)
        new_cost = _path_total_cost(r_new, w)
        assert abs(old_cost - new_cost) < 0.001, (
            f"Heuristic changed path cost: {old_cost} → {new_cost}"
        )
        print("PASS Test 4: path cost unchanged (heuristic only improves speed)")
        return exp_old, exp_new

    test_heuristic_admissible()
    test_alt_dominates_haversine()
    exp_old, exp_new = test_fewer_nodes_expanded()
    test_path_cost_unchanged(exp_old, exp_new)
    pct = 100.0 * (1 - exp_new / max(exp_old, 1))
    print(f"Improvement: {pct:.1f}% reduction in node expansions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
