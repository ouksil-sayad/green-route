## Walking constraint (A* and Bidirectional Dijkstra)

### What changed

The backend A* and Bidirectional Dijkstra implementations now enforce a **hard constraint**:

- **Total walking distance along a route must be ≤ 1.0 km**

This is applied **during the search**, not after, so A* can still find an alternative route that respects the limit.

The backend now also uses explicit **normalization factors** for weighted optimization across all routing algorithms (A*, Dijkstra, Bidirectional Dijkstra), so user weights for `time`, `price`, and `co2` are comparable.

### Where it’s implemented

- `backend/app/algorithms/routers.py` (`AStarRouter`)
  - `class AStarRouter(..., max_total_walk_km=1.0)`
  - The search state was expanded from just `node_id` to `(node_id, walked_meters)`.
  - When exploring an edge whose `mode` is `"Walk"`, we add `edge_data["distance_km"] * 1000` to `walked_meters`.
  - If the new total would exceed **1000 meters**, that neighbor state is skipped.

- `backend/app/algorithms/bidirectional.py` (`BidirectionalDijkstraRouter`)
  - `class BidirectionalDijkstraRouter(..., max_total_walk_km=1.0)`
  - Both forward and backward search states include walked meters.
  - A meeting between both directions is only considered if combined walked meters is within the limit.
  - Expansions that exceed the walking cap are pruned.

### What counts as “walking”

- Any edge where `edge_data["mode"]` is `"Walk"` (case-insensitive)
- Only edges with a positive `edge_data["distance_km"]` contribute to the total

### How to change the limit

By default it is **1.0 km**. You can change it by passing a different value when creating routers, for example:

```python
router = AStarRouter(graph=G, node_database=node_database, max_total_walk_km=2.0)
router = BidirectionalDijkstraRouter(graph=G, node_database=node_database, max_total_walk_km=2.0)
```

## Preference normalization contract

Weighted routing uses this utility score per edge:

```python
score = w_time * (time_minutes / NORM_TIME) \
      + w_price * (price_dzd / NORM_PRICE) \
      + w_co2 * (co2_grams / NORM_CO2)
```

Fixed factors in `backend/app/core/config.py`:

- `NORM_TIME = 1.0` (minutes per utility unit)
- `NORM_PRICE = 10.0` (DZD per utility unit)
- `NORM_CO2 = 20.0` (grams CO2 per utility unit)

These values are used directly at runtime (no per-graph median recomputation).

Interpretation:

- `weights` control preference trade-offs
- `NORM_*` controls metric scaling so one metric does not dominate due to units
- request weights are normalized to sum to `1.0` before routing

The API now returns these factors under:

- `response.meta.normalization_factors`

### Offline calibration helper (fixed dataset)

You can compute recommended fixed constants from observed OD trade-offs:

```bash
python backend/scripts/calibrate_norms.py --max-pairs 300 --seed 42
```

This script:

- samples origin/destination pairs from your graph
- computes alternatives using fastest/cheapest/greenest/balanced profiles
- uses median absolute route-to-route deltas as suggested `NORM_*` values

