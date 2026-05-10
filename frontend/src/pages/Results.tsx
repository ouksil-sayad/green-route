import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Clock, DollarSign, Leaf, ArrowLeft, Navigation, MapPin,
  Bus, Train, Footprints, Car, CheckCircle, AlertTriangle, Sun, Moon
} from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import AlgiersMap from "../components/AlgiersMap";
import MetricCard from "../components/MetricCard";
import { GraphNode, RouteResult, RouteStep, MODE_COLORS, normalizeMode, getDisplayMode } from "../lib/algiersGraph";


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
  nodes?: GraphNode[];
}

function TransportIcon({ type }: { type: RouteStep["transport"] }) {
  const size = 14;
  const mode = normalizeMode(type) as string;
  if (mode === "bus") return <Bus size={size} />;
  if (mode === "tram" || mode === "metro") return <Train size={size} />;
  if (mode === "taxi") return <Car size={size} />;
  return <Footprints size={size} />;
}

function transportColor(type: RouteStep["transport"]): string {
  const mode = normalizeMode(type);
  return (MODE_COLORS as any)[mode] || MODE_COLORS.default;
}

function transportLabel(type: RouteStep["transport"], line?: string): string {
  const mode = normalizeMode(type);
  if (mode === "bus") return `Bus ${line ?? ""}`;
  if (mode === "metro") return `Metro ${line ?? ""}`;
  if (mode === "tram") return `Tram ${line ?? ""}`;
  if (mode === "walk") return "Walk";
  return String(type);
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
    if (state?.result?.segments) {
      console.log("segments debug:", state.result.segments.map(s => ({
        from: s.from,
        to: s.to,
        mode: s.mode,
        money: s.money,
        co2: s.co2,
        displayMode: getDisplayMode(s)
      })));
    }
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

  const { startNode, endNode, result, nodes } = state;

  return (
    <div
      data-cmp="Results"
      className="min-h-screen lg:h-screen w-full bg-[var(--background)] flex flex-col overflow-y-auto lg:overflow-hidden"
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
            onClick={() => navigate("/main")}
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
            <div className="text-res-base font-bold text-[var(--neon)]">Route Results</div>
            <div className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] tracking-wide uppercase">
              Optimal Path Found
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <div
            className="hidden min-[800px]:flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full max-w-[140px] sm:max-w-[280px] md:max-w-[400px] overflow-hidden"
          >
            <Navigation size={12} className="text-[var(--neon)] shrink-0" />
            <span className="text-[11px] sm:text-xs text-[var(--foreground)] truncate">
              {startNode.name}
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)] shrink-0">→</span>
            <MapPin size={12} className="text-[#8b5cf6] shrink-0" />
            <span className="text-[11px] sm:text-xs text-[var(--foreground)] truncate">
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
          className="content-wrapper results-layout flex flex-col lg:flex-row flex-1 w-full mt-[60px] lg:h-[calc(100vh-60px)] lg:overflow-hidden"
        >
          {/* Left: Route Details */}
          <div
            className="w-full lg:w-[360px] xl:w-[380px] shrink-0 bg-[var(--surface)] border-r border-[var(--border)] overflow-y-auto p-4 flex flex-col gap-4"
          >
            {/* Metrics Row */}
            <div>
              <h3 className="text-[10px] font-bold text-[var(--muted-foreground)] tracking-wider uppercase mb-2">
                Route Metrics
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <MetricCard
                  icon={<Clock size={12} style={{ color: "var(--neon)" }} />}
                  label="Time"
                  value={String(result.totalTime)}
                  unit="min"
                  color="var(--neon)"
                  dimColor="var(--neon-dim)"
                />
                <MetricCard
                  icon={<DollarSign size={12} style={{ color: "#f59e0b" }} />}
                  label="Cost"
                  value={String(result.totalCost)}
                  unit="DZD"
                  color="#f59e0b"
                  dimColor="rgba(245,158,11,0.15)"
                />
                <MetricCard
                  icon={<Leaf size={12} style={{ color: "#10b981" }} />}
                  label="CO₂"
                  value={String(result.totalCO2)}
                  unit="g"
                  color="#10b981"
                  dimColor="rgba(16,185,129,0.15)"
                />
              </div>

              {/* Responsive Route Endpoint Summary (Only visible < 800px) */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 min-[800px]:hidden">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 flex flex-col">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
                    Start
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold text-[var(--foreground)] truncate" title={startNode.name}>
                    {startNode.name}
                  </div>
                </div>

                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 flex flex-col">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-purple-500">
                    Arrival
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold text-[var(--foreground)] truncate" title={endNode.name}>
                    {endNode.name}
                  </div>
                </div>
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
              <h3 className="text-[10px] font-bold text-[var(--muted-foreground)] tracking-wider uppercase mb-3">
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
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border"
                          style={{
                            background: `${color}18`,
                            border: `1.5px solid ${color}50`,
                            color: color,
                          }}
                        >
                          <TransportIcon type={step.transport} />
                        </div>
                        {i < result.steps.length - 1 && (
                          <div
                            className="w-px h-6 bg-linear-to-b"
                            style={{
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-semibold text-[var(--foreground)] leading-tight">
                            {step.instruction}
                          </span>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                            style={{
                              background: `${color}18`,
                              border: `1px solid ${color}35`,
                              color: color,
                            }}
                          >
                            {transportLabel(step.transport, step.line)}
                          </span>
                        </div>
                        <div className="flex gap-2.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            ⏱ {step.timeMins} min
                          </span>
                          {step.costDZD > 0 && (
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              💰 {step.costDZD} DZD
                            </span>
                          )}
                          {step.co2Grams > 0 && (
                            <span className="text-[10px] text-[var(--muted-foreground)]">
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
                className="flex items-center gap-2.5 mt-1 p-2.5 bg-[var(--accent-to-dim)] border border-[var(--accent-to-border)] rounded-xl animate-float-up opacity-0"
                style={{ animationDelay: "1s" }}
              >
                <div
                  className="w-7 h-7 rounded-full bg-[var(--accent-to-dim)] border border-[var(--accent-to-border)] flex items-center justify-center shrink-0"
                >
                  <MapPin size={12} className="text-[#8b5cf6]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[var(--foreground)] m-0">
                    You have arrived!
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] m-0 truncate">
                    {endNode.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => navigate("/main")}
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

          {/* Map Area Section */}
          <div className="w-full lg:flex-1 px-2 sm:px-4 lg:px-0 pb-4 lg:pb-0 flex flex-col min-h-[450px]">
            <div className="relative w-full flex-1 min-h-[400px] lg:h-full bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden border border-[var(--border)]">
              <AlgiersMap
                startNode={startNode}
                endNode={endNode}
                routeResult={result}
                onNodeSelect={() => {}}
                selectMode="start"
                nodes={nodes}
              />

              {/* Floating metrics overlay overlay */}
              <div
                className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 animate-float-up opacity-0"
                style={{ animationDelay: "0.2s" }}
              >
                {[
                  { icon: "⏱", label: `${result.totalTime} min`, color: "var(--neon)", border: "rgba(0,212,200,0.3)" },
                  { icon: "💰", label: `${result.totalCost} DZD`, color: "#f59e0b", border: "rgba(245,158,11,0.3)" },
                  { icon: "🌿", label: `${result.totalCO2}g CO₂`, color: "#10b981", border: "rgba(16,185,129,0.3)" },
                ].map(item => (
                  <div
                    key={item.label}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[var(--card)]/95 backdrop-blur-md border rounded-xl flex items-center gap-2 shadow-lg"
                    style={{ borderColor: item.border }}
                  >
                    <span className="text-xs sm:text-sm">{item.icon}</span>
                    <span className="text-[11px] sm:text-xs font-bold" style={{ color: item.color }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile styles - updated for 770px stability */}
      <style>{`
        @media (max-width: 770px) {
          .results-layout {
            padding: 12px !important;
            gap: 12px !important;
          }
          .results-layout > div:first-child {
            width: 100% !important;
            height: auto !important;
            border-radius: 16px !important;
            padding: 16px !important;
            background: var(--card) !important;
            border: 1px solid var(--border) !important;
          }
          .results-layout > div:last-child {
            width: 100% !important;
            height: 500px !important;
            min-height: 400px !important;
            border-radius: 16px !important;
            border: 1px solid var(--border) !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}
