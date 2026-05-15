import heapq
import itertools
from collections import defaultdict
from .routers import BaseRouter, _edge_cost, _normalize_weights, _heuristic_cost
from app.core.config import MODE_FREQUENCIES

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
                
                is_transfer = (current_mode != edge_mode) or edge_mode == "Bus"
                
                # Wait time applies only when boarding (switching to a transit mode)
                is_boarding = (current_mode != edge_mode) and edge_mode != "Walk"
                wait_time = (MODE_FREQUENCIES.get(edge_mode.lower(), 0.0) / 2.0) if is_boarding else 0.0
                
                tentative = g_score[current_state] + _edge_cost(
                    data, w_time, w_price, w_co2, 
                    is_transfer=is_transfer, wait_time=wait_time
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

__all__ = ["AStarRouter"]
