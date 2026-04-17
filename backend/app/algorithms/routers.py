import heapq
import math
from collections import defaultdict


class BaseRouter:
    def __init__(self, graph, node_database=None):
        self.graph = graph
        self.node_database = node_database or {}

    def _reconstruct_path(self, came_from, start, end):
        if end not in came_from and start != end:
            return None

        path, curr = [], end
        while curr in came_from:
            path.append(curr)
            curr = came_from[curr]

        return [start] + path[::-1]

    def find_path(self, start, end, weight):
        raise NotImplementedError("Subclasses of BaseRouter must implement find_path")


def _edge_cost(edge_data, w_time, w_price, w_co2):
    return (
        w_time * float(edge_data.get("time", 0.0))
        + w_price * float(edge_data.get("price", 0.0))
        + w_co2 * float(edge_data.get("co2", 0.0))
    )


def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2.0) ** 2
    return 2.0 * r * math.asin(math.sqrt(a))


def _heuristic_time_mins(node_database, node_id, goal_id, max_speed_kmh=40.0):
    a = node_database.get(node_id)
    b = node_database.get(goal_id)
    if not a or not b:
        return 0.0
    dist_m = _haversine_m(a["lat"], a["lon"], b["lat"], b["lon"])
    speed_m_per_min = (max_speed_kmh * 1000.0) / 60.0
    if speed_m_per_min <= 0:
        return 0.0
    return dist_m / speed_m_per_min


def _virtual_mode_and_base(node_id, mode_prefixes):
    for mode, prefix in mode_prefixes.items():
        if node_id >= prefix:
            base = node_id - prefix
            if base >= 0:
                return mode, base
    return None, None


class AStarRouter(BaseRouter):
    def __init__(self, graph, node_database, mode_prefixes=None, max_speed_kmh=40.0):
        super().__init__(graph, node_database=node_database)
        self.mode_prefixes = mode_prefixes or {"Bus": 100000, "Tram": 200000, "Train": 300000}
        self.max_speed_kmh = float(max_speed_kmh)

    def find_path(self, start, end, weights):
        w_time = float(weights.get("time", 1.0))
        w_price = float(weights.get("price", 0.0))
        w_co2 = float(weights.get("co2", 0.0))

        open_heap = []
        heapq.heappush(open_heap, (0.0, start))

        came_from = {}
        came_from_edge = {}
        g_score = defaultdict(lambda: float("inf"))
        g_score[start] = 0.0

        while open_heap:
            _, current = heapq.heappop(open_heap)
            if current == end:
                nodes_path = self._reconstruct_path(came_from, start, end)
                if not nodes_path:
                    return None
                edges_path = []
                for u, v in zip(nodes_path, nodes_path[1:]):
                    edges_path.append((u, v, came_from_edge[v]))
                return {"nodes": nodes_path, "edges": edges_path}

            for _, neighbor, _key, data in self.graph.out_edges(current, keys=True, data=True):
                tentative = g_score[current] + _edge_cost(data, w_time, w_price, w_co2)
                if tentative < g_score[neighbor]:
                    came_from[neighbor] = current
                    came_from_edge[neighbor] = dict(data)
                    g_score[neighbor] = tentative
                    h = _heuristic_time_mins(
                        self.node_database, neighbor, end, max_speed_kmh=self.max_speed_kmh
                    )
                    f = tentative + (w_time * h)
                    heapq.heappush(open_heap, (f, neighbor))

        return None


def route_to_json(result, node_database, mode_prefixes=None):
    if not result:
        return {
            "status": "error",
            "message": "No route could be found between these locations.",
        }

    mode_prefixes = mode_prefixes or {"Bus": 100000, "Tram": 200000, "Train": 300000}

    total_time = 0.0
    total_co2 = 0.0
    total_price = 0.0
    for _u, _v, ed in result["edges"]:
        total_time += float(ed.get("time", 0.0))
        total_co2 += float(ed.get("co2", 0.0))
        total_price += float(ed.get("price", 0.0))

    def node_info(nid):
        info = node_database.get(nid) or {}
        return {
            "node_id": int(nid),
            "name": str(info.get("name", f"Node {nid}")),
            "lat": float(info.get("lat", 0.0)),
            "lon": float(info.get("lon", 0.0)),
        }

    steps = []
    nodes = result["nodes"]
    edges = result["edges"]
    if not nodes:
        return {"status": "error", "message": "No route could be found between these locations."}

    start = nodes[0]
    s = node_info(start)
    steps.append({**s, "mode": "Walk", "instruction": f"Start at {s['name']}"})

    i = 0
    while i < len(edges):
        _u, v, ed = edges[i]
        mode = ed.get("mode", "Walk")

        # combine Wait + multiple transit edges + alight into one step
        if mode == "Wait":
            j = i + 1
            ride_mode = "Transit"

            while j < len(edges):
                _next_u, next_v, next_ed = edges[j]
                next_mode = next_ed.get("mode", "Walk")

                if next_mode in ("Bus", "Tram", "Train"):
                    ride_mode = next_mode
                    j += 1
                    continue

                if next_mode == "Walk" and float(next_ed.get("time", 0.0)) == 0.0:
                    target_real = next_v
                    t = node_info(target_real)
                    steps.append(
                        {
                            **t,
                            "mode": ride_mode,
                            "instruction": f"Ride the {ride_mode} to {t['name']}",
                        }
                    )
                    i = j + 1
                    break

                break

            if i != j:
                continue

        if mode == "Walk" and float(ed.get("time", 0.0)) == 0.0:
            i += 1
            continue

        t = node_info(v)
        if mode == "Walk":
            instr = f"Walk to {t['name']}"
        elif mode in ("Bus", "Tram", "Train"):
            instr = f"Ride the {mode} to {t['name']}"
        else:
            instr = f"Go to {t['name']}"

        steps.append({**t, "mode": mode, "instruction": instr})
        i += 1

    return {
        "status": "success",
        "metrics": {
            "total_time_mins": round(total_time, 3),
            "total_co2_grams": round(total_co2, 3),
            "total_price_dzd": round(total_price, 3),
        },
        "route_steps": steps,
    }

