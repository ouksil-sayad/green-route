# ALT + Haversine heuristic for the Green Transit Router

This document describes the combined **A\*** heuristic used in `backend/app/algorithms/routers.py`: a **maximum** of a geographic (haversine) lower bound and an **ALT** (A\*, Landmarks, Triangle inequality) lower bound, both expressed in the same units as the search (normalized weighted cost, with only the **time** dimension contributing to the heuristic so admissibility holds for any user weights).

---

## 1. Problem setting

- The road / transit network is a **directed multigraph** \(G = (V,E)\) with nonnegative edge attributes: travel **time** (minutes), **price** (DZD), and **CO₂** (grams).
- The user supplies nonnegative weights \(w_t, w_p, w_c\) that sum to 1 after normalization.
- **Edge cost** (what A\* minimizes) is

\[
  c(e) = w_t \frac{t(e)}{T_0} + w_p \frac{p(e)}{P_0} + w_c \frac{g(e)}{G_0},
\]

where \(T_0, P_0, G_0\) are fixed normalization constants (`NORM_TIME`, `NORM_PRICE`, `NORM_CO2`).

- **Walking cap:** search states are \((v, \ell)\) where \(\ell\) is accumulated walk distance; the implementation may cap total walking. The heuristic is applied per **physical node** \(v\); admissibility arguments below are for the **uncapped** graph (the cap only removes edges and cannot make a heuristic inadmissible if it was a lower bound on the uncapped graph for nonnegative costs).

---

## 2. Why only “time” appears in the heuristic

Let \(h^*(n)\) be the true minimum **remaining cost** from node \(n\) to the goal under the full \(c(e)\).

For any path from \(n\) to the goal,

\[
  \text{cost} = \sum_e c(e) \;\ge\; w_t \sum_e \frac{t(e)}{T_0},
\]

because the price and CO₂ terms are **nonnegative**. Therefore

\[
  h^*(n) \;\ge\; w_t \cdot d_t^*(n, \text{goal}),
\]

where \(d_t^*(n,\text{goal})\) is the shortest-path distance from \(n\) to the goal when every edge is weighted by **time only**: \(t(e)/T_0\).

Any heuristic of the form \(h(n) = w_t \cdot \underline{t}(n,\text{goal})\) where \(\underline{t}(n,\text{goal}) \le d_t^*(n,\text{goal})\) satisfies \(h(n) \le h^*(n)\) and is **admissible** for the full multi-criteria objective.

Both building blocks below produce such a \(\underline{t}\); we then multiply by \(w_t\) and divide by `NORM_TIME` consistently with the implementation (with `NORM_TIME = 1` in the default config, this is the same as using raw minutes for the time-only metric).

---

## 3. Haversine (geographic) lower bound

Let \(\mathrm{dist}_{\mathrm{km}}(n,g)\) be the great-circle distance between the coordinates of \(n\) and \(g\). Assume a network upper bound on speed \(v_{\max}\) (`MAX_SPEED_KMH`). Any physical movement along edges respects at most that speed in the model used for the bound, so the **minimum possible** travel time in minutes is at least

\[
  \underline{t}_{\mathrm{geo}}(n,g) = \frac{\mathrm{dist}_{\mathrm{km}}(n,g)}{v_{\max}} \cdot 60.
\]

Clearly \(\underline{t}_{\mathrm{geo}} \le d_t^*(n,g)\) when edge times reflect actual speeds ≤ \(v_{\max}\) along the network (the straight line cannot require more time than a shortest path in the network in the idealized bound).

**Heuristic contribution (time-normalized):**

\[
  h_{\mathrm{geo}}(n) = w_t \cdot \frac{\underline{t}_{\mathrm{geo}}(n,g)}{T_0}.
\]

---

## 4. ALT lower bound (landmarks + triangle inequality)

**Preprocessing (once at startup):**

1. Choose a set of **landmark** nodes \(L_1,\ldots,L_k\) (farthest-first spread on the graph).
2. For each landmark \(L\), run Dijkstra **from** \(L\) on the same directed graph, using **time-only** edge weights \(t(e)/T_0\). Store \(d(L, v)\) for all reachable \(v\).

These distances satisfy the **shortest-path triangle inequality** on a directed graph:

\[
  d(L, g) \le d(L, n) + d_t^*(n, g).
\]

Rearranging,

\[
  d_t^*(n, g) \ge d(L, g) - d(L, n).
\]

The right-hand side can be negative; only the nonnegative part is a valid lower bound:

\[
  d_t^*(n, g) \ge \max\bigl(0,\; d(L, g) - d(L, n)\bigr).
\]

**Why not `abs(d(L,g) - d(L,n))` on a directed graph?**  
The symmetric form is valid on **undirected** graphs (or with **backward** landmark distances). On a **directed** multigraph, \(|d(L,g)-d(L,n)|\) can exceed \(d_t^*(n,g)\). The implementation therefore uses \(\max(0, d(L,g)-d(L,n))\) only.

Take the best landmark:

\[
  \underline{t}_{\mathrm{ALT}}(n,g) = \max_{L} \max\bigl(0,\; d(L,g) - d(L,n)\bigr).
\]

Then

\[
  h_{\mathrm{ALT}}(n) = w_t \cdot \frac{\underline{t}_{\mathrm{ALT}}(n,g)}{T_0}.
\]

**Parallel edges (MultiDiGraph):** NetworkX passes a map of parallel edges to the weight function; preprocessing uses the **minimum** time-only cost among parallel edges so Dijkstra matches the router’s best-case choice along that pair.

---

## 5. Combined heuristic

\[
  h(n) = \max\bigl(h_{\mathrm{geo}}(n),\; h_{\mathrm{ALT}}(n)\bigr).
\]

**Admissibility:** \(\max\) of admissible heuristics is admissible: each term is \(\le w_t\, d_t^*(n,g) \le h^*(n)\), so the max is too.

**Consistency (monotonicity)** with nonnegative edge costs: if \(h_1, h_2\) are consistent, \(\max(h_1,h_2)\) is consistent. Standard proofs apply because the max of two lower bounds that satisfy the triangle inequality for the same goal is still a lower bound on successor distances.

**Effect on A\*:** A larger admissible heuristic is still admissible; it tends to **reduce** expanded nodes while preserving **optimality** of the path for the original edge costs.

---

## 6. Bidirectional A\*

- Forward search toward the goal uses \(h(n) = h(n, \text{goal})\).
- Backward search (on reversed traversal from the goal) uses the same function with target **start**: \(h(n) = h(n, \text{start})\).

Landmark distances are computed in the **forward** graph from each landmark; the same nonnegative landmark bound applies when estimating distance to the backward search’s “goal” node.

---

## 7. References (conceptual)

- Goldberg, Harrelson: **Computing the shortest path: A\* meets graph theory** (ALT / highway hierarchies lineage).
- Ikeda et al.: **A fast algorithm for finding better routes by AI search techniques** (landmark ideas).
- Hart, Nilsson, Raphael: **A formal basis for the heuristic determination of minimum cost paths** (A\* admissibility and consistency).

---

## 8. Code map

| Piece | Location |
|--------|-----------|
| Combined heuristic | `backend/app/algorithms/routers.py` — `_heuristic_cost` |
| Landmark preprocessing | `backend/app/algorithms/landmarks.py` |
| Startup wiring | `backend/app/api/routes.py` — `init_routes`, `LANDMARK_DISTS` |
| Heuristic benchmark API | `POST /api/benchmark/astar-heuristics` |
| Pytest coverage | `backend/tests/test_heuristic_functions.py` |
