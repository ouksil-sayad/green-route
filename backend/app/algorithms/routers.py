import heapq
import math
from collections import defaultdict
import itertools
from app.core.config import NORM_TIME, NORM_PRICE, NORM_CO2, MAX_SPEED_KMH

class BaseRouter:
    def __init__(self, graph, node_database=None):
        self.graph = graph
        self.node_database = node_database or {}
        # Fixed-dataset mode: use static normalization constants from config.
        self.cost_scales = {"time": NORM_TIME, "price": NORM_PRICE, "co2": NORM_CO2}

    def _reconstruct_path(self, came_from, start, end):
        if end not in came_from and start != end:
            return None

        path = []
        curr = end
        
        while curr is not None and curr in came_from:
            path.append(curr)
            curr = came_from.get(curr)
        
        if not path:
            return [end] if start == end else None
            
        if path[-1] != start:
            path.append(start)
        
        path.reverse()
        if path[0] != start:
            path = [start] + path
            
        if not path or path[0] != start:
            return None
            
        return path

    def find_path(self, start, end, weight):
        raise NotImplementedError("Subclasses of BaseRouter must implement find_path")


def _normalize_weights(weights):
    w_time = max(0.0, float(weights.get("time", 0.33)))
    w_price = max(0.0, float(weights.get("price", 0.33)))
    w_co2 = max(0.0, float(weights.get("co2", 0.34)))
    total = w_time + w_price + w_co2
    if total <= 0.0:
        return 0.33, 0.33, 0.34
    return w_time / total, w_price / total, w_co2 / total


def _edge_cost(edge_data, w_time, w_price, w_co2, scales=None, is_transfer=True):
    scales = scales or {"time": NORM_TIME, "price": NORM_PRICE, "co2": NORM_CO2}
    edge_price = float(edge_data.get("price", 0.0)) if is_transfer else 0.0
    return (
        w_time * (float(edge_data.get("time", 0.0)) / scales["time"])
        + w_price * (edge_price / scales["price"])
        + w_co2 * (float(edge_data.get("co2", 0.0)) / scales["co2"])
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    return 2.0 * R * math.asin(math.sqrt(a))


def _heuristic_cost(
    node_id: int,
    goal_id: int,
    node_database: dict,
    w_time: float,
    landmark_dists: dict | None = None,
) -> float:
    """
    Combined ALT + Haversine admissible, consistent heuristic.

    Mathematical guarantee:
        h(n) ≤ h*(n)  for all n  (admissible)
        h(n) ≤ c(n,m) + h(m)    (consistent / monotone)

    This is proven by the triangle inequality on the cost graph:
        For any landmark L:
            d*(n, goal) ≥ d(L, goal) - d(L, n)   [triangle ineq.]
            d*(n, goal) ≥ d(n, L) - d(goal, L)   [triangle ineq.]
        On this directed graph we use max_L max(0, d(L,goal)-d(L,n)) ≤ d(n,goal).

    The combined heuristic max(h_haversine, h_ALT) is also admissible
    and consistent because max of admissible consistent heuristics is
    admissible and consistent.

    Args:
        node_id:        current node being evaluated
        goal_id:        destination node
        node_database:  {node_id: {"lat": float, "lon": float, ...}}
        w_time:         user's time weight (0.0 to 1.0)
        landmark_dists: precomputed {landmark_id: {node_id: cost}}
                        None → falls back to haversine only

    Returns:
        Scalar lower bound on remaining path cost, scaled by w_time
        and normalized by NORM_TIME. Safe to use with any w_price, w_co2.
    """
    # ── Haversine lower bound ─────────────────────────────────────
    h_geo = 0.0
    node_data = node_database.get(node_id)
    goal_data = node_database.get(goal_id)

    if node_data and goal_data:
        dist_km = _haversine_km(
            node_data["lat"],
            node_data["lon"],
            goal_data["lat"],
            goal_data["lon"],
        )
        # Minimum possible time = straight-line at max network speed
        min_time_mins = (dist_km / MAX_SPEED_KMH) * 60.0
        h_geo = w_time * (min_time_mins / NORM_TIME)

    # ── ALT lower bound ───────────────────────────────────────────
    h_alt = 0.0
    if landmark_dists:
        for _L_id, dists in landmark_dists.items():
            if node_id not in dists or goal_id not in dists:
                continue
            d_L_node = dists[node_id]
            d_L_goal = dists[goal_id]

            # Directed graph: only d(L,goal) <= d(L,node) + d(node,goal) guarantees
            # max(0, d(L,goal) - d(L,node)) <= d(node,goal). The symmetric abs()
            # bound is valid on undirected graphs but can overestimate on MultiDiGraph.
            lower = max(0.0, d_L_goal - d_L_node)

            if lower > h_alt:
                h_alt = lower

        # ALT distances are time-only costs → scale by w_time
        h_alt = w_time * h_alt

    # ── Combined: take the tighter (larger) lower bound ──────────
    # max of two admissible consistent heuristics is admissible + consistent
    return max(h_geo, h_alt)


class AStarRouter(BaseRouter):
    def __init__(
        self,
        graph,
        node_database,
        max_speed_kmh=40.0,
        max_total_walk_km=1.0,
        landmark_dists=None,
    ):
        super().__init__(graph, node_database=node_database)
        self.max_speed_kmh = float(max_speed_kmh)
        self.max_total_walk_m = int(round(float(max_total_walk_km) * 1000.0))
        self.landmark_dists = landmark_dists

    def find_path(self, start, end, weights):
        w_time, w_price, w_co2 = _normalize_weights(weights)

        def _walk_m(edge_data):
            mode = str(edge_data.get("mode", "Walk")).strip().lower()
            if mode != "walk":
                return 0
            dist_km = float(edge_data.get("distance_km", 0.0))
            if dist_km <= 0:
                return 0
            return int(round(dist_km * 1000.0))

        open_heap = []
        tiebreaker = itertools.count()
        start_state = (start, 0, "Walk")  # (node_id, walked_meters, current_mode)
        heapq.heappush(open_heap, (0.0, next(tiebreaker), start_state))

        came_from = {}  # state -> prev_state
        came_from_edge = {}  # state -> edge_data dict
        g_score = defaultdict(lambda: float("inf"))
        g_score[start_state] = 0.0
        closed_states = set()
        expanded_nodes = set()
        state_expansions = 0

        while open_heap:
            _, _, (current, walked_m, current_mode) = heapq.heappop(open_heap)
            current_state = (current, walked_m, current_mode)
            if current_state in closed_states:
                continue
            closed_states.add(current_state)
            state_expansions += 1
            expanded_nodes.add(current)

            if current == end:
                # Reconstruct state path.
                state_path = []
                cur = current_state
                while cur in came_from:
                    state_path.append(cur)
                    cur = came_from[cur]
                state_path.append(start_state)
                state_path.reverse()

                if not state_path or state_path[0] != start_state or state_path[-1][0] != end:
                    return None

                nodes_path = [s[0] for s in state_path]
                edges_path = []
                for prev_state, next_state in zip(state_path, state_path[1:]):
                    u = prev_state[0]
                    v = next_state[0]
                    edges_path.append((u, v, came_from_edge[next_state]))
                return {
                    "nodes": nodes_path,
                    "edges": edges_path,
                    # Keep comparable with Dijkstra/Bidirectional (unique node IDs).
                    "nodes_expanded": len(expanded_nodes),
                    # Extra debug metric for constrained-state A*.
                    "state_expansions": state_expansions,
                    "algorithm": "A* Search",
                }

            for _, neighbor, _key, data in self.graph.out_edges(current, keys=True, data=True):
                edge_mode = str(data.get("mode", "Walk")).strip().capitalize()
                if edge_mode.lower() == "walk":
                    edge_mode = "Walk"

                next_walked_m = walked_m + _walk_m(data)
                if self.max_total_walk_m >= 0 and next_walked_m > self.max_total_walk_m:
                    continue

                neighbor_state = (neighbor, next_walked_m, edge_mode)
                
                is_transfer = (current_mode != edge_mode)
                tentative = g_score[current_state] + _edge_cost(
                    data, w_time, w_price, w_co2, scales=self.cost_scales, is_transfer=is_transfer
                )
                if tentative < g_score[neighbor_state]:
                    came_from[neighbor_state] = current_state
                    came_from_edge[neighbor_state] = dict(data)
                    g_score[neighbor_state] = tentative
                    h = _heuristic_cost(
                        node_id=neighbor,
                        goal_id=end,
                        node_database=self.node_database,
                        w_time=w_time,
                        landmark_dists=self.landmark_dists,
                    )
                    f = tentative + h
                    heapq.heappush(open_heap, (f, next(tiebreaker), neighbor_state))

        return None


def route_to_json(result, node_database):
    if not result:
        return {
            "status": "error",
            "message": "No route could be found between these locations.",
        }

    total_time = 0.0
    total_co2 = 0.0
    total_price = 0.0
    
    prev_calc_mode = "Walk"
    for _u, _v, ed in result["edges"]:
        mode = str(ed.get("mode", "Walk")).strip().capitalize()
        if mode.lower() == "walk":
            mode = "Walk"
            
        total_time += float(ed.get("time", 0.0))
        total_co2 += float(ed.get("co2", 0.0))
        
        if mode != prev_calc_mode:
            total_price += float(ed.get("price", 0.0))
            
        prev_calc_mode = mode

    def node_info(nid):
        info = node_database.get(nid) or {}
        return {
            "node_id": int(nid),
            "name": str(info.get("name", f"Node {nid}")),
            "lat": float(info.get("lat", 0.0)),
            "lon": float(info.get("lon", 0.0)),
        }

    nodes = result["nodes"]
    edges = result["edges"]
    if not nodes or len(nodes) < 2:
        return {"status": "error", "message": "No route could be found between these locations."}

    steps = []
    start = nodes[0]
    s = node_info(start)
    steps.append({
        **s, 
        "mode": "Walk", 
        "instruction": f"Start at {s['name']}", 
        "time": 0.0, 
        "price": 0.0, 
        "co2": 0.0, 
        "distance_km": 0.0, 
        "geometry": [[s['lat'], s['lon']]],
        "from_node": start,
        "to_node": start
    })

    prev_step_mode = "Walk"
    for i, (u, v, ed) in enumerate(edges):
        mode = ed.get("mode", "Walk")
        edge_time = float(ed.get("time", 0.0))
        
        raw_price = float(ed.get("price", 0.0))
        edge_price = raw_price if mode != prev_step_mode else 0.0
        prev_step_mode = mode
        
        edge_co2 = float(ed.get("co2", 0.0))
        edge_dist = float(ed.get("distance_km", 0.0))
        edge_geometry = ed.get("geometry", None)
        
        t = node_info(v)
        
        if mode == "Walk":
            instr = f"Walk to {t['name']}"
        elif mode in ("Bus", "Tram", "Train"):
            instr = f"Ride {mode} to {t['name']}"
        else:
            instr = f"Go to {t['name']}"

        steps.append({
            **t, 
            "mode": mode, 
            "instruction": instr, 
            "time": edge_time, 
            "price": edge_price, 
            "co2": edge_co2, 
            "distance_km": edge_dist, 
            "geometry": edge_geometry,
            "from_node": u,
            "to_node": v
        })

    if len(steps) < 2:
        return {"status": "error", "message": "Insufficient steps in route."}

    segments = []
    prev_mode = None
    for step in steps:
        mode = step.get("mode", "Walk")
        is_transfer = (
            mode not in ("Walk", "Wait")
            and prev_mode is not None
            and prev_mode not in ("Walk", "Wait")
            and mode != prev_mode
        )
        segments.append({
            "from": step.get("name", ""),
            "to": "",
            "mode": mode,
            "distance_km": step.get("distance_km", 0.0),
            "is_transfer": is_transfer,
        })
        if mode not in ("Walk", "Wait"):
            prev_mode = mode

    for idx in range(len(segments) - 1):
        if segments[idx]["to"] == "":
            segments[idx]["to"] = steps[idx + 1].get("name", "")

    return {
        "status": "success",
        "metrics": {
            "total_time_mins": round(total_time, 3),
            "total_co2_grams": round(total_co2, 3),
            "total_price_dzd": round(total_price, 3),
        },
        "route_steps": steps,
        "segments": segments,
    }
