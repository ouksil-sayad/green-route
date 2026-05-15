import time

# pyrefly: ignore [missing-import]
from flask import Blueprint, request, jsonify
from app.algorithms.routers import AStarRouter, route_to_json, _edge_cost, _normalize_weights
from app.algorithms.bidirectional import (
    BidirectionalAStarRouter,
    BidirectionalBFSRouter,
    BidirectionalDijkstraRouter,
)
from app.algorithms.dijkstra import DijkstraRouter
from app.algorithms.landmarks import precompute_landmark_distances
from app.core.config import NORM_TIME, NORM_PRICE, NORM_CO2

api_bp = Blueprint("api", __name__, url_prefix="/api")

G = None
node_database = None
LANDMARK_DISTS = None


def init_routes(graph, node_db):
    global G, node_database, LANDMARK_DISTS
    G = graph
    node_database = node_db
    print("[ALT] Precomputing landmark distances...")
    LANDMARK_DISTS = precompute_landmark_distances(G, node_database or {}, k=12)
    print(f"[ALT] Done. {len(LANDMARK_DISTS)} landmarks ready.")


def parse_route_request():
    body = request.get_json(force=True, silent=True)
    if not body:
        return None, None, None, "Request body must be valid JSON"

    try:
        start = int(body["start"])
        end = int(body["end"])
    except (KeyError, ValueError, TypeError):
        return None, None, None, "Fields 'start' and 'end' must be integers"

    raw_w = body.get("weights", {})
    w_time = float(raw_w.get("time", 0.33))
    w_price = float(raw_w.get("price", 0.33))
    w_co2 = float(raw_w.get("co2", 0.34))

    total = w_time + w_price + w_co2
    if total > 0:
        w_time /= total
        w_price /= total
        w_co2 /= total
    else:
        w_time, w_price, w_co2 = 0.33, 0.33, 0.34

    weights = {"time": w_time, "price": w_price, "co2": w_co2}

    if G and start not in G:
        return None, None, None, f"Start node {start} not found in graph"
    if G and end not in G:
        return None, None, None, f"End node {end} not found in graph"

    return start, end, weights, None


def build_route_response(result, algorithm_name):
    base = route_to_json(result, node_database)
    if base.get("status") == "error":
        return base

    total = round(base.get("metrics", {}).get("total_price_dzd", 0), 2)
    subtotal = round(total * 0.85, 2)
    tax = round(total - subtotal, 2)

    price_breakdown = {
        "segments": base.get("segments", []),
        "total": total,
        "subtotal": subtotal,
        "tax": tax,
    }

    base["price_breakdown"] = price_breakdown
    base["meta"] = {
        "algorithm": algorithm_name,
        "nodes_expanded": result.get("nodes_expanded", 0),
        "weights_used": result.get("weights", {}),
        "normalization_factors": {
            "time_minutes_per_unit": NORM_TIME,
            "price_dzd_per_unit": NORM_PRICE,
            "co2_grams_per_unit": NORM_CO2,
        },
    }

    return base


def _weighted_path_cost(result, weights):
    """Sum of per-edge `_edge_cost` along a router result (same units as the search)."""
    if not result or not result.get("edges"):
        return 0.0
    w_time, w_price, w_co2 = _normalize_weights(weights)
    scales = {"time": NORM_TIME, "price": NORM_PRICE, "co2": NORM_CO2}
    total = 0.0
    for _u, _v, ed in result["edges"]:
        total += _edge_cost(ed, w_time, w_price, w_co2, scales=scales)
    return total


def _run_astar_with_heuristic(start, end, weights, landmark_dists):
    """
    Same walk-cap policy as /api/route: try 1 km total walk, then relax if needed.
    Returns (metrics_dict or None).
    """
    t0 = time.perf_counter()
    router = AStarRouter(
        graph=G,
        node_database=node_database,
        max_total_walk_km=1.0,
        landmark_dists=landmark_dists,
    )
    result = router.find_path(start, end, weights)
    relaxed = False
    if result is None:
        router = AStarRouter(
            graph=G,
            node_database=node_database,
            max_total_walk_km=-1.0,
            landmark_dists=landmark_dists,
        )
        result = router.find_path(start, end, weights)
        relaxed = result is not None
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    if result is None:
        return None
    cost = _weighted_path_cost(result, weights)
    return {
        "nodes_expanded": result["nodes_expanded"],
        "state_expansions": result.get("state_expansions", 0),
        "elapsed_ms": round(elapsed_ms, 4),
        "weighted_path_cost": round(cost, 6),
        "path_node_count": len(result["nodes"]),
        "walk_cap_relaxed": relaxed,
    }


def extract_edge_data(graph, u, v):
    data = graph.get_edge_data(u, v)
    if data is None:
        data = graph.get_edge_data(v, u)
    if data is None:
        return {}

    # MultiGraph/MultiDiGraph case:
    if isinstance(data, dict) and data and all(isinstance(value, dict) for value in data.values()):
        edges = list(data.values())
        mode_keys = ["mode", "transport_mode", "type", "transport", "vehicle", "line_type", "route_type", "travel_mode"]
        edges_with_mode = [edge for edge in edges if any(edge.get(key) for key in mode_keys)]
        if edges_with_mode:
            return min(edges_with_mode, key=lambda e: float(e.get("weight", e.get("cost", e.get("time", 0))) or 0))
        return min(edges, key=lambda e: float(e.get("weight", e.get("cost", e.get("time", 0))) or 0))
    return data


def infer_segment_mode(edge_data, from_node, to_node):
    possible_keys = ["mode", "transport_mode", "type", "transport", "vehicle", "line_type", "route_type", "travel_mode"]
    raw_mode = None
    for key in possible_keys:
        val = edge_data.get(key)
        if val:
            raw_mode = str(val)
            break

    def normalize(m):
        v = str(m or "").lower()
        if "bus" in v: return "bus"
        if "tram" in v: return "tram"
        if "metro" in v or "train" in v: return "metro"
        if any(x in v for x in ["walk", "foot", "pedestrian"]): return "walk"
        return "default"

    normalized = normalize(raw_mode)
    if normalized != "default":
        return normalized, raw_mode

    money = edge_data.get("money") or edge_data.get("cost") or edge_data.get("fare") or edge_data.get("price") or 0
    try:
        money_val = float(money)
    except:
        money_val = 0

    text_blob = " ".join([
        str(raw_mode or ""),
        str(edge_data.get("name", "")),
        str(edge_data.get("route", "")),
        str(edge_data.get("line", "")),
        str(from_node.get("name", "") if isinstance(from_node, dict) else ""),
        str(to_node.get("name", "") if isinstance(to_node, dict) else ""),
        str(from_node.get("mode", "") if isinstance(from_node, dict) else ""),
        str(to_node.get("mode", "") if isinstance(to_node, dict) else "")
    ]).lower()

    if money_val > 0:
        if "bus" in text_blob: return "bus", raw_mode or "inferred_bus"
        if "tram" in text_blob: return "tram", raw_mode or "inferred_tram"
        if "metro" in text_blob or "train" in text_blob: return "metro", raw_mode or "inferred_metro"
        return "bus", raw_mode or "inferred_transit"

    if any(x in text_blob for x in ["walk", "foot"]):
        return "walk", raw_mode or "inferred_walk"

    return "default", raw_mode or "unknown"


@api_bp.route("/benchmark/astar-heuristics", methods=["POST"])
def benchmark_astar_heuristics():
    """
    Compare A* with haversine-only vs ALT+haversine heuristics (same graph, weights, walk policy).
    Does not change production /api/route behavior.
    """
    start, end, weights, err = parse_route_request()
    if err:
        return jsonify({"status": "error", "message": err}), 400

    if G is None:
        return jsonify({"status": "error", "message": "Graph not loaded"}), 500

    try:
        h_geo = _run_astar_with_heuristic(start, end, weights, landmark_dists=None)
        h_alt = _run_astar_with_heuristic(start, end, weights, LANDMARK_DISTS)
        if h_geo is None or h_alt is None:
            return jsonify({
                "status": "error",
                "message": "No path found between these two points for one or both heuristic modes.",
            }), 404

        c_geo = h_geo["weighted_path_cost"]
        c_alt = h_alt["weighted_path_cost"]
        costs_match = abs(c_geo - c_alt) < 0.001
        n_geo = max(h_geo["nodes_expanded"], 1)
        n_alt = h_alt["nodes_expanded"]
        reduction_pct = round(100.0 * (1.0 - n_alt / n_geo), 2)

        return jsonify({
            "status": "success",
            "start": start,
            "end": end,
            "weights": weights,
            "landmark_count": len(LANDMARK_DISTS) if LANDMARK_DISTS else 0,
            "haversine_only": h_geo,
            "alt_and_haversine": h_alt,
            "costs_match": costs_match,
            "nodes_expanded_reduction_percent": reduction_pct,
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@api_bp.route("/route", methods=["POST"])
def astar_route():
    body = request.get_json(force=True, silent=True)
    if not body:
        return jsonify({"success": False, "error": "Request body must be valid JSON"}), 400

    start = body.get("start")
    end = body.get("end")
    weights = body.get("weights")

    if start is None or end is None or weights is None:
        return jsonify({"success": False, "error": "Missing start, end, or weights"}), 400

    required_weights = ["time", "money", "co2"]
    for w in required_weights:
        if w not in weights:
            return jsonify({"success": False, "error": f"Weight '{w}' is required"}), 400

    # Adapt weights to backend internal names (money -> price)
    backend_weights = {
        "time": float(weights["time"]),
        "price": float(weights["money"]),
        "co2": float(weights["co2"])
    }

    # Convert start/end to int if they are strings (e.g. "1")
    try:
        start_id = int(start)
        end_id = int(end)
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "start and end must be integers or integer strings"}), 400

    if G and start_id not in G:
        return jsonify({"success": False, "error": f"Start node {start_id} not found"}), 404
    if G and end_id not in G:
        return jsonify({"success": False, "error": f"End node {end_id} not found"}), 404

    try:
        # Soft walking constraint: try <=1km first, then relax only if needed.
        router = AStarRouter(
            graph=G,
            node_database=node_database,
            max_total_walk_km=1.0,
            landmark_dists=LANDMARK_DISTS,
        )
        result = router.find_path(start_id, end_id, backend_weights)
        
        if result is None:
            relaxed_router = AStarRouter(
                graph=G,
                node_database=node_database,
                max_total_walk_km=-1.0,
                landmark_dists=LANDMARK_DISTS,
            )
            result = relaxed_router.find_path(start_id, end_id, backend_weights)

        if result is None:
            return jsonify({
                "success": False,
                "error": "No path found between these two points."
            }), 404

        # Convert result to JSON using existing logic
        base_json = route_to_json(result, node_database)
        
        # Adapt to frontend-friendly JSON requested by user
        route_steps = base_json.get("route_steps", [])
        
        # Extract coordinates from geometry if available, else from nodes
        coordinates = []
        path_nodes = []
        
        for step in route_steps:
            path_nodes.append({
                "id": step["node_id"],
                "name": step["name"],
                "lat": step["lat"],
                "lon": step["lon"],
                "mode": step.get("mode", "Walk")
            })
            
            # If step has geometry (list of [lat, lon]), add them
            if step.get("geometry"):
                for coord in step["geometry"]:
                    coordinates.append(coord)
            else:
                coordinates.append([step["lat"], step["lon"]])

        # Remove duplicate consecutive coordinates if any
        final_coords = []
        for c in coordinates:
            if not final_coords or c != final_coords[-1]:
                final_coords.append(c)

        # Path is node sequence
        path_ids = result.get("nodes", [])
        
        segments = []
        prev_mode = "walk"
        # Iterate through consecutive nodes in the A* path to build segments with real edge data
        for i in range(len(path_ids) - 1):
            u, v = path_ids[i], path_ids[i+1]
            edge_data = extract_edge_data(G, u, v)
            from_info = node_database.get(u, {})
            to_info = node_database.get(v, {})
            
            mode, raw_mode = infer_segment_mode(edge_data, from_info, to_info)
            
            # Get metrics from edge
            seg_time = float(edge_data.get("time", edge_data.get("weight", 0)))
            
            # More robust price extraction
            raw_money = float(edge_data.get("price") or edge_data.get("money") or edge_data.get("cost") or 0)
            
            # Apply the bus fare rule
            seg_money = raw_money if (mode != prev_mode or mode == "bus") else 0.0
            prev_mode = mode
            
            seg_co2 = float(edge_data.get("co2", 0))

            # Extract coordinates from edge geometry if available
            seg_coords = []
            if edge_data.get("geometry"):
                seg_coords = edge_data["geometry"]
            else:
                seg_coords = [[from_info.get("lat", 0), from_info.get("lon", 0)], 
                             [to_info.get("lat", 0), to_info.get("lon", 0)]]

            segments.append({
                "from": from_info.get("name", str(u)),
                "to": to_info.get("name", str(v)),
                "mode": mode,
                "raw_mode": raw_mode,
                "distance_km": float(edge_data.get("distance_km", 0)),
                "time": seg_time,
                "money": seg_money,
                "co2": seg_co2,
                "coordinates": seg_coords
            })

        # Debug logs for backend verification
        print(f"A* PATH: {path_ids}")
        for idx, s in enumerate(segments):
            print(f"SEGMENT {idx}: {s['from']} -> {s['to']} | mode: {s['mode']} ({s['raw_mode']}) | money: {s['money']} | co2: {s['co2']}")

        response = {
            "success": True,
            "route": {
                "path": path_nodes,
                "coordinates": final_coords,
                "segments": segments,
                "totals": {
                    "time": base_json["metrics"]["total_time_mins"],
                    "money": base_json["metrics"]["total_price_dzd"],
                    "co2": base_json["metrics"]["total_co2_grams"]
                }
            }
        }
        
        return jsonify(response), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@api_bp.route("/route/bidirectional", methods=["POST"])
def bidirectional_route():
    start, end, weights, err = parse_route_request()
    if err:
        return jsonify({"status": "error", "message": err}), 400

    try:
        # Soft walking constraint: try <=1km first, then relax only if needed.
        router = BidirectionalAStarRouter(
            graph=G,
            node_database=node_database,
            max_total_walk_km=1.0,
            landmark_dists=LANDMARK_DISTS,
        )
        result = router.find_path(start, end, weights)
        relaxed_walk_cap = False
        if result is None:
            relaxed_router = BidirectionalAStarRouter(
                graph=G,
                node_database=node_database,
                max_total_walk_km=-1.0,
                landmark_dists=LANDMARK_DISTS,
            )
            result = relaxed_router.find_path(start, end, weights)
            relaxed_walk_cap = result is not None
        if result is None:
            return jsonify({
                "status": "error",
                "message": "No path found between these two points."
            }), 404

        result["weights"] = weights
        response = build_route_response(result, "Bidirectional A*")

        meeting_id = result.get("meeting_node")
        response["meta"]["meeting_node"] = meeting_id
        response["meta"]["meeting_name"] = (
            node_database.get(meeting_id, {}).get("name", "Unknown")
            if meeting_id is not None else None
        )
        response["meta"]["walk_cap_km"] = 1.0
        response["meta"]["walk_cap_relaxed"] = relaxed_walk_cap

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@api_bp.route("/route/bidirectional/bfs", methods=["POST"])
def bidirectional_bfs_route():
    start, end, weights, err = parse_route_request()
    if err:
        return jsonify({"status": "error", "message": err}), 400

    try:
        router = BidirectionalBFSRouter(graph=G, node_database=node_database, max_total_walk_km=1.0)
        result = router.find_path(start, end, weights)
        relaxed_walk_cap = False
        if result is None:
            relaxed_router = BidirectionalBFSRouter(
                graph=G, node_database=node_database, max_total_walk_km=-1.0
            )
            result = relaxed_router.find_path(start, end, weights)
            relaxed_walk_cap = result is not None
        if result is None:
            return jsonify({"status": "error", "message": "No path found between these two points."}), 404

        result["weights"] = weights
        response = build_route_response(result, "Bidirectional BFS")
        meeting_id = result.get("meeting_node")
        response["meta"]["meeting_node"] = meeting_id
        response["meta"]["meeting_name"] = (
            node_database.get(meeting_id, {}).get("name", "Unknown") if meeting_id is not None else None
        )
        response["meta"]["walk_cap_km"] = 1.0
        response["meta"]["walk_cap_relaxed"] = relaxed_walk_cap
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@api_bp.route("/route/bidirectional/dijkstra", methods=["POST"])
def bidirectional_dijkstra_route():
    start, end, weights, err = parse_route_request()
    if err:
        return jsonify({"status": "error", "message": err}), 400

    try:
        router = BidirectionalDijkstraRouter(graph=G, node_database=node_database, max_total_walk_km=1.0)
        result = router.find_path(start, end, weights)
        relaxed_walk_cap = False
        if result is None:
            relaxed_router = BidirectionalDijkstraRouter(
                graph=G, node_database=node_database, max_total_walk_km=-1.0
            )
            result = relaxed_router.find_path(start, end, weights)
            relaxed_walk_cap = result is not None
        if result is None:
            return jsonify({"status": "error", "message": "No path found between these two points."}), 404

        result["weights"] = weights
        response = build_route_response(result, "Bidirectional Dijkstra")
        meeting_id = result.get("meeting_node")
        response["meta"]["meeting_node"] = meeting_id
        response["meta"]["meeting_name"] = (
            node_database.get(meeting_id, {}).get("name", "Unknown") if meeting_id is not None else None
        )
        response["meta"]["walk_cap_km"] = 1.0
        response["meta"]["walk_cap_relaxed"] = relaxed_walk_cap
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@api_bp.route("/route/dijkstra", methods=["POST"])
def dijkstra_route():
    start, end, weights, err = parse_route_request()
    if err:
        return jsonify({"status": "error", "message": err}), 400

    try:
        # Soft walking constraint: try <=1km first, then relax only if needed.
        router = DijkstraRouter(graph=G, node_database=node_database, max_total_walk_km=1.0)
        result = router.find_path(start, end, weights)
        relaxed_walk_cap = False
        if result is None:
            relaxed_router = DijkstraRouter(graph=G, node_database=node_database, max_total_walk_km=-1.0)
            result = relaxed_router.find_path(start, end, weights)
            relaxed_walk_cap = result is not None
        if result is None:
            return jsonify({
                "status": "error",
                "message": "No path found between these two points."
            }), 404

        result["weights"] = weights
        response = build_route_response(result, "Dijkstra")
        response["meta"]["walk_cap_km"] = 1.0
        response["meta"]["walk_cap_relaxed"] = relaxed_walk_cap
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@api_bp.route("/health", methods=["GET"])
def health():
    if G is None:
        return jsonify({"status": "error", "message": "Graph not loaded"}), 500
    
    sample_nodes = []
    if node_database:
        for nid, data in list(node_database.items())[:3]:
            sample_nodes.append({"id": nid, **data})
    
    return jsonify({
        "status": "ok",
        "nodes": G.number_of_nodes() if G else 0,
        "edges": G.number_of_edges() if G else 0,
        "landmark_count": len(LANDMARK_DISTS) if LANDMARK_DISTS else 0,
        "algorithms": ["A* Search", "Bidirectional A*", "Bidirectional BFS", "Bidirectional Dijkstra", "Dijkstra"],
        "sample_nodes": sample_nodes
    }), 200


@api_bp.route("/nodes", methods=["GET"])
def list_nodes():
    if not node_database:
        return jsonify({"status": "ok", "nodes": []}), 200

    nodes = [
        {
            "id": nid,
            "name": data.get("name", f"Node {nid}"),
            "lat": data.get("lat", 0.0),
            "lon": data.get("lon", 0.0),
            "mode": data.get("mode", "Walk"),
        }
        for nid, data in node_database.items()
    ]
    return jsonify({"status": "ok", "nodes": nodes}), 200