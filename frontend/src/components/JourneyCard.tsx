
import { MapPin, Navigation } from "lucide-react";
import { GraphNode } from "../lib/algiersGraph";

interface JourneyCardProps {
  role?: "from" | "to";
  node?: GraphNode | null;
  isActive?: boolean;
  onClick?: () => void;
}

export default function JourneyCard({
  role = "from",
  node = null,
  isActive = false,
  onClick = () => {},
}: JourneyCardProps) {
  const isFrom = role === "from";
  const label = isFrom ? "FROM" : "TO";
  const placeholder = isFrom ? "Select departure" : "Select destination";
  const accentColor = isFrom ? "var(--neon)" : "var(--accent-to)";
  const accentDim = isFrom ? "var(--neon-dim)" : "var(--accent-to-dim, rgba(139,92,246,0.15))";
  const accentBorder = isFrom ? "var(--ring)" : "var(--accent-to-border, rgba(139,92,246,0.4))";

  return (
    <button
      data-cmp="JourneyCard"
      onClick={onClick}
      style={{
        width: "100%",
        background: isActive ? accentDim : "var(--surface-2)",
        border: `1px solid ${isActive ? accentBorder : "var(--border)"}`,
        borderRadius: "1rem",
        padding: "14px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
        boxShadow: isActive ? `0 0 20px ${accentDim}` : "none",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: accentDim,
            border: `1px solid ${accentBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isFrom ? (
            <Navigation size={18} style={{ color: accentColor }} />
          ) : (
            <MapPin size={18} style={{ color: accentColor }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: accentColor,
              marginBottom: "2px",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: node ? 600 : 400,
              color: node ? "var(--foreground)" : "var(--muted-foreground)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {node ? node.name : placeholder}
          </div>
          {node && (
            <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
              {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
            </div>
          )}
        </div>
        {isActive && (
          <div
            style={{
              fontSize: "10px",
              padding: "3px 8px",
              borderRadius: "999px",
              background: accentDim,
              border: `1px solid ${accentBorder}`,
              color: accentColor,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Selecting
          </div>
        )}
      </div>
    </button>
  );
}
