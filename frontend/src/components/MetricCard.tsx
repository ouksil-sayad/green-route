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
      style={{
        flex: 1,
        background: "var(--surface-2)",
        border: `1px solid ${color}33`,
        borderRadius: "1rem",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            background: dimColor,
            border: `1px solid ${color}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
        <span style={{ fontSize: "26px", fontWeight: 800, color: color, lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: 500 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}
