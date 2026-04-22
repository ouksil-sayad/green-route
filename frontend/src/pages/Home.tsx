import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, DollarSign, MapPin, ChevronRight, Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import AlgiersMap from "../components/AlgiersMap";
import OptimizerPanel from "../components/OptimizerPanel";
import MetricCard from "../components/MetricCard";
import { GraphNode, RouteResult, findOptimalRoute } from "../lib/algiersGraph";
import { toast } from "sonner";

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

  // Monitor nodes
  useEffect(() => {
    console.log(`[State Monitor] Start: ${startNode?.name ?? "NULL"}, End: ${endNode?.name ?? "NULL"}`);
  }, [startNode, endNode]);

  // Auto-calculate route preview
  useEffect(() => {
    if (startNode && endNode && startNode.id !== endNode.id) {
      // Small timeout to avoid excessive calculations during slider drags
      const timer = setTimeout(() => {
        const result = findOptimalRoute(startNode.id, endNode.id, timeWeight, costWeight, co2Weight);
        setPreviewRoute(result);
      }, 100);
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

  const handleFindRoute = () => {
    if (!startNode || !endNode) return;
    if (startNode.id === endNode.id) {
      toast.error("Start and destination are the same location!");
      return;
    }
    console.log("Finding route from", startNode.name, "to", endNode.name);
    const result = findOptimalRoute(startNode.id, endNode.id, timeWeight, costWeight, co2Weight);
    if (!result) {
      toast.error("No route found between these locations.");
      return;
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
      },
    });
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--primary), var(--neon-blue))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MapPin size={16} style={{ color: "var(--background)" }} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--neon)", letterSpacing: "-0.01em" }}>
              AlgierRoute
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted-foreground)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              AI Smart Mobility
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              fontSize: "11px",
              padding: "5px 14px",
              borderRadius: "999px",
              background: "var(--accent)",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
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
        className="content-wrapper"
        style={{
          height: "calc(100vh - 60px)",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          marginTop: "60px",
          overflow: "hidden",
        }}
      >
        <div className="main-layout" style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "row" 
        }}>
        {/* Left Panel */}
        <div
          style={{
            width: "380px",
            flexShrink: 0,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          <OptimizerPanel
            startNode={startNode}
            endNode={endNode}
            timeWeight={timeWeight}
            costWeight={costWeight}
            co2Weight={co2Weight}
            selectMode={selectMode}
            onTimeWeight={setTimeWeight}
            onCostWeight={setCostWeight}
            onCO2Weight={setCO2Weight}
            onSwap={handleSwap}
            onFindRoute={handleFindRoute}
            onSelectModeChange={setSelectMode}
            onPreset={handlePreset}
          />

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
        </div>

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
                  onClick={() => setSelectMode(mode)}
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
            />
          </div>
        </div>
      </div>

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
    </div>
  );
}
