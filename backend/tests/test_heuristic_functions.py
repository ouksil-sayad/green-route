"""
Tests for haversine-only vs ALT+haversine combined heuristic behavior.

Uses the processed graph CSVs when present; otherwise skips.
"""
from __future__ import annotations

import os
import sys

import pytest

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

_DATA = os.path.join(BACKEND_ROOT, "data", "processed")
NODES_CSV = os.path.join(_DATA, "nodes.csv")
EDGES_CSV = os.path.join(_DATA, "edges.csv")

pytestmark = pytest.mark.skipif(
    not (os.path.isfile(NODES_CSV) and os.path.isfile(EDGES_CSV)),
    reason="Graph CSVs not found under backend/data/processed",
)


@pytest.fixture(scope="module")
def graph_bundle():
    from app.core.graph_loader import load_graph
    from app.algorithms.landmarks import precompute_landmark_distances

    g, node_db = load_graph(NODES_CSV, EDGES_CSV)
    landmark_dists = precompute_landmark_distances(g, node_db, k=12)
    return g, node_db, landmark_dists


def _pick_start_goal(g, node_db):
    ids = list(node_db.keys())
    if len(ids) < 2:
        pytest.skip("Need at least two nodes")
    import networkx as nx

    goal = ids[-1]
    start = next((s for s in ids[:200] if s != goal and nx.has_path(g, s, goal)), None)
    if start is None:
        pytest.skip("No directed path for sample pair")
    return start, goal


def test_heuristic_combined_ge_haversine_only(graph_bundle):
    """ALT+haversine should never be smaller than haversine-only at any node."""
    from app.algorithms.routers import _heuristic_cost

    g, node_db, landmark_dists = graph_bundle
    start, goal = _pick_start_goal(g, node_db)
    w_time = 1.0
    for nid in list(node_db.keys())[:80]:
        h_geo = _heuristic_cost(nid, goal, node_db, w_time, landmark_dists=None)
        h_both = _heuristic_cost(nid, goal, node_db, w_time, landmark_dists)
        assert h_both + 1e-9 >= h_geo, (nid, h_geo, h_both)


def test_astar_same_cost_both_heuristics(graph_bundle):
    """Admissible heuristics must yield the same optimal weighted cost."""
    from app.algorithms.routers import AStarRouter, _edge_cost, _normalize_weights
    from app.core.config import NORM_TIME, NORM_PRICE, NORM_CO2

    g, node_db, landmark_dists = graph_bundle
    start, goal = _pick_start_goal(g, node_db)
    weights = {"time": 0.5, "price": 0.3, "co2": 0.2}

    def path_cost(res):
        if not res or not res.get("edges"):
            return 0.0
        wt, wp, wc = _normalize_weights(weights)
        scales = {"time": NORM_TIME, "price": NORM_PRICE, "co2": NORM_CO2}
        return sum(_edge_cost(ed, wt, wp, wc, scales=scales) for _u, _v, ed in res["edges"])

    r0 = AStarRouter(g, node_db, landmark_dists=None).find_path(start, goal, weights)
    r1 = AStarRouter(g, node_db, landmark_dists=landmark_dists).find_path(start, goal, weights)
    assert r0 is not None and r1 is not None
    assert abs(path_cost(r0) - path_cost(r1)) < 0.001


def test_alt_reduces_or_equal_expansions(graph_bundle):
    from app.algorithms.routers import AStarRouter

    g, node_db, landmark_dists = graph_bundle
    start, goal = _pick_start_goal(g, node_db)
    weights = {"time": 1.0, "price": 0.0, "co2": 0.0}

    r0 = AStarRouter(g, node_db, landmark_dists=None).find_path(start, goal, weights)
    r1 = AStarRouter(g, node_db, landmark_dists=landmark_dists).find_path(start, goal, weights)
    assert r0 is not None and r1 is not None
    assert r1["nodes_expanded"] <= r0["nodes_expanded"]
