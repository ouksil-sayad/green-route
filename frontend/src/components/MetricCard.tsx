import React from "react";

interface MetricCardProps {
  icon?: React.ReactNode;
  label?: string;
  value?: string;
  unit?: string;
  color?: string;
  dimColor?: string;
}

export default function MetricCard({
  icon = null,
  label = "Metric",
  value = "—",
  unit = "",
  color = "var(--neon)",
  dimColor = "rgba(0,212,200,0.15)",
}: MetricCardProps) {
  return (
    <div
      data-cmp="MetricCard"
      className="flex-1 min-w-0 p-3 sm:p-4 bg-[var(--surface-2)] border rounded-2xl flex flex-col gap-1.5 sm:gap-2"
      style={{ borderColor: `${color}33` }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border"
          style={{
            background: dimColor,
            borderColor: `${color}33`,
          }}
        >
          {icon}
        </div>
        <span className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)] font-bold tracking-wider uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span 
          className="text-res-xl sm:text-res-2xl font-black leading-none"
          style={{ color: color }}
        >
          {value}
        </span>
        <span className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] font-medium">
          {unit}
        </span>
      </div>
    </div>
  );
}
