# Vision & Improvement Suggestions

A concise roadmap of ideas to evolve the Green Multi-Modal Public Transit Router: product, algorithms, data, and engineering quality.

---

## 1. Routing & algorithms

- **Single objective vs Pareto front:** Today, time / price / CO₂ are folded into one weighted sum. Offer a **Pareto set** of non-dominated routes (e.g. best time for each CO₂ budget) so users see trade-offs without guessing weights.
- **Multi-criteria labeling:** After computing a small candidate set, label routes as “fastest,” “cheapest,” “greenest,” and “balanced” using actual metrics instead of only slider position.
- **Bidirectional BFS clarity:** Expose Bi-BFS as “minimize **number of legs**” in the UI so users are not misled into thinking it optimizes the same objective as A* / Dijkstra.
- **Time-dependent routing:** Use schedules (first/last trip, headways) and **RAPTOR** or **CSA** for timetable-based transit; current model is closer to static or average-cost edges.
- **Preprocessing for speed:** For production scale, consider **Contraction Hierarchies**, **transit node routing**, or **hub labeling** on the core graph; keep A* / bi-A* for dynamic constraints if needed.
- **Stronger validation:** Property tests that Dijkstra, A*, Bi-A*, and Bi-Dijkstra agree on optimal cost for random small graphs (same weights, no walk cap) would guard regressions.

---

## 2. Data & realism

- **Live GTFS / real-time updates:** Ingest GTFS-RT or agency APIs for delays, skipped stops, and detours.
- **Calibration:** Revisit `NORM_TIME`, `NORM_PRICE`, `NORM_CO2` and mode constants using local surveys or open data so sliders reflect user perception.
- **Walking & accessibility:** Optional **max walk**, **elevation**, stairs avoidance, and wheelchair-accessible edges.
- **Interlining & transfers:** Explicit **transfer penalties** (time + inconvenience) as part of edge cost, not only raw walk distance.

---

## 3. Product & UX

- **Geocoding & map pick:** Select start/end on the map or via address search instead of only node dropdowns where possible.
- **Explanations:** “Why this route?” — short breakdown of dominant factors (time vs price vs CO₂) for the chosen path.
- **Analytics export:** CSV/JSON export of comparison runs for coursework or research.
- **Offline / PWA:** Cache static tiles and last graph snapshot for limited offline use.

---

## 4. Engineering & operations

- **CI pipeline:** Lint, unit tests, and a minimal **API integration test** against a tiny fixture graph on every push.
- **Configuration:** Move magic numbers (walk cap, max speed for heuristic, norms) to env or a single **routing profile** document.
- **Observability:** Structured logs, request IDs, and simple metrics (latency, path length, relaxation rate) for `/api/route*`.
- **Rate limiting & auth:** If the API is public, add throttling and optional API keys.
- **Containerization:** Dockerfile + compose (backend + frontend + reverse proxy) for one-command demos.

---

## 5. Sustainability narrative

- **Carbon storytelling:** Compare route CO₂ to private car baseline for the same OD (when distance is known).
- **Mode shift nudges:** When two routes are close in time, prefer lower-emission options with clear messaging.

---

## 6. Research & extensions

- **Robust routing:** Optimize for **percentile** arrival time or worst-case delay scenarios.
- **Fairness:** Analyze service quality across neighborhoods (equity metrics on graph coverage).
- **Multimodal legs:** First/last mile with **shared micromobility** or bike-share nodes as separate layers.

---

*Prioritize items by your audience (course project vs production deployment) and by data availability (static graph vs live feeds).*
