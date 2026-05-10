import os
import sys
from flask import Flask
from flask_cors import CORS
from app.core.graph_loader import load_graph
from app.api.routes import api_bp, init_routes

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "processed")
NODES_CSV = os.path.join(DATA_DIR, "nodes.csv")
EDGES_CSV = os.path.join(DATA_DIR, "edges.csv")


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config["JSON_SORT_KEYS"] = False

    print("Loading graph data...")
    if os.path.exists(NODES_CSV) and os.path.exists(EDGES_CSV):
        G, node_database = load_graph(NODES_CSV, EDGES_CSV)
        print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    else:
        print("Warning: Data files not found. Using empty graph.")
        import networkx as nx
        G = nx.MultiDiGraph()
        node_database = {}

    init_routes(G, node_database)
    app.register_blueprint(api_bp)

    return app


app = create_app()


if __name__ == "__main__":
    print("Starting server on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)