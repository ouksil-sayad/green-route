import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Clock, DollarSign, Leaf, ArrowLeft, Navigation, MapPin,
  Bus, Train, Footprints, Car, CheckCircle, AlertTriangle, Sun, Moon
} from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import AlgiersMap from "../components/AlgiersMap";
import MetricCard from "../components/MetricCard";
import { GraphNode, RouteResult, RouteStep } from "../lib/algiersGraph";


declare global {
  interface Window { L: any; }
}

interface LocationState {
  startNode: GraphNode;
  endNode: GraphNode;
  result: RouteResult;
  timeWeight: number;
  costWeight: number;
  co2Weight: number;
}

function TransportIcon({ type }: { type: RouteStep["transport"] }) {
  const size = 14;
  if (type === "bus") return <Bus size={size} />;
  if (type === "metro") return <Train size={size} />;
  if (type === "taxi") return <Car size={size} />;
  return <Footprints size={size} />;
}

function transportColor(type: RouteStep["transport"]): string {
  if (type === "bus") return "#3b82f6";
  if (type === "metro") return "var(--neon)";
  if (type === "taxi") return "#f59e0b";
  return "#10b981";
}

function transportLabel(type: RouteStep["transport"], line?: string): string {
  if (type === "bus") return `Bus ${line ?? ""}`;
  if (type === "metro") return `Metro ${line ?? ""}`;
  if (type === "taxi") return "Taxi";
  return "Walk";
}

export default function Results() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(-1);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    console.log("Results page loaded, state:", state);
    const timer = setTimeout(() => {
      setLoading(false);
      if (state?.result?.steps?.length) {
        let i = 0;
        const interval = setInterval(() => {
          setActiveStep(i);
          i++;
          if (i >= (state?.result?.steps?.length ?? 0)) clearInterval(interval);
        }, 350);
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  if (!state) {
    return (
      <div
        data-cmp="Results"
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <AlertTriangle size={48} style={{ color: "var(--destructive)", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--foreground)", fontSize: "18px", fontWeight: 600 }}>No route data found</p>
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: "16px",
              padding: "10px 24px",
              borderRadius: "0.75rem",
              background: "var(--primary)",
              border: "none",
              color: "var(--primary-foreground)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const { startNode, endNode, result } = state;

  return (
    <div
      data-cmp="Results"
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--accent)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--foreground)",
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--neon)" }}>Route Results</div>
            <div style={{ fontSize: "10px", color: "var(--muted-foreground)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Optimal Path Found
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              maxWidth: "320px",
              overflow: "hidden",
            }}
          >
            <Navigation size={12} style={{ color: "var(--neon)", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {startNode.name}
            </span>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)", flexShrink: 0 }}>→</span>
            <MapPin size={12} style={{ color: "#8b5cf6", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {endNode.name}
            </span>
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

      {/* Loading State */}
      {loading && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            padding: "40px",
            paddingTop: "100px", // Extra padding for fixed header
          }}
        >
          {/* Spinner */}
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid var(--accent)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "var(--neon)",
                animation: "spin-ring 0.8s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "12px",
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: "#3b82f6",
                animation: "spin-ring 1.2s linear infinite reverse",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "50%",
                transform: "translate(-50%, -50%)",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--neon)",
                boxShadow: "0 0 12px rgba(0,212,200,0.8)",
              }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px 0" }}>
              AI is optimizing your route...
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>
              Running Dijkstra algorithm with weighted priorities
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            {["Analyzing nodes", "Weighing paths", "Optimizing CO₂", "Finalizing route"].map((step, i) => (
              <div
                key={step}
                style={{
                  fontSize: "11px",
                  padding: "5px 12px",
                  borderRadius: "999px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                  animation: `float-up 0.4s ease-out ${i * 0.15}s forwards`,
                  opacity: 0,
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Content */}
      {!loading && (
        <div
          className="content-wrapper results-layout"
          style={{
            height: "calc(100vh - 60px)",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            marginTop: "60px",
            overflow: "hidden",
          }}
        >
          {/* Left: Route Details */}
          <div
            style={{
              width: "420px",
              flexShrink: 0,
              background: "var(--surface)",
              borderRight: "1px solid var(--border)",
              overflowY: "auto",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Metrics Row */}
            <div>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Route Metrics
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <MetricCard
                  icon={<Clock size={13} style={{ color: "var(--neon)" }} />}
                  label="Time"
                  value={String(result.totalTime)}
                  unit="min"
                  color="var(--neon)"
                  dimColor="var(--neon-dim)"
                />
                <MetricCard
                  icon={<DollarSign size={13} style={{ color: "#f59e0b" }} />}
                  label="Cost"
                  value={String(result.totalCost)}
                  unit="DZD"
                  color="#f59e0b"
                  dimColor="rgba(245,158,11,0.15)"
                />
                <MetricCard
                  icon={<Leaf size={13} style={{ color: "#10b981" }} />}
                  label="CO₂"
                  value={String(result.totalCO2)}
                  unit="g"
                  color="#10b981"
                  dimColor="rgba(16,185,129,0.15)"
                />
              </div>
            </div>

            {/* Summary bar */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(0,212,200,0.06)",
                border: "1px solid rgba(0,212,200,0.15)",
                borderRadius: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <CheckCircle size={18} style={{ color: "var(--neon)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                  Optimal route found!
                </p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: "2px 0 0 0" }}>
                  {result.steps.length} step{result.steps.length !== 1 ? "s" : ""} · {result.path.length} waypoints
                </p>
              </div>
            </div>

            {/* Step-by-step */}
            <div>
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Turn-by-Turn Directions
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {result.steps.map((step, i) => {
                  const color = transportColor(step.transport);
                  const isVisible = i <= activeStep;
                  return (
                    <div
                      key={i}
                      ref={el => { stepRefs.current[i] = el; }}
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateX(0)" : "translateX(-12px)",
                        transition: "opacity 0.3s ease, transform 0.3s ease",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        paddingBottom: i < result.steps.length - 1 ? "0" : "0",
                      }}
                    >
                      {/* Timeline */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: `${color}18`,
                            border: `1.5px solid ${color}50`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: color,
                          }}
                        >
                          <TransportIcon type={step.transport} />
                        </div>
                        {i < result.steps.length - 1 && (
                          <div
                            style={{
                              width: "1px",
                              height: "28px",
                              background: `linear-gradient(to bottom, ${color}40, transparent)`,
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        style={{
                          flex: 1,
                          paddingBottom: i < result.steps.length - 1 ? "16px" : "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--foreground)",
                              lineHeight: 1.3,
                            }}
                          >
                            {step.instruction}
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: "999px",
                              background: `${color}18`,
                              border: `1px solid ${color}35`,
                              color: color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {transportLabel(step.transport, step.line)}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "5px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                            ⏱ {step.timeMins} min
                          </span>
                          {step.costDZD > 0 && (
                            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                              💰 {step.costDZD} DZD
                            </span>
                          )}
                          {step.co2Grams > 0 && (
                            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                              🌿 {step.co2Grams}g CO₂
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final destination */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "4px",
                  padding: "12px",
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: "0.875rem",
                  animation: "float-up 0.4s ease-out 1s forwards",
                  opacity: 0,
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(139,92,246,0.18)",
                    border: "1.5px solid rgba(139,92,246,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={14} style={{ color: "#8b5cf6" }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                    You have arrived!
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: "2px 0 0 0" }}>
                    {endNode.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => navigate("/")}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "0.875rem",
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                cursor: "pointer",
                color: "var(--secondary-foreground)",
                fontSize: "14px",
                fontWeight: 600,
                transition: "all 0.2s ease",
                marginTop: "4px",
              }}
            >
              ← Plan Another Route
            </button>
          </div>

          {/* Map Area */}
          <div style={{ flex: 1, position: "relative", minHeight: "400px" }}>
            <AlgiersMap
              startNode={startNode}
              endNode={endNode}
              routeResult={result}
              onNodeSelect={() => {}}
              selectMode="start"
            />

            {/* Floating metrics overlay */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                animation: "float-up 0.5s ease-out 0.2s forwards",
                opacity: 0,
              }}
            >
              {[
                { icon: "⏱", label: `${result.totalTime} min`, color: "var(--neon)", border: "rgba(0,212,200,0.3)" },
                { icon: "💰", label: `${result.totalCost} DZD`, color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
                { icon: "🌿", label: `${result.totalCO2}g CO₂`, color: "#10b981", border: "rgba(16,185,129,0.3)" },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    padding: "8px 14px",
                    background: "var(--card)",
                    opacity: 0.95,
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${item.border}`,
                    borderRadius: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
                  }}
                >
                  <span style={{ fontSize: "14px" }}>{item.icon}</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: item.color }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 768px) {
          [data-cmp="Results"] {
            height: auto !important;
            overflow: visible !important;
          }
          .content-wrapper {
            height: auto !important;
            overflow: visible !important;
          }
          .results-layout {
            flex-direction: column !important;
            height: auto !important;
            overflow: visible !important;
            padding: 16px !important;
            gap: 16px !important;
          }
          .results-layout > div:first-child {
            width: 100% !important;
            height: auto !important;
            border: 1px solid var(--border) !important;
            border-radius: 20px !important;
            max-height: none !important;
            flex-shrink: 0;
            overflow: visible !important;
            background: var(--card) !important;
          }
          .results-layout > div:last-child {
            width: 100% !important;
            height: 450px !important;
            min-height: 450px !important;
            flex-shrink: 0;
            margin: 0 !important;
            border-radius: 20px !important;
            overflow: hidden !important;
            border: 1px solid var(--border) !important;
          }
        }
      `}</style>
    </div>
  );
}
