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
  isLoading?: boolean;
  onTimeWeight?: (v: number) => void;
  onCostWeight?: (v: number) => void;
  onCO2Weight?: (v: number) => void;
  onSwap?: () => void;
  onFindRoute?: () => void;
  onSelectModeChange?: (mode: "start" | "end") => void;
  onPreset?: (preset: "fastest" | "cheapest" | "greenest") => void;
  onPickerOpen?: (role: "start" | "end") => void;
  nodes?: GraphNode[];
  algorithm?: string;
  heuristic?: string | null;
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
    <div className="flex flex-col gap-2" style={{ opacity: disabled ? 0.6 : 1 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border"
            style={{
              background: isLight ? "var(--surface-3)" : `${color}22`,
              borderColor: isLight ? "var(--border)" : `${color}44`,
              color: isLight ? "var(--muted-foreground)" : color,
            }}
          >
            {icon}
          </div>
          <span className="text-[12px] font-bold text-[var(--foreground)]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border min-w-[38px] text-center"
            style={{
              color: isLight ? "var(--foreground)" : color,
              background: isLight ? "var(--surface-3)" : `${color}15`,
              borderColor: isLight ? "var(--border)" : `${color}30`,
            }}
          >
            {Math.round(value)}%
          </span>
          <button
            onClick={onSave}
            className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase cursor-pointer transition-all"
            style={{
              background: isSaved ? "var(--neon)" : "var(--surface-3)",
              borderColor: isSaved ? "var(--neon)" : "var(--border)",
              color: isSaved ? "var(--background)" : "var(--muted-foreground)",
              border: "1px solid",
            }}
          >
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
      <div className="relative h-4 flex items-center">
        <div
          className="absolute inset-x-0 h-1 rounded-full overflow-hidden"
          style={{ background: trackBg }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${value}%`, background: activeTrack }}
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
          className="slider-thumb-neon relative w-full h-4 bg-transparent appearance-none z-10"
          style={{ cursor: isSaved ? "not-allowed" : "pointer" }}
        />
      </div>
    </div>
  );
}

import { Loader2 } from "lucide-react";

export default function OptimizerPanel({
  startNode = null,
  endNode = null,
  timeWeight = 33,
  costWeight = 33,
  co2Weight = 34,
  selectMode = "start",
  isLoading = false,
  onTimeWeight = () => {},
  onCostWeight = () => {},
  onCO2Weight = () => {},
  onSwap = () => {},
  onFindRoute = () => {},
  onSelectModeChange = () => {},
  onPreset = () => {},
  onPickerOpen = () => {},
}: OptimizerPanelProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const canFindRoute = startNode !== null && endNode !== null && !isLoading;

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
    onTimeWeight(33);
    onCostWeight(33);
    onCO2Weight(34);
  };

  return (
    <div
      data-cmp="OptimizerPanel"
      className="w-full flex flex-col gap-3 sm:gap-4"
    >
      {/* Journey Section */}
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5"
      >
        <div className="mb-3 sm:mb-4">
          <h3 className="text-res-sm font-bold text-[var(--foreground)] m-0">
            Your Journey
          </h3>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
            Click a card, then tap the map to set location
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <JourneyCard
            role="from"
            node={startNode}
            isActive={selectMode === "start"}
            onClick={() => {
              onSelectModeChange("start");
              onPickerOpen("start");
            }}
          />

          <div className="flex justify-center -my-1.5 relative z-10">
            <button
              onClick={onSwap}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--accent)] border border-[var(--border)] cursor-pointer flex items-center justify-center transition-all hover:scale-110 text-[var(--neon)]"
              title="Swap locations"
            >
              <ArrowRightLeft size={13} />
            </button>
          </div>

          <JourneyCard
            role="to"
            node={endNode}
            isActive={selectMode === "end"}
            onClick={() => {
              onSelectModeChange("end");
              onPickerOpen("end");
            }}
          />
        </div>
      </div>

      {/* AI Optimizer Section */}
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-res-sm font-bold text-[var(--foreground)] m-0">
            Adjust Priorities
          </h3>
          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-lg bg-[var(--surface-3)] border border-[var(--border)] text-[var(--destructive)] text-[10px] font-bold cursor-pointer transition-all hover:bg-[var(--destructive)] hover:text-white"
          >
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5">
          <PrioritySlider
            icon={<Clock size={12} />}
            label="Time"
            value={timeWeight}
            color="var(--neon)"
            isSaved={saved.time}
            onSave={() => toggleSave("time")}
            onChange={v => handleWeightChange("time", v)}
            disabled={saved.cost && saved.co2}
          />
          <PrioritySlider
            icon={<DollarSign size={12} />}
            label="Cost"
            value={costWeight}
            color="#f59e0b"
            isSaved={saved.cost}
            onSave={() => toggleSave("cost")}
            onChange={v => handleWeightChange("cost", v)}
            disabled={saved.time && saved.co2}
          />
          <PrioritySlider
            icon={<Leaf size={12} />}
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
        <div className="mt-5 sm:mt-6">
          <p className="text-[9px] text-[var(--muted-foreground)] mb-2.5 font-bold tracking-wider uppercase">
            Quick Presets
          </p>
          <div className="flex gap-2">
            {[
              { key: "fastest" as const, label: "Fast", icon: <Zap size={10} />, color: "var(--neon)", pastel: "var(--pastel-blue)" },
              { key: "cheapest" as const, label: "Cheap", icon: <TrendingDown size={10} />, color: "#f59e0b", pastel: "var(--pastel-orange)" },
              { key: "greenest" as const, label: "Green", icon: <Wind size={10} />, color: "#10b981", pastel: "var(--pastel-green)" },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => {
                  setSaved({ time: false, cost: false, co2: false });
                  onPreset(p.key);
                }}
                className="flex-1 py-1.5 sm:py-2 rounded-xl cursor-pointer text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{
                  background: isLight ? p.pastel : "var(--surface-3)",
                  border: `1px solid ${isLight ? "transparent" : "var(--border)"}`,
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
          className="w-full mt-5 sm:mt-6 py-3 sm:py-3.5 rounded-xl text-[13px] font-black tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2"
          style={{
            background: canFindRoute
              ? "linear-gradient(135deg, var(--primary), var(--neon-blue))"
              : (isLoading ? "var(--primary)" : "var(--accent)"),
            border: canFindRoute ? "none" : "1px solid var(--border)",
            cursor: canFindRoute ? "pointer" : "not-allowed",
            color: canFindRoute || isLoading ? "var(--primary-foreground)" : "var(--muted-foreground)",
            boxShadow: canFindRoute ? "0 4px 20px rgba(0,212,200,0.2)" : "none",
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Optimizing...
            </>
          ) : (
            canFindRoute ? "⚡ Find Optimal Route" : "Select Start & End"
          )}
        </button>
      </div>
    </div>
  );
}
