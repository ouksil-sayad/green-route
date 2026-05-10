import pytest
import networkx as nx
from app.algorithms.bidirectional import BidirectionalBFSRouter
from app.algorithms.astar import AStarRouter


class TestBidirectionalBFS:
    def test_linear_path_three_nodes(self):
        G = nx.MultiDiGraph()
        node_db = {
            0: {"lat": 36.7, "lon": 3.0, "name": "A"},
            1: {"lat": 36.7, "lon": 3.1, "name": "B"},
            2: {"lat": 36.7, "lon": 3.2, "name": "C"},
        }
        G.add_edge(0, 1, mode="Walk", time=5.0, price=0.0, co2=0.0)
        G.add_edge(1, 2, mode="Walk", time=5.0, price=0.0, co2=0.0)

        router = BidirectionalBFSRouter(graph=G, node_database=node_db)
        result = router.find_path(0, 2, {"time": 1.0, "price": 0.0, "co2": 0.0})

        assert result is not None
        assert result["nodes"] == [0, 1, 2]
        assert result["meeting_node"] == 1

    def test_start_equals_goal(self):
        G = nx.MultiDiGraph()
        node_db = {0: {"lat": 36.7, "lon": 3.0, "name": "A"}}
        G.add_node(0)

        router = BidirectionalBFSRouter(graph=G, node_database=node_db)
        result = router.find_path(0, 0, {"time": 1.0, "price": 0.0, "co2": 0.0})

        assert result is not None
        assert result["nodes"] == [0]
        assert result["edges"] == []

    def test_disconnected_graph(self):
        G = nx.MultiDiGraph()
        node_db = {
            0: {"lat": 36.7, "lon": 3.0, "name": "A"},
            5: {"lat": 36.8, "lon": 3.1, "name": "B"},
        }
        G.add_node(0)
        G.add_node(5)

        router = BidirectionalBFSRouter(graph=G, node_database=node_db)
        result = router.find_path(0, 5, {"time": 1.0, "price": 0.0, "co2": 0.0})

        assert result is None

    def test_same_as_astar(self):
        G = nx.MultiDiGraph()
        node_db = {
            0: {"lat": 36.7, "lon": 3.0, "name": "A"},
            1: {"lat": 36.7, "lon": 3.05, "name": "B"},
            2: {"lat": 36.7, "lon": 3.1, "name": "C"},
            3: {"lat": 36.7, "lon": 3.15, "name": "D"},
        }
        G.add_edge(0, 1, mode="Walk", time=5.0, price=0.0, co2=0.0)
        G.add_edge(1, 2, mode="Walk", time=5.0, price=0.0, co2=0.0)
        G.add_edge(2, 3, mode="Walk", time=5.0, price=0.0, co2=0.0)

        weights = {"time": 1.0, "price": 0.0, "co2": 0.0}

        bi_router = BidirectionalBFSRouter(graph=G, node_database=node_db)
        bi_result = bi_router.find_path(0, 3, weights)

        astar_router = AStarRouter(graph=G, node_database=node_db)
        astar_result = astar_router.find_path(0, 3, weights)

        assert bi_result is not None
        assert astar_result is not None
        assert bi_result["nodes"] == astar_result["nodes"]
        assert len(bi_result["edges"]) == len(astar_result["edges"])

    def test_bidirectional_fewer_nodes_expanded(self):
        G = nx.MultiDiGraph()
        node_db = {}

        for i in range(25):
            node_db[i] = {"lat": 36.7 + i * 0.001, "lon": 3.0 + i * 0.001, "name": f"Node{i}"}
            G.add_node(i)
            if i > 0:
                G.add_edge(i - 1, i, mode="Walk", time=2.0, price=0.0, co2=0.0)

        weights = {"time": 1.0, "price": 0.0, "co2": 0.0}

        bi_router = BidirectionalBFSRouter(graph=G, node_database=node_db)
        bi_result = bi_router.find_path(0, 24, weights)

        astar_router = AStarRouter(graph=G, node_database=node_db)
        astar_result = astar_router.find_path(0, 24, weights)

        assert bi_result is not None
        assert astar_result is not None
        assert bi_result["nodes_expanded"] < astar_result.get("nodes_expanded", float("inf"))

    def test_parallel_edges(self):
        G = nx.MultiDiGraph()
        node_db = {
            0: {"lat": 36.7, "lon": 3.0, "name": "A"},
            1: {"lat": 36.7, "lon": 3.1, "name": "B"},
        }
        G.add_edge(0, 1, mode="Walk", time=5.0, price=0.0, co2=0.0)
        G.add_edge(0, 1, mode="Bus", time=3.0, price=20.0, co2=5.0)

        router = BidirectionalBFSRouter(graph=G, node_database=node_db)
        result = router.find_path(0, 1, {"time": 1.0, "price": 0.0, "co2": 0.0})

        assert result is not None
        assert result["nodes"] == [0, 1]
        assert len(result["edges"]) == 1

    def test_weighted_cost_not_hop_count(self):
        G = nx.MultiDiGraph()
        node_db = {
            0: {"lat": 36.7, "lon": 3.0, "name": "A"},
            1: {"lat": 36.7, "lon": 3.05, "name": "B"},
            2: {"lat": 36.7, "lon": 3.02, "name": "C"},
            3: {"lat": 36.7, "lon": 3.03, "name": "E"},
            4: {"lat": 36.7, "lon": 3.1, "name": "D"},
        }

        # 2-hop fast but expensive/high-emission path: A -> B -> D
        G.add_edge(0, 1, mode="Bus", time=2.0, price=80.0, co2=1.0)
        G.add_edge(1, 4, mode="Bus", time=2.0, price=80.0, co2=1.0)

        # 3-hop slower but cheap/clean path: A -> C -> E -> D
        G.add_edge(0, 2, mode="Tram", time=4.0, price=10.0, co2=0.1)
        G.add_edge(2, 3, mode="Tram", time=4.0, price=10.0, co2=0.1)
        G.add_edge(3, 4, mode="Tram", time=4.0, price=10.0, co2=0.1)

        router = BidirectionalBFSRouter(graph=G, node_database=node_db)

        fastest = router.find_path(0, 4, {"time": 1.0, "price": 0.0, "co2": 0.0})
        cheapest = router.find_path(0, 4, {"time": 0.0, "price": 1.0, "co2": 0.0})

        assert fastest is not None
        assert cheapest is not None
        assert fastest["nodes"] == [0, 1, 4]
        assert cheapest["nodes"] == [0, 2, 3, 4]