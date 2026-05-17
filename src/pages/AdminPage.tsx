import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Sun, Moon, Loader2, Database, Home, ArrowRightLeft, Clock, DollarSign, Leaf } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import logoImg from "../../assests/logo.png";
import AlgiersMap from "../components/AlgiersMap";
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

  const canFindRoute = startNode !== null && endNode !== null && !loading;

  const selectStyle = {
    padding: "7px 10px",
    borderRadius: "8px",
    background: "#f8faf9",
    border: "1.5px solid #d4ddd8",
    color: "#1a2e24",
    fontSize: "12px",
    fontWeight: 600 as const,
    outline: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>

      {/* ── FULL-SCREEN MAP BACKGROUND ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <AlgiersMap startNode={startNode} endNode={endNode} routeResult={previewRoute} onNodeSelect={handleNodeSelect} selectMode={selectMode} nodes={nodes} />
      </div>

      {/* ── FLOATING TOP-LEFT: Logo ── */}
      <div
        onClick={() => navigate("/")}
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          padding: "8px 14px",
          borderRadius: "12px",
          border: "1px solid rgba(17,73,49,0.12)",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <img src={logoImg} alt="Logo" style={{ height: "28px", width: "auto" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "#114931", letterSpacing: "0.5px" }}>AlgierRoute</div>
          <div style={{ fontSize: "8px", fontWeight: 600, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "1px" }}>Admin Console</div>
        </div>
      </div>

      {/* ── FLOATING TOP-RIGHT: Nav ── */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(17,73,49,0.12)",
            color: "#5a7568",
            fontSize: "12px",
            fontWeight: 600,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <Home size={14} />
          Landing
        </Link>
        <Link
          to="/user"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(17,73,49,0.12)",
            color: "#5a7568",
            fontSize: "12px",
            fontWeight: 600,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          User Page
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(17,73,49,0.12)",
            color: "#114931",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ── FLOATING BOTTOM DASHBOARD ── */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1200,
          width: "calc(100% - 40px)",
          maxWidth: "960px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(16px)",
          borderRadius: "16px",
          border: "1px solid rgba(17,73,49,0.1)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Row 1: Algorithm Settings + Journey Selection */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Algorithm selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "rgba(17,73,49,0.04)", borderRadius: "10px", border: "1px solid rgba(17,73,49,0.1)" }}>
            <Database size={12} style={{ color: "#114931" }} />
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} style={selectStyle}>
              <option value="astar">A* Search</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="bidirectional_astar">Bi-A*</option>
              <option value="bidirectional_dijkstra">Bi-Dijkstra</option>
              <option value="bidirectional_bfs">Bi-BFS</option>
            </select>
            {algorithm === "astar" && (
              <select value={heuristic} onChange={(e) => setHeuristic(e.target.value)} style={selectStyle}>
                <option value="first">Max Haversine</option>
                <option value="second">ALT</option>
              </select>
            )}
          </div>

          <div style={{ width: "1px", height: "24px", background: "#d4ddd8", flexShrink: 0 }} />

          {/* From */}
          <button
            onClick={() => { setSelectMode("start"); handlePickerOpen("start"); }}
            style={{
              flex: 1,
              minWidth: "120px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: selectMode === "start" ? "rgba(17,73,49,0.08)" : "#f8faf9",
              border: `1.5px solid ${selectMode === "start" ? "#114931" : "#d4ddd8"}`,
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b8a7a", letterSpacing: "0.5px", textTransform: "uppercase" }}>From</div>
              <div style={{ fontSize: "12px", fontWeight: startNode ? 600 : 400, color: startNode ? "#1a2e24" : "#8ca89a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {startNode ? startNode.name : "Select departure"}
              </div>
            </div>
          </button>

          {/* Swap */}
          <button
            onClick={handleSwap}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "#f8faf9",
              border: "1px solid #d4ddd8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5a7568",
              flexShrink: 0,
            }}
            title="Swap"
          >
            <ArrowRightLeft size={12} />
          </button>

          {/* To */}
          <button
            onClick={() => { setSelectMode("end"); handlePickerOpen("end"); }}
            style={{
              flex: 1,
              minWidth: "120px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: selectMode === "end" ? "rgba(17,73,49,0.08)" : "#f8faf9",
              border: `1.5px solid ${selectMode === "end" ? "#114931" : "#d4ddd8"}`,
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#065f46", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b8a7a", letterSpacing: "0.5px", textTransform: "uppercase" }}>To</div>
              <div style={{ fontSize: "12px", fontWeight: endNode ? 600 : 400, color: endNode ? "#1a2e24" : "#8ca89a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {endNode ? endNode.name : "Select destination"}
              </div>
            </div>
          </button>
        </div>

        {/* Row 2: Priority Sliders + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", gap: "16px", minWidth: "280px", flexWrap: "wrap" }}>
            {[
              { icon: <Clock size={12} />, label: "Time", value: timeWeight, key: "time" as const },
              { icon: <DollarSign size={12} />, label: "Cost", value: costWeight, key: "cost" as const },
              { icon: <Leaf size={12} />, label: "CO₂", value: co2Weight, key: "co2" as const },
            ].map((s) => (
              <div key={s.key} style={{ flex: 1, minWidth: "80px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                  <span style={{ color: "#114931" }}>{s.icon}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#5a7568" }}>{s.label}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#114931", marginLeft: "auto" }}>{Math.round(s.value)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={s.value}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    const others = [timeWeight, costWeight, co2Weight];
                    const idx = s.key === "time" ? 0 : s.key === "cost" ? 1 : 2;
                    const remaining = 100 - newVal;
                    const otherIdxs = [0, 1, 2].filter(i => i !== idx);
                    const otherTotal = others[otherIdxs[0]] + others[otherIdxs[1]];
                    const ratio0 = otherTotal > 0 ? others[otherIdxs[0]] / otherTotal : 0.5;
                    const ratio1 = otherTotal > 0 ? others[otherIdxs[1]] / otherTotal : 0.5;
                    const newVals = [timeWeight, costWeight, co2Weight];
                    newVals[idx] = newVal;
                    newVals[otherIdxs[0]] = remaining * ratio0;
                    newVals[otherIdxs[1]] = remaining * ratio1;
                    setTimeWeight(newVals[0]);
                    setCostWeight(newVals[1]);
                    setCO2Weight(newVals[2]);
                  }}
                  style={{
                    width: "100%",
                    height: "4px",
                    appearance: "none",
                    background: `linear-gradient(to right, #114931 ${s.value}%, #d4ddd8 ${s.value}%)`,
                    borderRadius: "2px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                  className="slider-thumb-neon"
                />
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={canFindRoute ? handleFindRoute : undefined}
            style={{
              padding: "12px 28px",
              background: canFindRoute ? "#114931" : "#d4ddd8",
              color: canFindRoute ? "#ffffff" : "#8ca89a",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              cursor: canFindRoute ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Running...
              </>
            ) : (
              canFindRoute ? "Find Route" : "Select Stops"
            )}
          </button>
        </div>

        {/* Loading indicator */}
        {nodesLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b8a7a", fontSize: "11px" }}>
            <Loader2 className="animate-spin" size={12} />
            Loading network nodes...
          </div>
        )}
      </div>

      <NodePicker isOpen={nodePickerOpen} onClose={() => setNodePickerOpen(false)} nodes={nodes} onSelect={(node) => handleNodeSelect(node, nodePickerType)} type={nodePickerType} />
    </div>
  );
}
