import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, DollarSign, ChevronRight, Sun, Moon, Loader2 } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import logoImg from "../../assests/logo.png";
import AlgiersMap from "../components/AlgiersMap";
import OptimizerPanel from "../components/OptimizerPanel";
import MetricCard from "../components/MetricCard";
import { ALGIERS_NODES, GraphNode, RouteResult, setAlgiersNodes, mapBackendToFrontend } from "../lib/algiersGraph";
import { fetchRoute, fetchNodes } from "../api/api";
import { toast } from "sonner";
import NodePicker from "../components/NodePicker";

export default function Home() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [startNode, setStartNode] = useState<GraphNode | null>(null);
  const [endNode, setEndNode] = useState<GraphNode | null>(null);
  const [selectMode, setSelectMode] = useState<"start" | "end">("start");
  const [timeWeight, setTimeWeight] = useState(33);
  const [costWeight, setCostWeight] = useState(33);
  const [co2Weight, setCO2Weight] = useState(34);
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
      const fetchedNodes = await fetchNodes();
      if (fetchedNodes && fetchedNodes.length > 0) {
        const mappedNodes: GraphNode[] = fetchedNodes.map((n: any) => ({
          id: n.id,
          name: n.name,
          lat: n.lat,
          lng: n.lon,
          type: n.mode === "Walk" ? "transit" : (n.mode === "Bus" ? "transit" : "hub"),
          mode: n.mode,
          stop_id: n.stop_id
        }));
        setAlgiersNodes(mappedNodes);
        setNodes(mappedNodes);
        console.log(`Loaded ${mappedNodes.length} nodes from backend`);
      }
      setNodesLoading(false);
    };
    loadNodes();
  }, []);

  // Monitor nodes
  useEffect(() => {
    console.log(`[State Monitor] Start: ${startNode?.name ?? "NULL"}, End: ${endNode?.name ?? "NULL"}`);
  }, [startNode, endNode]);

  // Auto-calculate route preview
  useEffect(() => {
    if (startNode && endNode && startNode.id !== endNode.id) {
      const timer = setTimeout(async () => {
        try {
          const response = await fetchRoute({
            start: startNode.id,
            end: endNode.id,
            weights: {
              time: timeWeight / 100,
              money: costWeight / 100,
              co2: co2Weight / 100
            }
          });
          if (response.success && response.route) {
            setPreviewRoute(mapBackendToFrontend(response.route));
          } else {
            setPreviewRoute(null);
          }
        } catch (e) {
          console.error("Preview calculation failed", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPreviewRoute(null);
    }
  }, [startNode, endNode, timeWeight, costWeight, co2Weight]);

  const handleNodeSelect = (node: GraphNode, role: "start" | "end") => {
    console.log(`[ACTION] Selecting ${role}: ${node.name}`);
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
      toast.error("Start and destination are the same location!");
      return;
    }
    
    setLoading(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

    const normalizedTimeWeight = timeWeight > 1 ? timeWeight / 100 : timeWeight;
    const normalizedCostWeight = costWeight > 1 ? costWeight / 100 : costWeight;
    const normalizedCo2Weight = co2Weight > 1 ? co2Weight / 100 : co2Weight;

    const payload = {
      start: startNode.id,
      end: endNode.id,
      weights: {
        time: normalizedTimeWeight,
        money: normalizedCostWeight,
        co2: normalizedCo2Weight
      }
    };

    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("route request payload:", payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("route response status:", response.status);
      
      const data = await response.json();
      console.log("route response json:", data);

      if (!response.ok) {
        toast.error(data.message || "Failed to fetch route");
        setLoading(false);
        return;
      }

      if (data.success === false) {
        toast.error(data.error || "No route found between these locations.");
        setLoading(false);
        return;
      }

      const result = mapBackendToFrontend(data.route);
      
      if (!result.coordinates || result.coordinates.length < 2) {
        console.warn("Route found but no coordinates were returned:", result);
        toast.warning("Route found but path visualization data is missing.");
      }

      setPreviewRoute(result);
      
      // Navigate to results page
      navigate("/results", {
        state: {
          startNode,
          endNode,
          result,
          timeWeight,
          costWeight,
          co2Weight,
          nodes,
        },
      });
    } catch (e) {
      toast.error("An unexpected error occurred while finding the route.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-cmp="Home"
      style={{
        height: "100vh",
        width: "100%",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
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
          flexShrink: 0,
        }}
      >
        <div 
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <div
            style={{
              height: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <img src={logoImg} alt="Logo" style={{ height: "100%", width: "auto", objectFit: "contain" }} />
          </div>
          <div>
            <div className="text-res-base font-bold text-[var(--neon)] tracking-tight">
              AlgierRoute
            </div>
            <div className="text-[9px] text-[var(--muted-foreground)] tracking-wider uppercase font-medium">
              AI Smart Mobility
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            className="hidden sm:block text-[10px] px-3 py-1 rounded-full bg-[var(--accent)] border border-[var(--border)] text-[var(--muted-foreground)]"
          >
            Algiers, Algeria
          </div>
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
              transition: "all 0.2s ease",
            }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div
        className="content-wrapper flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-60px)] w-full mt-[60px] overflow-hidden"
      >
        {/* Left: Optimizer Panel */}
        <aside
          className="w-full lg:w-[360px] xl:w-[380px] shrink-0 bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto p-4 sm:p-5 flex flex-col gap-4"
        >
          <OptimizerPanel
            startNode={startNode}
            endNode={endNode}
            timeWeight={timeWeight}
            costWeight={costWeight}
            co2Weight={co2Weight}
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

          {/* Quick Stats Preview */}
          {startNode && endNode && (
            <div style={{ marginTop: "16px", animation: "float-up 0.4s ease-out forwards" }}>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "1rem",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Route Preview
                  </span>
                  <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <MetricCard
                    icon={<Clock size={13} style={{ color: "var(--neon)" }} />}
                    label="Time"
                    value={previewRoute ? String(previewRoute.totalTime) : "—"}
                    unit="min"
                    color="var(--neon)"
                    dimColor="var(--neon-dim)"
                  />
                  <MetricCard
                    icon={<DollarSign size={13} style={{ color: "#f59e0b" }} />}
                    label="Cost"
                    value={previewRoute ? String(previewRoute.totalCost) : "—"}
                    unit="DZD"
                    color="#f59e0b"
                    dimColor="rgba(245,158,11,0.15)"
                  />
                </div>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: "10px 0 0 0", textAlign: "center" }}>
                  Click "Find Optimal Route" to calculate
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Map Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, padding: "20px", gap: "16px" }}>
          {/* Select Mode Banner */}
          <div
            style={{
              padding: "12px 20px",
              background: "var(--surface)",
              opacity: 0.9,
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "3px",
                gap: "2px",
              }}
            >
              {(["start", "end"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => {
                    setSelectMode(mode);
                    handlePickerOpen(mode);
                  }}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    background: selectMode === mode
                      ? (mode === "start" ? "var(--neon)" : "#8b5cf6")
                      : "transparent",
                    color: selectMode === mode ? "var(--background)" : "var(--muted-foreground)",
                  }}
                >
                  {mode === "start" ? "📍 Set Departure" : "🏁 Set Destination"}
                </button>
              ))}
            </div>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              {selectMode === "start"
                ? "Click map to set departure point"
                : "Click map to set destination"}
            </span>
          </div>

          {/* Map */}
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
            <AlgiersMap
              startNode={startNode}
              endNode={endNode}
              routeResult={previewRoute}
              onNodeSelect={handleNodeSelect}
              selectMode={selectMode}
              nodes={nodes}
            />
          </div>
        </div>
      </div>

      <NodePicker
        isOpen={nodePickerOpen}
        onClose={() => setNodePickerOpen(false)}
        nodes={nodes}
        onSelect={(node) => handleNodeSelect(node, nodePickerType)}
        type={nodePickerType}
      />

      <style>{`
        @media (max-width: 782px) {
          [data-cmp="Home"] {
            height: auto !important;
            overflow: visible !important;
          }
          .content-wrapper {
            height: auto !important;
            overflow: visible !important;
          }
          .main-layout {
            flex-direction: column !important;
            height: auto !important;
            overflow: visible !important;
            padding: 16px !important;
            gap: 16px !important;
          }
          .main-layout > div:first-child {
            width: 100% !important;
            height: auto !important;
            border: 1px solid var(--border) !important;
            border-radius: 20px !important;
            max-height: none !important;
            flex-shrink: 0;
            overflow: visible !important;
            background: var(--card) !important;
          }
          .main-layout > div:last-child {
            width: 100% !important;
            height: 450px !important;
            min-height: 450px !important;
            flex-shrink: 0;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 20px !important;
            overflow: hidden !important;
            border: 1px solid var(--border) !important;
          }
        }
      `}</style>
    </div>
  );
}
