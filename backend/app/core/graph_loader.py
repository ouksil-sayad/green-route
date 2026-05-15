import pandas as pd
import networkx as nx
import json
from app.core.config import (
    MODE_SPEEDS_KMH,
    CO2_GRAMS_PER_KM,
)

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


def _parse_node_id(node_str):
    if pd.isna(node_str):
        return None
    s = str(node_str).strip()
    # IDs in the CSVs are prefixed strings like N12, I5, T3.
    # We map each prefix to a disjoint integer range so nodes/edges stay consistent.
    prefix_offsets = {
        "N": 0,      # base network nodes
        "I": 1000,   # intermediate nodes
        "T": 2000,   # tram stops
        "R": 3000,   # train stations
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
    """
    Converts a JSON string of coordinates from the CSV into a Python list.
    Example: "[[lat, lon], [lat, lon]]" -> [[lat, lon], [lat, lon]]
    """
    if pd.isna(geom_str):
        return None
    try:
        # The geometry is stored as a JSON-formatted string in the CSV.
        return json.loads(geom_str)
    except:
        # If the string is malformed or not JSON, return None to avoid crashing.
        return None


def load_graph(nodes_csv_path, edges_csv_path):
    """
    Loads nodes and edges from CSV files into a NetworkX MultiDiGraph.
    
    Args:
        nodes_csv_path (str): Path to the nodes.csv file.
        edges_csv_path (str): Path to the edges.csv file.
        
    Returns:
        tuple: (graph, node_database)
            - graph (nx.MultiDiGraph): The built directed graph.
            - node_database (dict): Metadata mapping node_id -> {name, lat, lon, mode}.
    """
    # Read raw data from CSV files
    nodes_df = pd.read_csv(nodes_csv_path)
    edges_df = pd.read_csv(edges_csv_path)

    # Initialize the directed graph and the node metadata storage
    graph = nx.MultiDiGraph()
    node_database = {}

    type_to_mode = {
        "metro": "Metro",
        "bus": "Bus",
        "tram": "Tram",
        "train": "Train",
    }

    # Step 1: Populate nodes and their metadata
    for _, row in nodes_df.iterrows():
        node_id = _parse_node_id(row[COL_NODE_ID])
        if node_id is None:
            print(f"Warning: Could not parse node ID: {row[COL_NODE_ID]}")
            continue
        if node_id in node_database:
            print(f"Warning: Duplicate node ID {node_id} from {row[COL_NODE_ID]}")
            continue
        node_type = str(row.get(COL_NODE_TYPE, "")).lower().strip()
        mode = type_to_mode.get(node_type, "Walk")
        node_name = str(row.get(COL_NODE_NAME, f"Node {node_id}"))
        node_lat = float(row.get(COL_NODE_LAT, 0.0))
        node_lon = float(row.get(COL_NODE_LON, 0.0))
        
        node_database[node_id] = {
            "name": node_name,
            "lat": node_lat,
            "lon": node_lon,
            "mode": mode,
            "stop_id": str(node_id),
        }

    # Step 2: Populate edges and calculate missing metrics
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

        # If travel time is missing (0), estimate it from distance and typical speed
        if distance_km > 0 and time_val == 0:
            speed = MODE_SPEEDS_KMH.get(mode.lower(), 20.0)
            time_val = (distance_km / speed) * 60.0

        # If CO2 emissions are missing (0), estimate them from distance
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