import heapq
from collections import defaultdict
import itertools
from collections import deque
from .routers import BaseRouter, _edge_cost, _normalize_weights, _heuristic_cost
from app.core.config import MODE_FREQUENCIES


class BidirectionalDijkstraRouter(BaseRouter):
    """
    Weighted bidirectional Dijkstra on a directed multigraph.
    Uses normalized weighted edge cost so time/price/co2 preferences are respected.
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
                "meeting_node": start,
                "algorithm": "Bidirectional Dijkstra",
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
        end_state = (end, 0, "Walk")        # (node_id, walked_meters, current_mode)

        dist_fwd = defaultdict(lambda: float("inf"))
        dist_bwd = defaultdict(lambda: float("inf"))
        dist_fwd[start_state] = 0.0
        dist_bwd[end_state] = 0.0

        prev_fwd = {start_state: None}
        next_bwd = {end_state: None}
        edge_fwd = {}
        edge_bwd = {}

        pq_fwd = [(0.0, start_state)]
        pq_bwd = [(0.0, end_state)]
        settled_fwd = set()
        settled_bwd = set()
        settled_fwd_by_node = defaultdict(list)
        settled_bwd_by_node = defaultdict(list)

        best_total = float("inf")
        best_balance = float("inf")
        meeting_state_fwd = None
        meeting_state_bwd = None
        nodes_expanded = 0

        def _consider_meeting(fwd_state, bwd_state, total):
            nonlocal best_total, best_balance, meeting_state_fwd, meeting_state_bwd
            balance = abs(dist_fwd[fwd_state] - dist_bwd[bwd_state])
            if total < best_total or (total == best_total and balance < best_balance):
                best_total = total
                best_balance = balance
                meeting_state_fwd = fwd_state
                meeting_state_bwd = bwd_state

        while pq_fwd and pq_bwd:
            if pq_fwd[0][0] + pq_bwd[0][0] > best_total:
                break

            expand_forward = pq_fwd[0][0] <= pq_bwd[0][0]

            if expand_forward:
                current_dist, current_state = heapq.heappop(pq_fwd)
                current, walked_fwd, current_mode_fwd = current_state
                if current_dist > dist_fwd[current_state] or current_state in settled_fwd:
                    continue
                settled_fwd.add(current_state)
                settled_fwd_by_node[current].append(current_state)
                nodes_expanded += 1

                for bwd_state in settled_bwd_by_node.get(current, []):
                    if self.walk_cap_enabled and walked_fwd + bwd_state[1] > self.max_total_walk_m:
                        continue
                    total = current_dist + dist_bwd[bwd_state]
                    _consider_meeting(current_state, bwd_state, total)

                for _, neighbor, _key, data in self.graph.out_edges(current, keys=True, data=True):
                    edge_mode = str(data.get("mode", "Walk")).strip().capitalize()
                    if edge_mode.lower() == "walk":
                        edge_mode = "Walk"
                    walk_step = _walk_m(data)
                    next_walk_fwd = walked_fwd + walk_step
                    if self.walk_cap_enabled and next_walk_fwd > self.max_total_walk_m:
                        continue

                    neighbor_state = (neighbor, next_walk_fwd, edge_mode)
                    is_transfer = (current_mode_fwd != edge_mode) or edge_mode == "Bus"
                    
                    is_boarding = (current_mode_fwd != edge_mode) and edge_mode != "Walk"
                    wait_time = (MODE_FREQUENCIES.get(edge_mode.lower(), 0.0) / 2.0) if is_boarding else 0.0
                    
                    step = _edge_cost(data, w_time, w_price, w_co2, is_transfer=is_transfer, wait_time=wait_time)
                    tentative = current_dist + step
                    if tentative < dist_fwd[neighbor_state]:
                        dist_fwd[neighbor_state] = tentative
                        prev_fwd[neighbor_state] = current_state
                        edge_fwd[neighbor_state] = dict(data)
                        heapq.heappush(pq_fwd, (tentative, neighbor_state))
                        for bwd_state in settled_bwd_by_node.get(neighbor, []):
                            if self.walk_cap_enabled and next_walk_fwd + bwd_state[1] > self.max_total_walk_m:
                                continue
                            total = tentative + dist_bwd[bwd_state]
                            _consider_meeting(neighbor_state, bwd_state, total)
            else:
                current_dist, current_state = heapq.heappop(pq_bwd)
                current, walked_bwd, current_mode_bwd = current_state
                if current_dist > dist_bwd[current_state] or current_state in settled_bwd:
                    continue
                settled_bwd.add(current_state)
                settled_bwd_by_node[current].append(current_state)
                nodes_expanded += 1

                for fwd_state in settled_fwd_by_node.get(current, []):
                    if self.walk_cap_enabled and walked_bwd + fwd_state[1] > self.max_total_walk_m:
                        continue
                    total = current_dist + dist_fwd[fwd_state]
                    _consider_meeting(fwd_state, current_state, total)

                for predecessor, _, _key, data in self.graph.in_edges(current, keys=True, data=True):
                    edge_mode = str(data.get("mode", "Walk")).strip().capitalize()
                    if edge_mode.lower() == "walk":
                        edge_mode = "Walk"
                    walk_step = _walk_m(data)
                    next_walk_bwd = walked_bwd + walk_step
                    if self.walk_cap_enabled and next_walk_bwd > self.max_total_walk_m:
                        continue

                    # Backward search: the predecessor's outgoing mode IS edge_mode.
                    # We charge fare only if this edge's mode differs from the mode
                    # we arrived at `current` with (i.e., the backward frontier's mode).
                    predecessor_state = (predecessor, next_walk_bwd, edge_mode)
                    is_transfer = (current_mode_bwd != edge_mode) or edge_mode == "Bus"
                    
                    is_boarding = (current_mode_bwd != edge_mode) and edge_mode != "Walk"
                    wait_time = (MODE_FREQUENCIES.get(edge_mode.lower(), 0.0) / 2.0) if is_boarding else 0.0
                    
                    step = _edge_cost(data, w_time, w_price, w_co2, is_transfer=is_transfer, wait_time=wait_time)
                    tentative = current_dist + step
                    if tentative < dist_bwd[predecessor_state]:
                        dist_bwd[predecessor_state] = tentative
                        next_bwd[predecessor_state] = current_state
                        edge_bwd[predecessor_state] = dict(data)
                        heapq.heappush(pq_bwd, (tentative, predecessor_state))
                        for fwd_state in settled_fwd_by_node.get(predecessor, []):
                            if self.walk_cap_enabled and next_walk_bwd + fwd_state[1] > self.max_total_walk_m:
                                continue
                            total = tentative + dist_fwd[fwd_state]
                            _consider_meeting(fwd_state, predecessor_state, total)

        if meeting_state_fwd is None or meeting_state_bwd is None:
            return None

        fwd_states = []
        curr = meeting_state_fwd
        while curr is not None:
            fwd_states.append(curr)
            curr = prev_fwd.get(curr)
        fwd_states.reverse()

        bwd_states = []
        curr = next_bwd.get(meeting_state_bwd)
        while curr is not None:
            bwd_states.append(curr)
            curr = next_bwd.get(curr)

        fwd_nodes = [state[0] for state in fwd_states]
        bwd_nodes = [state[0] for state in bwd_states]
        full_nodes = fwd_nodes + bwd_nodes
        if not full_nodes or full_nodes[0] != start or full_nodes[-1] != end:
            return None
        reported_meeting_node = meeting_state_fwd[0]

        full_edges = []
        for prev_state, next_state in zip(fwd_states, fwd_states[1:]):
            full_edges.append((prev_state[0], next_state[0], edge_fwd[next_state]))
        curr = meeting_state_bwd
        while curr in next_bwd and next_bwd[curr] is not None:
            nxt = next_bwd[curr]
            full_edges.append((curr[0], nxt[0], edge_bwd[curr]))
            curr = nxt

        return {
            "nodes": full_nodes,
            "edges": full_edges,
            "nodes_expanded": nodes_expanded,
            "meeting_node": reported_meeting_node,
            "algorithm": "Bidirectional Dijkstra",
        }


class BidirectionalBFSRouter(BaseRouter):
    """
    Unweighted bidirectional BFS on a directed multigraph (treats each edge as cost=1).

    Notes:
    - Still respects the walking cap via (node, walked_meters) state, same as other routers.
    - Ignores weights (time/price/co2) for the search order, but returns the real edge attributes
      so metrics/visualization remain correct.
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
                "meeting_node": start,
                "algorithm": "Bidirectional BFS",
            }

        def _walk_m(edge_data):
            mode = str(edge_data.get("mode", "Walk")).strip().lower()
            if mode != "walk":
                return 0
            dist_km = float(edge_data.get("distance_km", 0.0))
            if dist_km <= 0:
                return 0
            return int(round(dist_km * 1000.0))

        start_state = (start, 0)
        end_state = (end, 0)

        q_fwd = deque([start_state])
        q_bwd = deque([end_state])

        prev_fwd = {start_state: None}
        next_bwd = {end_state: None}
        edge_fwd = {}
        edge_bwd = {}

        visited_fwd_by_node = defaultdict(list)
        visited_bwd_by_node = defaultdict(list)
        visited_fwd_by_node[start].append(start_state)
        visited_bwd_by_node[end].append(end_state)

        expanded_nodes = set()
        state_expansions = 0

        meeting_state_fwd = None
        meeting_state_bwd = None

        def _cap_ok(fwd_walk, bwd_walk):
            return (not self.walk_cap_enabled) or (fwd_walk + bwd_walk <= self.max_total_walk_m)

        while q_fwd and q_bwd and meeting_state_fwd is None:
            # Expand the smaller frontier to keep work balanced.
            expand_forward = len(q_fwd) <= len(q_bwd)

            if expand_forward:
                current_state = q_fwd.popleft()
                current, walked_fwd = current_state
                state_expansions += 1
                expanded_nodes.add(current)

                for bwd_state in visited_bwd_by_node.get(current, []):
                    if _cap_ok(walked_fwd, bwd_state[1]):
                        meeting_state_fwd = current_state
                        meeting_state_bwd = bwd_state
                        break
                if meeting_state_fwd is not None:
                    break

                for _, neighbor, _key, data in self.graph.out_edges(current, keys=True, data=True):
                    next_walk = walked_fwd + _walk_m(data)
                    if self.walk_cap_enabled and next_walk > self.max_total_walk_m:
                        continue
                    ns = (neighbor, next_walk)
                    if ns in prev_fwd:
                        continue
                    prev_fwd[ns] = current_state
                    edge_fwd[ns] = dict(data)
                    visited_fwd_by_node[neighbor].append(ns)
                    q_fwd.append(ns)
            else:
                current_state = q_bwd.popleft()
                current, walked_bwd = current_state
                state_expansions += 1
                expanded_nodes.add(current)

                for fwd_state in visited_fwd_by_node.get(current, []):
                    if _cap_ok(fwd_state[1], walked_bwd):
                        meeting_state_fwd = fwd_state
                        meeting_state_bwd = current_state
                        break
                if meeting_state_fwd is not None:
                    break

                for predecessor, _, _key, data in self.graph.in_edges(current, keys=True, data=True):
                    next_walk = walked_bwd + _walk_m(data)
                    if self.walk_cap_enabled and next_walk > self.max_total_walk_m:
                        continue
                    ps = (predecessor, next_walk)
                    if ps in next_bwd:
                        continue
                    next_bwd[ps] = current_state
                    edge_bwd[ps] = dict(data)  # predecessor -> current (forward direction)
                    visited_bwd_by_node[predecessor].append(ps)
                    q_bwd.append(ps)

        if meeting_state_fwd is None or meeting_state_bwd is None:
            return None

        # Reconstruct forward side
        fwd_states = []
        cur = meeting_state_fwd
        while cur is not None:
            fwd_states.append(cur)
            cur = prev_fwd.get(cur)
        fwd_states.reverse()

        # Reconstruct backward side (meeting -> end) using next_bwd starting at meeting_state_bwd
        bwd_states = []
        cur = meeting_state_bwd
        while cur is not None:
            bwd_states.append(cur)
            cur = next_bwd.get(cur)
        bwd_states = bwd_states[1:]  # drop meeting node duplicate

        full_states = fwd_states + bwd_states
        full_nodes = [s[0] for s in full_states]
        if not full_nodes or full_nodes[0] != start or full_nodes[-1] != end:
            return None

        full_edges = []
        for prev_state, next_state in zip(full_states, full_states[1:]):
            if next_state in edge_fwd:
                full_edges.append((prev_state[0], next_state[0], edge_fwd[next_state]))
            else:
                ed = edge_bwd.get(prev_state)
                if ed is None:
                    return None
                full_edges.append((prev_state[0], next_state[0], ed))

        return {
            "nodes": full_nodes,
            "edges": full_edges,
            "nodes_expanded": len(expanded_nodes),
            "state_expansions": state_expansions,
            "meeting_node": meeting_state_fwd[0],
            "algorithm": "Bidirectional BFS",
        }


class BidirectionalAStarRouter(BaseRouter):
    """
    Bidirectional A* on a weighted directed multigraph.

    This runs two simultaneous A* searches:
    - forward: start -> goal using h(n)=heuristic(n, goal)
    - backward: goal -> start using h(n)=heuristic(n, start) on reversed edges

    Supports the same "walking cap" mechanism as other routers via a (node, walked_meters) state.
    """

    def __init__(
        self,
        graph,
        node_database=None,
        max_speed_kmh=40.0,
        max_total_walk_km=1.0,
        landmark_dists=None,
    ):
        super().__init__(graph, node_database=node_database)
        self.max_speed_kmh = float(max_speed_kmh)
        self.max_total_walk_m = int(round(float(max_total_walk_km) * 1000.0))
        self.walk_cap_enabled = self.max_total_walk_m >= 0
        self.landmark_dists = landmark_dists

    def find_path(self, start: int, end: int, weights: dict) -> dict | None:
        if start not in self.graph or end not in self.graph:
            return None

        if start == end:
            return {
                "nodes": [start],
                "edges": [],
                "nodes_expanded": 0,
                "meeting_node": start,
                "algorithm": "Bidirectional A*",
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

        def _h_fwd(node_id: int) -> float:
            return _heuristic_cost(
                node_id=node_id,
                goal_id=end,
                node_database=self.node_database,
                w_time=w_time,
                landmark_dists=self.landmark_dists,
            )

        def _h_bwd(node_id: int) -> float:
            return _heuristic_cost(
                node_id=node_id,
                goal_id=start,
                node_database=self.node_database,
                w_time=w_time,
                landmark_dists=self.landmark_dists,
            )

        start_state = (start, 0, "Walk")  # (node_id, walked_meters, current_mode)
        end_state = (end, 0, "Walk")        # (node_id, walked_meters, current_mode)

        g_fwd = defaultdict(lambda: float("inf"))
        g_bwd = defaultdict(lambda: float("inf"))
        g_fwd[start_state] = 0.0
        g_bwd[end_state] = 0.0

        prev_fwd = {start_state: None}   # state -> previous state
        next_bwd = {end_state: None}     # state -> next state toward end (in forward direction)
        edge_fwd = {}                    # state -> edge_data
        edge_bwd = {}                    # state -> edge_data (forward direction for reconstruction)

        open_fwd = []
        open_bwd = []
        tie = itertools.count()
        heapq.heappush(open_fwd, (0.0 + _h_fwd(start), next(tie), start_state))
        heapq.heappush(open_bwd, (0.0 + _h_bwd(end), next(tie), end_state))

        settled_fwd = set()
        settled_bwd = set()
        settled_fwd_by_node = defaultdict(list)
        settled_bwd_by_node = defaultdict(list)

        best_total = float("inf")
        best_balance = float("inf")
        meeting_state_fwd = None
        meeting_state_bwd = None

        expanded_nodes = set()
        state_expansions = 0

        def _consider_meeting(fwd_state, bwd_state, total):
            nonlocal best_total, best_balance, meeting_state_fwd, meeting_state_bwd
            balance = abs(g_fwd[fwd_state] - g_bwd[bwd_state])
            if total < best_total or (total == best_total and balance < best_balance):
                best_total = total
                best_balance = balance
                meeting_state_fwd = fwd_state
                meeting_state_bwd = bwd_state

        while open_fwd and open_bwd:
            min_f_fwd = open_fwd[0][0]
            min_f_bwd = open_bwd[0][0]
            if min_f_fwd + min_f_bwd >= best_total:
                break

            expand_forward = min_f_fwd <= min_f_bwd

            if expand_forward:
                _f, _t, current_state = heapq.heappop(open_fwd)
                current, walked_fwd, current_mode_fwd = current_state
                if current_state in settled_fwd:
                    continue
                settled_fwd.add(current_state)
                settled_fwd_by_node[current].append(current_state)
                state_expansions += 1
                expanded_nodes.add(current)

                # Meeting check with already-settled backward states at same node.
                for bwd_state in settled_bwd_by_node.get(current, []):
                    if self.walk_cap_enabled and walked_fwd + bwd_state[1] > self.max_total_walk_m:
                        continue
                    total = g_fwd[current_state] + g_bwd[bwd_state]
                    _consider_meeting(current_state, bwd_state, total)

                for _, neighbor, _key, data in self.graph.out_edges(current, keys=True, data=True):
                    edge_mode = str(data.get("mode", "Walk")).strip().capitalize()
                    if edge_mode.lower() == "walk":
                        edge_mode = "Walk"
                    walk_step = _walk_m(data)
                    next_walk = walked_fwd + walk_step
                    if self.walk_cap_enabled and next_walk > self.max_total_walk_m:
                        continue

                    neighbor_state = (neighbor, next_walk, edge_mode)
                    is_transfer = (current_mode_fwd != edge_mode) or edge_mode == "Bus"
                    
                    is_boarding = (current_mode_fwd != edge_mode) and edge_mode != "Walk"
                    wait_time = (MODE_FREQUENCIES.get(edge_mode.lower(), 0.0) / 2.0) if is_boarding else 0.0
                    
                    tentative = g_fwd[current_state] + _edge_cost(
                        data, w_time, w_price, w_co2, is_transfer=is_transfer, wait_time=wait_time
                    )
                    if tentative < g_fwd[neighbor_state]:
                        g_fwd[neighbor_state] = tentative
                        prev_fwd[neighbor_state] = current_state
                        edge_fwd[neighbor_state] = dict(data)
                        fscore = tentative + _h_fwd(neighbor)
                        heapq.heappush(open_fwd, (fscore, next(tie), neighbor_state))

                        for bwd_state in settled_bwd_by_node.get(neighbor, []):
                            if self.walk_cap_enabled and next_walk + bwd_state[1] > self.max_total_walk_m:
                                continue
                            total = tentative + g_bwd[bwd_state]
                            _consider_meeting(neighbor_state, bwd_state, total)
            else:
                _f, _t, current_state = heapq.heappop(open_bwd)
                current, walked_bwd, current_mode_bwd = current_state
                if current_state in settled_bwd:
                    continue
                settled_bwd.add(current_state)
                settled_bwd_by_node[current].append(current_state)
                state_expansions += 1
                expanded_nodes.add(current)

                for fwd_state in settled_fwd_by_node.get(current, []):
                    if self.walk_cap_enabled and walked_bwd + fwd_state[1] > self.max_total_walk_m:
                        continue
                    total = g_bwd[current_state] + g_fwd[fwd_state]
                    _consider_meeting(fwd_state, current_state, total)

                # Backward search traverses incoming edges, but for reconstruction we keep forward direction.
                for predecessor, _, _key, data in self.graph.in_edges(current, keys=True, data=True):
                    edge_mode = str(data.get("mode", "Walk")).strip().capitalize()
                    if edge_mode.lower() == "walk":
                        edge_mode = "Walk"
                    walk_step = _walk_m(data)
                    next_walk = walked_bwd + walk_step
                    if self.walk_cap_enabled and next_walk > self.max_total_walk_m:
                        continue

                    pred_state = (predecessor, next_walk, edge_mode)
                    is_transfer = (current_mode_bwd != edge_mode) or edge_mode == "Bus"
                    
                    is_boarding = (current_mode_bwd != edge_mode) and edge_mode != "Walk"
                    wait_time = (MODE_FREQUENCIES.get(edge_mode.lower(), 0.0) / 2.0) if is_boarding else 0.0
                    
                    tentative = g_bwd[current_state] + _edge_cost(
                        data, w_time, w_price, w_co2, is_transfer=is_transfer, wait_time=wait_time
                    )
                    if tentative < g_bwd[pred_state]:
                        g_bwd[pred_state] = tentative
                        next_bwd[pred_state] = current_state
                        # edge in forward direction: predecessor -> current
                        edge_bwd[pred_state] = dict(data)
                        fscore = tentative + _h_bwd(predecessor)
                        heapq.heappush(open_bwd, (fscore, next(tie), pred_state))

                        for fwd_state in settled_fwd_by_node.get(predecessor, []):
                            if self.walk_cap_enabled and next_walk + fwd_state[1] > self.max_total_walk_m:
                                continue
                            total = tentative + g_fwd[fwd_state]
                            _consider_meeting(fwd_state, pred_state, total)

        if meeting_state_fwd is None or meeting_state_bwd is None:
            return None

        # Reconstruct full path from start -> meeting using prev_fwd states
        fwd_states = []
        cur = meeting_state_fwd
        while cur is not None:
            fwd_states.append(cur)
            cur = prev_fwd.get(cur)
        fwd_states.reverse()

        # Reconstruct meeting -> end using next_bwd starting at meeting_state_bwd
        bwd_states = []
        cur = meeting_state_bwd
        while cur is not None:
            bwd_states.append(cur)
            cur = next_bwd.get(cur)
        # bwd_states includes meeting_state_bwd as first; we want nodes after meeting for concatenation
        bwd_states = bwd_states[1:]

        full_states = fwd_states + bwd_states
        if not full_states or full_states[0][0] != start or full_states[-1][0] != end:
            return None

        full_nodes = [s[0] for s in full_states]
        full_edges = []
        for prev_state, next_state in zip(full_states, full_states[1:]):
            if next_state in edge_fwd:
                full_edges.append((prev_state[0], next_state[0], edge_fwd[next_state]))
            else:
                # In the backward half, edges are stored on the "from" state.
                ed = edge_bwd.get(prev_state)
                if ed is None:
                    return None
                full_edges.append((prev_state[0], next_state[0], ed))

        return {
            "nodes": full_nodes,
            "edges": full_edges,
            "nodes_expanded": len(expanded_nodes),
            "state_expansions": state_expansions,
            "meeting_node": meeting_state_fwd[0],
            "algorithm": "Bidirectional A*",
        }


__all__ = ["BidirectionalDijkstraRouter", "BidirectionalBFSRouter", "BidirectionalAStarRouter"]