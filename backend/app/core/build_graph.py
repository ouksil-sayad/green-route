import pandas as pd
import networkx as nx
import json
import ast

COL_NODE_ID = "id"
COL_NODE_NAME = "name"
COL_NODE_LAT = "lat"
COL_NODE_LON = "lon"
COL_NODE_TYPE = "type"

COL_EDGE_SRC = "from"
COL_EDGE_TGT = "to"
COL_EDGE_MODE = "mode"
COL_EDGE_TIME = "time"
COL_EDGE_CO2 = "co2"
COL_EDGE_PRICE = "price"
COL_EDGE_DISTANCE = "distance"
COL_EDGE_GEOMETRY = "geometry"

MODE_FREQUENCIES = {
    "bus": 20.0,
    "tram": 15.0,
    "train": 60.0,
    "metro": 10.0,
}
MODE_PRICES = {
    "bus": 50.0,
    "tram": 50.0,
    "train": 50.0,
    "metro": 50.0,
}
MODE_SPEEDS_KMH = {
    "walk": 5.0,
    "bus": 20.0,
    "tram": 25.0,
    "train": 40.0,
    "metro": 40.0,
}
CO2_GRAMS_PER_KM = {
    "walk": 0.000,
    "bus": 89.0,
    "tram": 35.0,
    "train": 20.0,
    "metro": 20.0,
}

def _parse_node_id(node_str):
    if pd.isna(node_str):
        return None
    s = str(node_str).strip()
    # Keep consistent with app.core.graph_loader._parse_node_id
    prefix_offsets = {
        "N": 0,
        "I": 1000,
        "T": 2000,
    }
    if len(s) >= 2 and s[0].isalpha() and s[1:].isdigit():
        p = s[0].upper()
        if p in prefix_offsets:
            return prefix_offsets[p] + int(s[1:])
    try:
        return int(s)
    except:
        return None


def _parse_geometry(geom_str):
    if pd.isna(geom_str) or not geom_str:
        return None
    try:
        if isinstance(geom_str, str):
            return json.loads(geom_str)
        return geom_str
    except:
        try:
            return ast.literal_eval(geom_str)
        except:
            return None


def build_graph(nodes_csv_path, edges_csv_path):
    nodes_df = pd.read_csv(nodes_csv_path)
    edges_df = pd.read_csv(edges_csv_path)

    graph = nx.MultiDiGraph()
    node_database = {}

    type_to_mode = {
        "metro": "Train",
        "bus": "Bus",
        "tram": "Tram",
        "train": "Train",
    }

    for _, row in nodes_df.iterrows():
        node_id = _parse_node_id(row[COL_NODE_ID])
        if node_id is None:
            continue
        node_type = str(row.get(COL_NODE_TYPE, "")).lower().strip()
        mode = type_to_mode.get(node_type, "Walk")
        node_database[node_id] = {
            "name": str(row.get(COL_NODE_NAME, f"Node {node_id}")),
            "lat": float(row.get(COL_NODE_LAT, 0.0)),
            "lon": float(row.get(COL_NODE_LON, 0.0)),
            "mode": mode,
            "stop_id": str(node_id),
        }

    for _, row in edges_df.iterrows():
        src = _parse_node_id(row[COL_EDGE_SRC])
        tgt = _parse_node_id(row[COL_EDGE_TGT])
        if src is None or tgt is None:
            continue

        mode = str(row.get(COL_EDGE_MODE, "")).lower().strip()
        if mode == "walk":
            mode = "Walk"
        else:
            mode = type_to_mode.get(mode, mode.capitalize())

        distance_km = float(row.get(COL_EDGE_DISTANCE, 0.0))
        time_val = float(row.get(COL_EDGE_TIME, 0.0))
        price_val = float(row.get(COL_EDGE_PRICE, 0.0))
        co2_val = float(row.get(COL_EDGE_CO2, 0.0))
        geometry = _parse_geometry(row.get(COL_EDGE_GEOMETRY, None))

        if distance_km > 0 and time_val == 0:
            speed = MODE_SPEEDS_KMH.get(mode.lower(), 20.0)
            time_val = (distance_km / speed) * 60.0

        if distance_km > 0 and co2_val == 0:
            co2_per_km = CO2_GRAMS_PER_KM.get(mode.lower(), 89.0)
            co2_val = distance_km * co2_per_km

        graph.add_edge(
            src,
            tgt,
            mode=mode,
            time=time_val,
            price=price_val,
            co2=co2_val,
            distance_km=distance_km,
            geometry=geometry,
        )

    return graph, node_database

