import { useState, useMemo } from "react";
import { Search, X, MapPin, Bus, Train, Footprints, Filter } from "lucide-react";
import { GraphNode, MODE_COLORS, normalizeMode } from "../lib/algiersGraph";

interface NodePickerProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  onSelect: (node: GraphNode) => void;
  type: "start" | "end";
}

export default function NodePicker({ isOpen, onClose, nodes, onSelect, type }: NodePickerProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const q = search.toLowerCase();
      const matchesSearch =
        String(node.name || "").toLowerCase().includes(q) ||
        String(node.mode || "").toLowerCase().includes(q) ||
        String(node.id || "").includes(q) ||
        String(node.stop_id || "").includes(q);

      if (!matchesSearch) return false;

      if (filterMode === "all") return true;
      return normalizeMode(node.mode) === filterMode;
    });
  }, [nodes, search, filterMode]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        animation: "fade-in 0.2s ease-out"
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] max-h-[85vh] sm:max-h-[80vh] rounded-2xl flex flex-col overflow-hidden animate-scale-up"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(17,73,49,0.12)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between" style={{ borderBottom: "1px solid #e4ece7" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a2e24", margin: 0 }}>
              Select {type === "start" ? "Departure" : "Destination"}
            </h3>
            <p style={{ fontSize: "11px", color: "#6b8a7a", marginTop: "2px" }}>
              Search {nodes.length} available stations & stops
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#eef2f0",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5a7568",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3" style={{ background: "#f8faf9" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b8a7a" }}
            />
            <input
              autoFocus
              type="text"
              placeholder="Search station or mode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: "36px",
                paddingRight: "16px",
                paddingTop: "8px",
                paddingBottom: "8px",
                background: "#ffffff",
                border: "1.5px solid #d4ddd8",
                borderRadius: "10px",
                color: "#1a2e24",
                fontSize: "13px",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#114931"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#d4ddd8"}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: "all", label: "All", icon: <Filter size={10} /> },
              { id: "metro", label: "Metro", icon: <Train size={10} /> },
              { id: "train", label: "Train", icon: <Train size={10} /> },
              { id: "bus", label: "Bus", icon: <Bus size={10} /> },
              { id: "tram", label: "Tram", icon: <Bus size={10} /> },
              { id: "walk", label: "Walking", icon: <Footprints size={10} /> },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: `1px solid ${filterMode === f.id ? "#114931" : "#d4ddd8"}`,
                  background: filterMode === f.id ? "#114931" : "#ffffff",
                  color: filterMode === f.id ? "#ffffff" : "#5a7568",
                }}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredNodes.length > 0 ? (
            filteredNodes.map(node => {
              const mode = normalizeMode(node.mode);
              const color = (MODE_COLORS as any)[mode] || MODE_COLORS.default;

              return (
                <button
                  key={node.id}
                  onClick={() => {
                    onSelect(node);
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    textAlign: "left" as const,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#eef2f0"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: `${color}15`,
                      color: color,
                    }}
                  >
                    {mode === "metro" || mode === "train" ? <Train size={16} /> : (mode === "bus" ? <Bus size={16} /> : (mode === "tram" ? <Train size={16} /> : <MapPin size={16} />))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a2e24", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {node.name} — <span style={{ fontWeight: 500, color: "#5a7568" }}>{mode === "metro" ? "Metro" : (mode === "train" ? "Train" : (mode === "tram" ? "Tram" : (node.mode || "Station")))}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "capitalize", color: color }}>
                        {mode === "metro" ? "Metro" : (mode === "train" ? "Train" : (mode === "tram" ? "Tram" : (node.mode || "Station")))}
                      </span>
                      <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#b0c4b8" }} />
                      <span style={{ fontSize: "10px", color: "#6b8a7a" }}>ID: {node.id}</span>
                    </div>
                  </div>
                  <ChevronRight size={12} style={{ color: "#b0c4b8", flexShrink: 0 }} />
                </button>
              );
            })
          ) : (
            <div className="py-10 px-5 text-center text-[var(--muted-foreground)]">
              <div className="mb-3 opacity-20"><Search size={28} className="mx-auto" /></div>
              <div className="text-xs sm:text-sm font-bold">No stations found for "{search}"</div>
              <div className="text-[10px] sm:text-[11px] mt-1">Try a different name or mode</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function ChevronRight({ size, className, style }: { size: number, className?: string, style?: any }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
