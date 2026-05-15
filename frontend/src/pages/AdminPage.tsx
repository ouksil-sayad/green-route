import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Sun, Moon, Loader2, Database, Home } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import logoImg from "../../assests/logo.png";
import AlgiersMap from "../components/AlgiersMap";
import OptimizerPanel from "../components/OptimizerPanel";
import { ALGIERS_NODES, GraphNode, RouteResult, setAlgiersNodes, mapBackendToFrontend, normalizeMode } from "../lib/algiersGraph";
import { fetchRoute, fetchNodes, ApiRouteRequest } from "../api/api";
import { toast } from "sonner";
import NodePicker from "../components/NodePicker";

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as any;
  const { theme, setTheme } = useTheme();

  const [algorithm, setAlgorithm] = useState("astar");
  const [heuristic, setHeuristic] = useState("second");

  const [startNode, setStartNode] = useState<GraphNode | null>(navigationState?.startNode || null);
  const [endNode, setEndNode] = useState<GraphNode | null>(navigationState?.endNode || null);
  const [selectMode, setSelectMode] = useState<"start" | "end">("start");
    const [timeWeight, setTimeWeight] = useState(navigationState?.timeWeight ?? 33);
    const [costWeight, setCostWeight] = useState(navigationState?.costWeight ?? 33);
    const [co2Weight, setCO2Weight] = useState(navigationState?.co2Weight ?? 34);
  const [previewRoute, setPreviewRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodesLoading, setNodesLoading] = useState(true);

  const [nodes, setNodes] = useState<GraphNode[]>(ALGIERS_NODES);
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [nodePickerType, setNodePickerType] = useState<"start" | "end">("start");


  // Fetch nodes from backend
  useEffect(() => {
    const loadNodes = async () => {
      setNodesLoading(true);
      try {
        const fetchedNodes = await fetchNodes();
        if (fetchedNodes && fetchedNodes.length > 0) {
          const mappedNodes: GraphNode[] = fetchedNodes.map((n: any) => ({
            id: n.id,
            name: n.name,
            lat: n.lat,
            lng: n.lon,
            type: (n.mode === "Walk" || n.mode === "Bus" || n.mode === "Tram") ? "transit" : "hub",
            mode: n.mode,
            stop_id: n.stop_id
          }));
          setAlgiersNodes(mappedNodes);
          setNodes(mappedNodes);

          // Debug logs requested by user
          console.log("Loaded nodes by type:", {
            metro: mappedNodes.filter(n => normalizeMode(n.mode) === "metro").length,
            train: mappedNodes.filter(n => normalizeMode(n.mode) === "train").length,
            bus: mappedNodes.filter(n => normalizeMode(n.mode) === "bus").length,
            tram: mappedNodes.filter(n => normalizeMode(n.mode) === "tram").length,
            walk: mappedNodes.filter(n => normalizeMode(n.mode) === "walk").length,
          });
          console.log("Train nodes sample:", mappedNodes.filter(n => normalizeMode(n.mode) === "train").slice(0, 10));
        }
      } catch (error) {
        console.error("Critical error loading nodes:", error);
        toast.error("Failed to load transport network.");
      } finally {
        setNodesLoading(false);
      }
    };
    loadNodes();
  }, []);

  const handleNodeSelect = (node: GraphNode, role: "start" | "end") => {
    setPreviewRoute(null);
    if (role === "start") {
      setStartNode(node);
      setSelectMode("end");
      toast.success(`Departure: ${node.name}`);
    } else {
      setEndNode(node);
      toast.success(`Destination: ${node.name}`);
    }
  };

  const handlePickerOpen = (role: "start" | "end") => {
    setNodePickerType(role);
    setNodePickerOpen(true);
  };

  const handleSwap = () => {
    setStartNode(endNode);
    setEndNode(startNode);
    toast.info("Locations swapped");
  };

  const handlePreset = (preset: "fastest" | "cheapest" | "greenest") => {
    if (preset === "fastest") { setTimeWeight(80); setCostWeight(10); setCO2Weight(10); }
    if (preset === "cheapest") { setTimeWeight(10); setCostWeight(80); setCO2Weight(10); }
    if (preset === "greenest") { setTimeWeight(10); setCostWeight(10); setCO2Weight(80); }
    toast.info(`${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied`);
  };

  const handleFindRoute = async () => {
    if (!startNode || !endNode) return;
    if (startNode.id === endNode.id) {
      toast.error("Start and destination are the same!");
      return;
    }

    setLoading(true);

    const payload: ApiRouteRequest = {
      start: startNode.id,
      end: endNode.id,
      weights: {
        time: timeWeight / 100,
        money: costWeight / 100,
        co2: co2Weight / 100
      },
      algorithm,
      heuristic: algorithm === "astar" ? heuristic : undefined
    };

    const startTime = performance.now();
    try {
      const data = await fetchRoute(payload);
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      if (data.success === false) {
        toast.error(data.error || "No route found.");
        setLoading(false);
        return;
      }

      if (!data.route) {
        toast.error("No route data returned.");
        setLoading(false);
        return;
      }

      console.log("FULL ROUTE RESPONSE:", data);

      const result = mapBackendToFrontend(data.route);
      
      const performanceData = data.performance ? {
        ...data.performance,
        isReal: true
      } : {
        algorithm,
        execution_time_ms: durationMs,
        expanded_nodes: null,
        isReal: false
      };


      navigate("/results", {
        state: {
          startNode,
          endNode,
          result,
          timeWeight,
          costWeight,
          co2Weight,
          nodes,
          algorithm,
          heuristic: algorithm === "astar" ? heuristic : null,
          performanceData,
          returnPath: "/admin"
        },
      });
    } catch (e) {
      toast.error("An unexpected error occurred.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page-layout-root"
      style={{
        width: "100%",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: "60px",
          background: "var(--card)",
          opacity: 0.98,
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
        }}
      >
        <div
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <img src={logoImg} alt="Logo" style={{ height: "40px", width: "auto" }} />
          <div>
            <div className="font-bold text-[var(--neon)] tracking-tight">AlgierRoute</div>
            <div className="text-[9px] text-purple-400 uppercase font-bold">Admin Console</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link to="/" style={{ textDecoration: "none", color: "var(--muted-foreground)", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <Home size={14} />
            Landing
          </Link>
          <Link to="/user" style={{ textDecoration: "none", color: "var(--muted-foreground)", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
            User Page
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--neon)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div
        className="content-wrapper flex flex-col lg:flex-row min-h-[calc(100vh-60px)] lg:h-[calc(100vh-60px)] w-full mt-[60px] lg:overflow-hidden"
      >
        <aside
          className="w-full lg:w-[360px] xl:w-[380px] shrink-0 bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto p-4 sm:p-5 flex flex-col gap-4"
        >

          <div style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "1rem", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#a855f7" }}>
              <Database size={16} />
              <span style={{ fontWeight: 700, fontSize: "13px" }}>Algorithm Settings</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "4px", display: "block" }}>SELECT ALGORITHM</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px", outline: "none" }}
                >
                  <option value="astar">A* Search</option>
                  <option value="dijkstra">Dijkstra</option>
                  <option value="bidirectional_astar">Bidirectional A*</option>
                  <option value="bidirectional_dijkstra">Bidirectional Dijkstra</option>
                  <option value="bidirectional_bfs">Bidirectional BFS</option>
                </select>
              </div>

              {algorithm === "astar" && (
                <div style={{ animation: "fade-in 0.3s ease-out" }}>
                  <label style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "4px", display: "block" }}>HEURISTIC</label>
                  <select
                    value={heuristic}
                    onChange={(e) => setHeuristic(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px", outline: "none" }}
                  >
                    <option value="first">First Heuristic</option>
                    <option value="second">Second Heuristic</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <OptimizerPanel
            startNode={startNode}
            endNode={endNode}
            timeWeight={timeWeight}
            costWeight={costWeight}
            co2Weight={co2Weight}
            nodes={nodes}
            algorithm={algorithm}
            heuristic={heuristic}
            selectMode={selectMode}
            isLoading={loading}
            onTimeWeight={setTimeWeight}
            onCostWeight={setCostWeight}
            onCO2Weight={setCO2Weight}
            onSwap={handleSwap}
            onFindRoute={handleFindRoute}
            onSelectModeChange={setSelectMode}
            onPreset={handlePreset}
            onPickerOpen={handlePickerOpen}
          />

          {nodesLoading && (
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "12px" }}>
              <Loader2 className="animate-spin" size={14} />
              Loading network nodes...
            </div>
          )}

        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, padding: "20px", gap: "16px" }}>
          <div style={{ padding: "12px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "999px", padding: "3px", gap: "2px" }}>
              {(["start", "end"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setSelectMode(mode); handlePickerOpen(mode); }}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: selectMode === mode ? (mode === "start" ? "var(--neon)" : "#8b5cf6") : "transparent",
                    color: selectMode === mode ? "var(--background)" : "var(--muted-foreground)",
                  }}
                >
                  {mode === "start" ? "📍 Departure" : "🏁 Destination"}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              position: "relative",
              height: "100%",
              minHeight: "400px",
              borderRadius: "1.5rem",
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
            }}
          >
            <AlgiersMap startNode={startNode} endNode={endNode} routeResult={previewRoute} onNodeSelect={handleNodeSelect} selectMode={selectMode} nodes={nodes} />
          </div>
        </div>
      </div>
      <NodePicker isOpen={nodePickerOpen} onClose={() => setNodePickerOpen(false)} nodes={nodes} onSelect={(node) => handleNodeSelect(node, nodePickerType)} type={nodePickerType} />

      <style>{`
        .page-layout-root {
          height: 100vh;
          overflow: hidden;
        }

        @media (max-width: 1023px) {
          .page-layout-root {
            height: auto !important;
            min-height: 100vh;
            overflow: visible !important;
          }
          .content-wrapper {
            height: auto !important;
            overflow: visible !important;
          }
          .content-wrapper aside {
            width: 100% !important;
            height: auto !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border) !important;
          }
          .content-wrapper > div:last-child {
            height: 500px !important;
            min-height: 500px !important;
          }
        }
      `}</style>
    </div>
  );
}
