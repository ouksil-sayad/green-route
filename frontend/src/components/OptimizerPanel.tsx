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


interface PrioritySliderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isSaved: boolean;
  onSave: () => void;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function PrioritySlider({ icon, label, value, color, isSaved, onSave, onChange, disabled }: PrioritySliderProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const trackBg = isLight ? "var(--slider-track)" : "var(--accent)";
  const activeTrack = isLight 
    ? `linear-gradient(to right, ${color}cc, ${color})`
    : `linear-gradient(to right, ${color}88, ${color})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: disabled ? 0.6 : 1 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: isLight ? "var(--foreground)" : color,
              background: isLight ? "var(--surface-3)" : `${color}15`,
              padding: "2px 8px",
              borderRadius: "999px",
              border: `1px solid ${isLight ? "var(--border)" : `${color}30`}`,
              minWidth: "45px",
              textAlign: "center"
            }}
          >
            {Math.round(value)}%
          </span>
          <button
            onClick={onSave}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: isSaved ? "var(--neon)" : "var(--surface-3)",
              border: `1px solid ${isSaved ? "var(--neon)" : "var(--border)"}`,
              color: isSaved ? "var(--background)" : "var(--muted-foreground)",
            }}
          >
            {isSaved ? "Saved" : "Save"}
          </button>
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
            background: trackBg,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${value}%`,
              height: "100%",
              background: activeTrack,
              borderRadius: "2px",
              transition: "width 0.1s ease",
            }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled || isSaved}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "relative",
            width: "100%",
            height: "20px",
            appearance: "none",
            background: "transparent",
            cursor: isSaved ? "not-allowed" : "pointer",
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
  timeWeight = 33,
  costWeight = 33,
  co2Weight = 34,
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

  const [saved, setSaved] = React.useState({ time: false, cost: false, co2: false });

  const handleWeightChange = (type: "time" | "cost" | "co2", newValue: number) => {
    // Determine which weights are locked/saved
    const keys: ("time" | "cost" | "co2")[] = ["time", "cost", "co2"];
    const otherKeys = keys.filter(k => k !== type);
    const lockedKeys = otherKeys.filter(k => saved[k]);
    const unlockedKeys = otherKeys.filter(k => !saved[k]);

    // Current values
    const currentWeights = { time: timeWeight, cost: costWeight, co2: co2Weight };
    
    // Total of locked weights
    const lockedTotal = lockedKeys.reduce((sum, k) => sum + currentWeights[k], 0);
    
    // Max allowed for the moving slider
    const maxValue = 100 - lockedTotal;
    const clampedValue = Math.min(newValue, maxValue);

    // Remaining to distribute among unlocked
    const remaining = 100 - lockedTotal - clampedValue;

    // Distribute remaining among unlocked other keys
    const updates: any = { [type]: clampedValue };
    
    if (unlockedKeys.length === 2) {
      // Split remaining equally
      updates[unlockedKeys[0]] = remaining / 2;
      updates[unlockedKeys[1]] = remaining / 2;
    } else if (unlockedKeys.length === 1) {
      updates[unlockedKeys[0]] = remaining;
    }
    // If 0 unlocked, we can't really move the slider (handled by disabled/max)

    if (updates.time !== undefined) onTimeWeight(updates.time);
    if (updates.cost !== undefined) onCostWeight(updates.cost);
    if (updates.co2 !== undefined) onCO2Weight(updates.co2);
  };

  const toggleSave = (type: "time" | "cost" | "co2") => {
    setSaved(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleReset = () => {
    setSaved({ time: false, cost: false, co2: false });
    onTimeWeight(0);
    onCostWeight(0);
    onCO2Weight(0);
  };

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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <JourneyCard
            role="from"
            node={startNode}
            isActive={selectMode === "start"}
            onClick={() => onSelectModeChange("start")}
          />

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Drag to adjust priorities
          </h3>
          <button
            onClick={handleReset}
            style={{
              padding: "4px 12px",
              borderRadius: "8px",
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              color: "var(--destructive)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <PrioritySlider
            icon={<Clock size={13} />}
            label="Time Priority"
            value={timeWeight}
            color="var(--neon)"
            isSaved={saved.time}
            onSave={() => toggleSave("time")}
            onChange={v => handleWeightChange("time", v)}
            disabled={saved.cost && saved.co2}
          />
          <PrioritySlider
            icon={<DollarSign size={13} />}
            label="Cost"
            value={costWeight}
            color="#f59e0b"
            isSaved={saved.cost}
            onSave={() => toggleSave("cost")}
            onChange={v => handleWeightChange("cost", v)}
            disabled={saved.time && saved.co2}
          />
          <PrioritySlider
            icon={<Leaf size={13} />}
            label="CO₂"
            value={co2Weight}
            color="#10b981"
            isSaved={saved.co2}
            onSave={() => toggleSave("co2")}
            onChange={v => handleWeightChange("co2", v)}
            disabled={saved.time && saved.cost}
          />
        </div>

        {/* Presets */}
        <div style={{ marginTop: "24px" }}>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "12px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
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
                onClick={() => {
                  setSaved({ time: false, cost: false, co2: false });
                  onPreset(p.key);
                }}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  borderRadius: "0.75rem",
                  background: isLight ? p.pastel : "var(--surface-3)",
                  border: `1px solid ${isLight ? "transparent" : "var(--border)"}`,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
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
            marginTop: "20px",
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
