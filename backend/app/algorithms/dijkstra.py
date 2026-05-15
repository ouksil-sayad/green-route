import heapq
from collections import defaultdict
from .routers import BaseRouter, _edge_cost, _normalize_weights
from app.core.config import MODE_FREQUENCIES


class DijkstraRouter(BaseRouter):
    """
    Dijkstra's algorithm on a weighted directed multigraph.
    Finds the shortest path using a priority queue.
    Unlike A*, this does not use a heuristic.
    """

    def __init__(self, graph, node_database=None, max_total_walk_km=1.0):
        super().__init__(graph, node_database=node_database)
        self.max_total_walk_m = int(round(float(max_total_walk_km) * 1000.0))
        self.walk_cap_enabled = self.max_total_walk_m >= 0

    def find_path(self, start: int, end: int, weights: dict) -> dict | None:
        if start not in self.graph or end not in self.graph:
            return None

        if start == end:
            return {
                "nodes": [start],
                "edges": [],
                "nodes_expanded": 0,
                "algorithm": "Dijkstra"
            }

        w_time, w_price, w_co2 = _normalize_weights(weights)

        def _walk_m(edge_data):
            mode = str(edge_data.get("mode", "Walk")).strip().lower()
            if mode != "walk":
                return 0
            dist_km = float(edge_data.get("distance_km", 0.0))
            if dist_km <= 0:
                return 0
            return int(round(dist_km * 1000.0))

        start_state = (start, 0, "Walk")  # (node_id, walked_meters, current_mode)
        open_heap = [(0.0, start_state)]
        heapq.heapify(open_heap)

        came_from = {}
        came_from_edge = {}
        dist = defaultdict(lambda: float("inf"))
        dist[start_state] = 0.0

        expanded_nodes = set()
        state_expansions = 0

        while open_heap:
            current_dist, current_state = heapq.heappop(open_heap)
            current, walked_m, current_mode = current_state

            if current_dist > dist[current_state]:
                continue

            state_expansions += 1
            expanded_nodes.add(current)

            if current == end:
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
                    edges_path.append((prev_state[0], next_state[0], came_from_edge[next_state]))
                return {
                    "nodes": nodes_path,
                    "edges": edges_path,
                    "nodes_expanded": len(expanded_nodes),
                    "state_expansions": state_expansions,
                    "algorithm": "Dijkstra"
                }


            for _, neighbor, _key, data in self.graph.out_edges(current, keys=True, data=True):
                edge_mode = str(data.get("mode", "Walk")).strip().capitalize()
                if edge_mode.lower() == "walk":
                    edge_mode = "Walk"

                next_walked_m = walked_m + _walk_m(data)
                if self.walk_cap_enabled and next_walked_m > self.max_total_walk_m:
                    continue

                neighbor_state = (neighbor, next_walked_m, edge_mode)
                is_transfer = (current_mode != edge_mode) or edge_mode == "Bus"
                
                # Wait time applies only when boarding (switching to a transit mode)
                is_boarding = (current_mode != edge_mode) and edge_mode != "Walk"
                wait_time = (MODE_FREQUENCIES.get(edge_mode.lower(), 0.0) / 2.0) if is_boarding else 0.0
                
                tentative = dist[current_state] + _edge_cost(
                    data, w_time, w_price, w_co2,
                    is_transfer=is_transfer, wait_time=wait_time
                )
                if tentative < dist[neighbor_state]:
                    came_from[neighbor_state] = current_state
                    came_from_edge[neighbor_state] = dict(data)
                    dist[neighbor_state] = tentative
                    heapq.heappush(open_heap, (tentative, neighbor_state))

        return None


__all__ = ["DijkstraRouter"]