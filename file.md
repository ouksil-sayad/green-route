# Green Multi-Modal Public Transit Router — Algorithms Report

This document describes how pathfinding works in this project, how user weights affect routing, and how to interpret **which algorithm is “best”** in different situations.

---

## 1. System overview

The backend builds a **directed multigraph** from processed transit data (nodes and edges). Each edge carries at least:

- **time** — travel time (minutes, or equivalent),
- **price** — cost (DZD),
- **CO₂** — emissions (grams),
- **mode** — e.g. walk, bus, tram, train,
- **distance_km** — used for walk accumulation and metrics.

The API receives a **start node id**, **end node id**, and **weights** `{ time, price, co2 }`. All algorithms that respect weights aim to minimize a **single scalar cost** derived from those dimensions (see Section 3).

---

## 2. State space and walking cap

Routers do not search only on `node_id`. The state includes **cumulative walking distance** (in meters) along walk edges:

- State ≈ `(node_id, walked_meters)`.

A **soft walking cap** (default **1 km** total walk per route) is applied first. If no path exists, the same algorithm is run again with the cap **disabled** (`max_total_walk_km = -1`), and the response may set `walk_cap_relaxed` in metadata.

This constraint can change which path is optimal and can cause different algorithms to explore different parts of the state graph.

---

## 3. Weight normalization and edge cost

### 3.1 Normalizing user weights

Request weights are non-negative and **renormalized** to sum to 1 (see `parse_route_request` and `_normalize_weights`). If the sum is zero, defaults `0.33 / 0.33 / 0.34` are used.

### 3.2 Bringing metrics to a common scale

From `app.core.config`:

| Dimension | Raw unit   | Divisor (`NORM_*`) | Meaning (conceptually)        |
|-----------|------------|--------------------|-------------------------------|
| Time      | minutes    | `NORM_TIME = 1`    | 1 “unit” = 1 minute           |
| Price     | DZD        | `NORM_PRICE = 10`  | 1 “unit” = 10 DZD             |
| CO₂       | grams      | `NORM_CO2 = 20`    | 1 “unit” = 20 g CO₂           |

### 3.3 Weighted edge cost

For normalized weights `(w_time, w_price, w_co2)` and edge attributes `(time, price, co2)`:

```
edge_cost = w_time * (time / NORM_TIME)
          + w_price * (price / NORM_PRICE)
          + w_co2 * (co2 / NORM_CO2)
```

All **weighted** shortest-path algorithms in this codebase use this same `_edge_cost` (with non-negative weights and non-negative edge attributes), so they share the **same objective** for a fixed graph and cap setting.

---

## 4. Heuristic (A* and bidirectional A*)

For A* and Bidirectional A*, an admissible heuristic estimates remaining cost toward the goal.

Implementation detail (`_heuristic_cost`):

- Uses **great-circle distance** (haversine) between current node and goal in the node database.
- Assumes an optimistic **maximum speed** (`MAX_SPEED_KMH`, default 40 km/h) to convert distance to a **minimum possible time**.
- Contributes only the **time** component of the weighted objective (price and CO₂ are taken as **0** in the heuristic) so the heuristic stays **admissible** for the time part of the weighted sum.

Forward search uses heuristic to **goal**; backward search in bidirectional A* uses heuristic toward **start** (symmetric construction on reverse edges).

---

## 5. Algorithms implemented

### 5.1 A* Search (`AStarRouter`)

- **File:** `backend/app/algorithms/routers.py`
- **API:** `POST /api/route`
- **Behavior:** Best-first search on `f = g + h`, where `g` is sum of `_edge_cost` along the path from start and `h` is `_heuristic_cost`.
- **Optimality:** With admissible `h` and consistent setup, finds a path **optimal** under the weighted edge cost (subject to the walking-cap state space).
- **Nodes expanded:** Reported as count of **distinct node ids** touched in expansion (comparable to other routers in this project).

### 5.2 Dijkstra (`DijkstraRouter`)

- **File:** `backend/app/algorithms/dijkstra.py`
- **API:** `POST /api/route/dijkstra`
- **Behavior:** Single-source shortest paths in the state space; priority queue ordered by `g` only (no heuristic).
- **Optimality:** **Optimal** for the same non-negative `_edge_cost`.
- **Typical trade-off:** Often expands **more** states than A* on large graphs because there is no heuristic to focus the search.

### 5.3 Bidirectional A* (`BidirectionalAStarRouter`)

- **File:** `backend/app/algorithms/bidirectional.py`
- **API:** `POST /api/route/bidirectional`
- **Behavior:** Two concurrent A* searches (forward from start, backward from end on incoming edges). When frontiers meet, the best combined `g_fwd + g_bwd` is tracked (with tie-breaking on balance of costs).
- **Optimality:** Designed to find **optimal** paths under the same edge costs when meeting conditions and relaxation are correct (standard bidirectional shortest-path theory on consistent non-negative costs).
- **Typical trade-off:** Often **fewer node expansions** than unidirectional Dijkstra/A* for long paths, because search volume grows from both ends.

### 5.4 Bidirectional Dijkstra (`BidirectionalDijkstraRouter`)

- **File:** `backend/app/algorithms/bidirectional.py`
- **API:** `POST /api/route/bidirectional/dijkstra`
- **Behavior:** Like bidirectional A* but **without** heuristic; both sides use Dijkstra’s rule.
- **Optimality:** **Optimal** under `_edge_cost`.
- **Typical trade-off:** Usually more expansions than bidirectional A*, fewer than unidirectional Dijkstra in many cases.

### 5.5 Bidirectional BFS (`BidirectionalBFSRouter`)

- **File:** `backend/app/algorithms/bidirectional.py`
- **API:** `POST /api/route/bidirectional/bfs`
- **Behavior:** Alternating **deque** BFS on the state graph; each edge counts as **one hop** for ordering (unweighted search).
- **Important:** **Does not** use `w_time`, `w_price`, `w_co2` for the **search order**. It finds a path with **fewest edges** (subject to the walk cap), then **metrics** (time, price, CO₂) are computed from the actual edge attributes on that path.
- **Optimality:** **Not** guaranteed to minimize weighted utility. It minimizes **hop count**, which can differ sharply from “best” time, cost, or emissions when the user cares about those sliders.

---

## 6. What “best algorithm” means for each weight case

### 6.1 For the **weighted objective** (time + price + CO₂ combined)

For any fixed scenario (same graph, same cap, same normalized weights):

- A*, Dijkstra, Bidirectional A*, and Bidirectional Dijkstra all optimize the **same** scalar edge cost. In principle they should return routes with the **same optimal total cost**; differences you see in practice are usually due to:
  - **ties** (multiple paths with equal or nearly equal cost),
  - **walking cap** vs **relaxed** second attempt,
  - floating-point ordering,
  - or different **state** exploration when multiple optimal meeting points exist (bidirectional variants).

**Bidirectional BFS** is the exception: it is **not** tuned to that weighted objective, so it can return materially **worse** time, price, or CO₂ than the weighted-optimal algorithms.

**Practical rule:** For “best route for **my** weight sliders,” compare the **scalar utility** (frontend analytics uses the same normalization as the backend). The winner is whichever implementation returns the **lowest** utility; often **several algorithms tie** as co-winners.

### 6.2 By **priority scenario** (how to read your sliders)

The analytics page includes scenarios such as:

| Scenario        | Typical intent              | What to trust for “best route”      |
|----------------|----------------------------|-------------------------------------|
| Your sliders   | Your actual preferences    | Lowest **weighted utility** among successful runs |
| Time-focused   | Mostly minimize travel time | Same weighted rule with high `w_time`; path may match time-leaning optimum |
| Cost-focused   | Mostly minimize DZD        | High `w_price` |
| CO₂-focused    | Mostly minimize emissions  | High `w_co2` |
| Balanced       | ~equal thirds              | Compromise optimum |

Within each scenario, **again**: A*, uni-Dijkstra, bi-A*, and bi-Dijkstra should **agree on optimal cost** when ties are broken consistently; **Bi-BFS** may disagree because its search objective is different.

### 6.3 For **search efficiency** (performance, not route quality)

If the question is “which algorithm is **fastest on the server** or expands **fewer nodes**?”:

- Bidirectional methods (especially Bidirectional A*) often win on **nodes expanded** for long OD pairs.
- A* usually beats Dijkstra in expansions when the heuristic is informative.
- **Bidirectional BFS** may expand few states in **hop count** but that does not imply a good **weighted** route.

Use the **`nodes_expanded`** field in API metadata for this comparison.

### 6.4 Per-metric winners (time only, price only, CO₂ only)

For a **fixed** origin–destination after routes are computed:

- **Lowest time** — algorithm whose returned route has minimum `total_time_mins`.
- **Lowest cost** — minimum `total_price_dzd`.
- **Lowest CO₂** — minimum `total_co2_grams`.

When all algorithms are **weighted-optimal** for the **same** weights, these three minima often **coincide** on the same path; if weights differ between runs, different paths can win different metrics.

---

## 7. Frontend vs backend naming

- **`POST /api/route`** → A* Search  
- **`POST /api/route/bidirectional`** → Bidirectional A* (not BFS)  
- **`POST /api/route/dijkstra`** → Dijkstra  
- **`POST /api/route/bidirectional/bfs`** → Bidirectional BFS  
- **`POST /api/route/bidirectional/dijkstra`** → Bidirectional Dijkstra  

The **Algorithm analytics** page compares three parallel calls used there: A*, the **bidirectional** endpoint (Bi-A*), and Dijkstra — not every backend variant.

---

## 8. Summary table

| Algorithm               | Respects weights in search? | Optimal weighted cost? | Typical use case |
|-------------------------|----------------------------|-------------------------|------------------|
| A*                      | Yes                        | Yes                     | Default API route |
| Dijkstra                | Yes                        | Yes                     | Baseline, no heuristic |
| Bidirectional A*        | Yes                        | Yes                     | Often fewer expansions |
| Bidirectional Dijkstra  | Yes                        | Yes                     | Bi search without heuristic |
| Bidirectional BFS       | No (hop-based)             | No                      | Fewest transfers / hops only |

---

## 9. References in code

- Edge cost and normalization: `backend/app/algorithms/routers.py` (`_edge_cost`, `_normalize_weights`, `_heuristic_cost`, `AStarRouter`).
- Unidirectional Dijkstra: `backend/app/algorithms/dijkstra.py`.
- Bidirectional variants: `backend/app/algorithms/bidirectional.py`.
- Constants: `backend/app/core/config.py` (`NORM_TIME`, `NORM_PRICE`, `NORM_CO2`, `MAX_SPEED_KMH`, `DEFAULT_WEIGHTS`).
- HTTP surface: `backend/app/api/routes.py`.

---

*This report reflects the codebase structure as of the repository state used to generate this document. If implementations change, update this file alongside the algorithms.*
