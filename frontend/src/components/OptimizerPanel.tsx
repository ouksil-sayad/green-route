import React from "react";
import { Clock, DollarSign, Leaf, Zap, TrendingDown, Wind, ArrowRightLeft } from "lucide-react";
import { GraphNode } from "../lib/algiersGraph";
import { useTheme } from "../hooks/use-theme";
import JourneyCard from "./JourneyCard";

interface OptimizerPanelProps {
  startNode?: GraphNode | null;
  endNode?: GraphNode | null;
  timeWeight?: number;
  costWeight?: number;
  co2Weight?: number;
  selectMode?: "start" | "end";
  onTimeWeight?: (v: number) => void;
  onCostWeight?: (v: number) => void;
  onCO2Weight?: (v: number) => void;
  onSwap?: () => void;
  onFindRoute?: () => void;
  onSelectModeChange?: (mode: "start" | "end") => void;
  onPreset?: (preset: "fastest" | "cheapest" | "greenest") => void;
}

interface SliderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
}

function PrioritySlider({ icon, label, value, min, max, unit, color, onChange }: SliderProps) {
  const { theme } = useTheme();
  const pct = ((value - min) / (max - min)) * 100;
  const isLight = theme === "light";

  const trackBg = isLight ? "var(--slider-track)" : "var(--accent)";
  const activeTrack = isLight 
    ? `linear-gradient(to right, ${color}cc, ${color})`
    : `linear-gradient(to right, ${color}88, ${color})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: isLight ? "var(--surface-3)" : `${color}22`,
              border: `1px solid ${isLight ? "var(--border)" : `${color}44`}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isLight ? "var(--muted-foreground)" : color,
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{label}</span>
        </div>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: isLight ? "var(--foreground)" : color,
            background: isLight ? "var(--surface-3)" : `${color}15`,
            padding: "2px 10px",
            borderRadius: "999px",
            border: `1px solid ${isLight ? "var(--border)" : `${color}30`}`,
          }}
        >
          {value} {unit}
        </span>
      </div>
      <div style={{ position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "4px",
            borderRadius: "2px",
            background: trackBg,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: activeTrack,
              borderRadius: "2px",
              transition: "width 0.1s ease",
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "relative",
            width: "100%",
            height: "20px",
            appearance: "none",
            background: "transparent",
            cursor: "pointer",
            zIndex: 1,
          }}
          className="slider-thumb-neon"
        />
      </div>
    </div>
  );
}

export default function OptimizerPanel({
  startNode = null,
  endNode = null,
  timeWeight = 12,
  costWeight = 400,
  co2Weight = 150,
  selectMode = "start",
  onTimeWeight = () => {},
  onCostWeight = () => {},
  onCO2Weight = () => {},
  onSwap = () => {},
  onFindRoute = () => {},
  onSelectModeChange = () => {},
  onPreset = () => {},
}: OptimizerPanelProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const canFindRoute = startNode !== null && endNode !== null;

  return (
    <div
      data-cmp="OptimizerPanel"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Journey Section */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Your Journey
          </h3>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0 0" }}>
            Click a card, then tap the map to set location
          </p>
          <div style={{ fontSize: "10px", color: "var(--neon)", marginTop: "4px", fontWeight: 800 }}>
            DEBUG: S={startNode?.id ?? "null"} | E={endNode?.id ?? "null"} | M={selectMode}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <JourneyCard
            role="from"
            node={startNode}
            isActive={selectMode === "start"}
            onClick={() => onSelectModeChange("start")}
          />

          {/* Swap button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={onSwap}
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
                transition: "all 0.2s ease",
                color: "var(--neon)",
              }}
              title="Swap locations"
            >
              <ArrowRightLeft size={15} />
            </button>
          </div>

          <JourneyCard
            role="to"
            node={endNode}
            isActive={selectMode === "end"}
            onClick={() => onSelectModeChange("end")}
          />
        </div>
      </div>

      {/* AI Optimizer Section */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              Drag to adjust priorities
            </h3>
          </div>
        </div>

          {/* Unified Time Priority Slider & Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: isLight ? "var(--surface-3)" : `var(--neon-dim)`,
                    border: `1px solid ${isLight ? "var(--border)" : `var(--neon)`}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isLight ? "var(--muted-foreground)" : "var(--neon)",
                  }}
                >
                  <Clock size={13} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Time Priority</span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={Math.floor(timeWeight)}
                  onChange={(e) => onTimeWeight(Number(e.target.value) + (timeWeight % 1))}
                  style={{
                    width: "40px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isLight ? "var(--foreground)" : "var(--neon)",
                    background: isLight ? "var(--surface-3)" : "rgba(0,212,200,0.15)",
                    padding: "2px 0",
                    borderRadius: "6px",
                    border: `1px solid ${isLight ? "var(--border)" : "rgba(0,212,200,0.3)"}`,
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={Math.round((timeWeight % 1) * 60)}
                  onChange={(e) => onTimeWeight(Math.floor(timeWeight) + (Number(e.target.value) / 60))}
                  style={{
                    width: "40px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isLight ? "var(--foreground)" : "var(--neon)",
                    background: isLight ? "var(--surface-3)" : "rgba(0,212,200,0.15)",
                    padding: "2px 0",
                    borderRadius: "6px",
                    border: `1px solid ${isLight ? "var(--border)" : "rgba(0,212,200,0.3)"}`,
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>min</span>
              </div>
            </div>

            <div style={{ position: "relative", height: "20px", display: "flex", alignItems: "center" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: "4px",
                  borderRadius: "2px",
                  background: isLight ? "var(--slider-track)" : "var(--accent)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(timeWeight / 24) * 100}%`,
                    height: "100%",
                    background: isLight 
                      ? `linear-gradient(to right, var(--neon)cc, var(--neon))`
                      : `linear-gradient(to right, var(--neon)88, var(--neon))`,
                    borderRadius: "2px",
                    transition: "width 0.1s ease",
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={1/60}
                value={timeWeight}
                onChange={e => onTimeWeight(Number(e.target.value))}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "20px",
                  appearance: "none",
                  background: "transparent",
                  cursor: "pointer",
                  zIndex: 1,
                }}
                className="slider-thumb-neon"
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <PrioritySlider
            icon={<DollarSign size={13} style={{ color: "#f59e0b" }} />}
            label="Cost"
            value={costWeight}
            min={0}
            max={1000}
            unit="DZD"
            color="#f59e0b"
            onChange={onCostWeight}
          />
          <PrioritySlider
            icon={<Leaf size={13} style={{ color: "#10b981" }} />}
            label="CO₂"
            value={co2Weight}
            min={0}
            max={500}
            unit="g"
            color="#10b981"
            onChange={onCO2Weight}
          />
        </div>

        {/* Presets */}
        <div style={{ marginTop: "18px" }}>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "10px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Presets
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { key: "fastest" as const, label: "Fastest", icon: <Zap size={11} />, color: "var(--neon)", pastel: "var(--pastel-blue)" },
              { key: "cheapest" as const, label: "Cheapest", icon: <TrendingDown size={11} />, color: "#f59e0b", pastel: "var(--pastel-orange)" },
              { key: "greenest" as const, label: "Greenest", icon: <Wind size={11} />, color: "#10b981", pastel: "var(--pastel-green)" },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => onPreset(p.key)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: "0.75rem",
                  background: isLight ? p.pastel : "var(--surface-3)",
                  border: `1px solid ${isLight ? "transparent" : "var(--border)"}`,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  transition: "all 0.2s ease",
                  color: isLight ? "var(--muted-foreground)" : p.color,
                }}
              >
                {p.icon}
                <span style={{ color: isLight ? "var(--foreground)" : p.color }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Find Route CTA */}
        <button
          onClick={canFindRoute ? onFindRoute : undefined}
          style={{
            width: "100%",
            marginTop: "16px",
            padding: "14px",
            borderRadius: "0.875rem",
            background: canFindRoute
              ? "linear-gradient(135deg, var(--primary), var(--neon-blue))"
              : "var(--accent)",
            border: canFindRoute ? "none" : "1px solid var(--border)",
            cursor: canFindRoute ? "pointer" : "not-allowed",
            color: canFindRoute ? "var(--primary-foreground)" : "var(--muted-foreground)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            transition: "all 0.3s ease",
            boxShadow: canFindRoute ? "0 4px 24px rgba(0,212,200,0.3)" : "none",
          }}
        >
          {canFindRoute ? "⚡ Find Optimal Route" : "Select Start & End First"}
        </button>
      </div>
    </div>
  );
}
