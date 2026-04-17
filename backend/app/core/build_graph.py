import pandas as pd
import networkx as nx


COL_NODE_ID = "Node_ID"
COL_NODE_NAME = "Name"
COL_NODE_LAT = "Latitude"
COL_NODE_LON = "Longitude"

COL_EDGE_SRC = "Source_ID"
COL_EDGE_TGT = "Target_ID"
COL_EDGE_MODE = "Mode"
COL_EDGE_TIME = "Time"
COL_EDGE_CO2 = "CO2"
COL_EDGE_PRICE = "Price"

MODE_FREQUENCIES = {
    "Bus": 20.0,
    "Tram": 15.0,
    "Train": 60.0,
}
MODE_PRICES = {
    "Bus": 0.0,
    "Tram": 0.0,
    "Train": 0.0,
}
MODE_PREFIXES = {
    "Bus": 100000,
    "Tram": 200000,
    "Train": 300000,
}


def build_graph(nodes_csv_path, edges_csv_path):
    nodes_df = pd.read_csv(nodes_csv_path)
    edges_df = pd.read_csv(edges_csv_path)

    graph = nx.MultiDiGraph()
    node_database = {}

    for _, row in nodes_df.iterrows():
        node_id = int(row[COL_NODE_ID])
        node_database[node_id] = {
            "name": row[COL_NODE_NAME],
            "lat": float(row[COL_NODE_LAT]),
            "lon": float(row[COL_NODE_LON]),
        }

    walk_edges = edges_df[edges_df[COL_EDGE_MODE] == "Walk"]
    for _, row in walk_edges.iterrows():
        graph.add_edge(
            int(row[COL_EDGE_SRC]),
            int(row[COL_EDGE_TGT]),
            mode="Walk",
            time=float(row[COL_EDGE_TIME]),
            co2=0,
            price=float(row[COL_EDGE_PRICE]),
        )

    transit_edges = edges_df[edges_df[COL_EDGE_MODE] != "Walk"]
    for _, row in transit_edges.iterrows():
        src = int(row[COL_EDGE_SRC])
        tgt = int(row[COL_EDGE_TGT])
        mode = row[COL_EDGE_MODE]

        prefix = MODE_PREFIXES.get(mode, 900000)

        # creating virtual nodes for transit layers
        v_src = prefix + src
        v_tgt = prefix + tgt

        if v_src not in node_database:
            node_database[v_src] = {
                "name": f"{mode} - {node_database[src]['name']}",
                "lat": node_database[src]["lat"],
                "lon": node_database[src]["lon"],
            }
        if v_tgt not in node_database:
            node_database[v_tgt] = {
                "name": f"{mode} - {node_database[tgt]['name']}",
                "lat": node_database[tgt]["lat"],
                "lon": node_database[tgt]["lon"],
            }

        # waiting edges
        freq = MODE_FREQUENCIES.get(mode, 15.0)
        flat_fare = MODE_PRICES.get(mode, 0.0)
        if not graph.has_edge(src, v_src):
            graph.add_edge(
                src,
                v_src,
                mode="Wait",
                time=(freq / 2.0),
                co2=0.0,
                price=flat_fare,
            )

        # transit edges
        graph.add_edge(
            v_src,
            v_tgt,
            mode=mode,
            time=float(row[COL_EDGE_TIME]),
            co2=float(row[COL_EDGE_CO2]),
            price=0.0,  # assume user pays once at boarding
        )

        # alighting edges
        if not graph.has_edge(v_tgt, tgt):
            graph.add_edge(
                v_tgt,
                tgt,
                mode="Walk",
                time=0.0,
                co2=0.0,
                price=0.0,
            )

    return graph, node_database

