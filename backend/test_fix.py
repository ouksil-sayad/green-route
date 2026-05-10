from app.core.graph_loader import load_graph
from app.algorithms.routers import AStarRouter, route_to_json

G, node_db = load_graph('data/processed/nodes.csv', 'data/processed/edges.csv')
router = AStarRouter(graph=G, node_database=node_db)

print("Testing A* algorithm with different weights:")
print("=" * 50)

tests = [
    {'time': 1.0, 'price': 0.0, 'co2': 0.0},
    {'time': 0.33, 'price': 0.33, 'co2': 0.34},
    {'time': 0.0, 'price': 1.0, 'co2': 0.0},
    {'time': 0.0, 'price': 0.0, 'co2': 1.0},
]

results = []
for weights in tests:
    result = router.find_path(1, 5, weights)
    results.append((weights, result))
    if result:
        nodes = result['nodes']
        edges = result['edges']
        total_time = sum(e[2].get('time', 0) for e in edges)
        total_price = sum(e[2].get('price', 0) for e in edges)
        total_co2 = sum(e[2].get('co2', 0) for e in edges)
        
        weighted_cost = (
            weights['time'] * total_time +
            weights['price'] * total_price +
            weights['co2'] * total_co2
        )
        
        print(f"Weights: {weights}")
        print(f"  Path: {' -> '.join(map(str, nodes[:6]))}{'...' if len(nodes) > 6 else ''}")
        print(f"  Nodes: {len(nodes)}, Edges: {len(edges)}")
        print(f"  Total time: {total_time:.2f} mins")
        print(f"  Total price: {total_price:.2f} DZD")
        print(f"  Total CO2: {total_co2:.2f} g")
        print(f"  Weighted cost: {weighted_cost:.4f}")
        print()
    else:
        print(f"Weights: {weights} -> NO PATH FOUND")
        print()

print("\nVerifying paths change when weights change:")
print("=" * 50)
for i, (w1, r1) in enumerate(results):
    for j, (w2, r2) in enumerate(results):
        if i < j and r1 and r2:
            same_path = r1['nodes'] == r2['nodes']
            print(f"Test {i}({w1}) vs Test {j}({w2}): ", end="")
            if same_path:
                print("SAME path")
            else:
                print("DIFFERENT path")