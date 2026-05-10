# LLM Modifications Changelog

This folder keeps track of changes, fixes, and additions made by LLM assistants to the project.

## Date: 2026-04-30 (A* Algorithm Fixes and Documentation)

### 1. `backend/app/algorithms/astar.py`
- **Bug Fix (Missing Imports)**: The file was missing multiple required imports which made it unrunnable. Added imports for `BaseRouter`, `_edge_cost`, `_heuristic_cost`, and `route_to_json` from `.routers`. Also imported standard library modules `heapq`, `defaultdict`, and `itertools`.
- **Bug Fix (Priority Queue Tie-Breaker)**: Python's `heapq` sorts tuples by their first element ($f$-score). If two nodes had identical $f$-scores, `heapq` attempted to compare the second element (the node ID). This can cause crashes if node IDs are not comparable (e.g., dictionaries), or unpredictable pathfinding behavior. Fixed this by introducing a tie-breaker counter `tiebreaker = itertools.count()` and pushing tuples as `(f_score, next(tiebreaker), node)`.

### 2. `backend/app/algorithms/routers.py`
- **Bug Fix (Priority Queue Tie-Breaker)**: Applied the exact same tie-breaker fix to the `AStarRouter` class defined within `routers.py`. Added the `import itertools` statement and updated the `heapq.heappush` and `heapq.heappop` logic inside the `find_path` method.

### 3. `A_star_heuristic_proof.txt` (Root Directory)
- **New File**: Created a text file containing the formal mathematical proof demonstrating that the time-based heuristic function used in the multi-modal A* search is admissible (i.e., it never overestimates the true remaining cost).
