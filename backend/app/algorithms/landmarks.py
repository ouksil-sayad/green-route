"""
ALT Landmark Precomputation for the Green Transit Router.
Computes shortest-path distances from each landmark to all nodes,
using time-only cost (w_time=1, w_price=0, w_co2=0) so the
heuristic remains admissible for any user weight combination.
"""

import networkx as nx
from app.algorithms.routers import _edge_cost

# Number of landmarks — 12 is optimal for Algiers-sized graph (~500-2000 nodes)
# More landmarks = tighter heuristic but more memory and startup time
NUM_LANDMARKS = 12


def _time_only_cost(_u, _v, d):
    """
    Edge weight for landmark precomputation (NetworkX MultiDiGraph).

    The weight callable receives ``d`` as either a single edge attr dict or,
    for MultiDiGraph, ``{key: edge_attr_dict, ...}``. We minimize over parallel
    edges so the landmark tree matches best-case edge choice in time metric.
    """
    if not d:
        return float("inf")
    if all(isinstance(v, dict) for v in d.values()):
        return min(_edge_cost(ed, 1.0, 0.0, 0.0) for ed in d.values())
    return _edge_cost(d, 1.0, 0.0, 0.0)


def select_landmarks_farthest_first(graph, node_database: dict, k: int) -> list:
    """
    Select k landmark nodes using the farthest-first traversal strategy.
    This maximises the spread of landmarks across the graph, which
    maximises the tightness of the ALT lower bounds.

    Algorithm:
      1. Start with any node (highest-degree node = major hub)
      2. Repeatedly add the node farthest from all current landmarks
      3. Stop when k landmarks are selected

    Farthest-first is proven to give a O(log k) approximation to the
    optimal landmark placement for maximising heuristic quality.
    """
    if not node_database:
        return []

    nodes = list(node_database.keys())

    # Seed: use the highest-degree node (most connected = best starting hub)
    seed = max(nodes, key=lambda n: graph.degree(n) if n in graph else 0)

    landmarks = [seed]
    # dist_to_closest_landmark[n] = min distance from n to any selected landmark
    dist_to_closest = {}

    for _ in range(k - 1):
        # Run Dijkstra from last added landmark
        last_L = landmarks[-1]
        if last_L not in graph:
            break

        dists = nx.single_source_dijkstra_path_length(
            graph,
            last_L,
            weight=lambda u, v, d: _time_only_cost(u, v, d),
        )

        # Update closest-landmark distances
        for node, dist in dists.items():
            if node not in dist_to_closest or dist < dist_to_closest[node]:
                dist_to_closest[node] = dist

        # Next landmark = node farthest from all current landmarks
        candidate = max(
            (n for n in nodes if n not in landmarks and n in dist_to_closest),
            key=lambda n: dist_to_closest.get(n, 0.0),
            default=None,
        )
        if candidate is None:
            break
        landmarks.append(candidate)

    return landmarks


def precompute_landmark_distances(graph, node_database: dict, k: int = NUM_LANDMARKS) -> dict:
    """
    Precompute time-only shortest-path distances from every landmark
    to every reachable node in the graph.

    Returns:
        {
            landmark_id: { node_id: time_cost_float, ... },
            ...
        }

    Memory estimate: k × |nodes| floats
    For k=12, |nodes|=1000: ~12,000 floats ≈ negligible
    """
    landmarks = select_landmarks_farthest_first(graph, node_database, k)
    print(f"[ALT] Selected {len(landmarks)} landmarks: {landmarks}")

    landmark_dists = {}
    for L in landmarks:
        if L not in graph:
            continue
        dists = nx.single_source_dijkstra_path_length(
            graph,
            L,
            weight=lambda u, v, d: _time_only_cost(u, v, d),
        )
        landmark_dists[L] = dists
        print(f"[ALT] Landmark {L}: distances computed to {len(dists)} nodes")

    return landmark_dists
