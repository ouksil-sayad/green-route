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
        className="w-full max-w-[440px] max-h-[85vh] sm:max-h-[80vh] bg-[var(--card)] rounded-3xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-res-lg font-bold text-[var(--foreground)] m-0">
              Select {type === "start" ? "Departure" : "Destination"}
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Search {nodes.length} available stations & stops
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-3)] border-none cursor-pointer flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-3 sm:p-4 bg-[var(--surface-2)] flex flex-col gap-2.5 sm:gap-3">
          <div style={{ position: "relative" }}>
            <Search 
              size={18} 
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} 
            />
            <input 
              autoFocus
              type="text"
              placeholder="Search station or mode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-xs sm:text-sm outline-none transition-all focus:border-[var(--neon)]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: "all", label: "All", icon: <Filter size={10} /> },
              { id: "metro", label: "Metro", icon: <Train size={10} /> },
              { id: "bus", label: "Bus", icon: <Bus size={10} /> },
              { id: "tram", label: "Tram", icon: <Bus size={10} /> },
              { id: "walk", label: "Walking", icon: <Footprints size={10} /> },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all border"
                style={{
                  background: filterMode === f.id ? "var(--neon)" : "var(--surface-3)",
                  color: filterMode === f.id ? "var(--background)" : "var(--muted-foreground)",
                  borderColor: filterMode === f.id ? "var(--neon)" : "var(--border)"
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
                  className="w-full px-3 py-2 sm:px-4 sm:py-2.5 flex items-center gap-3 bg-transparent border-none rounded-xl cursor-pointer text-left transition-all hover:bg-[var(--surface-3)]"
                >
                  <div 
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}15`, color: color }}
                  >
                    {mode === "metro" ? <Train size={16} /> : (mode === "bus" ? <Bus size={16} /> : <MapPin size={16} />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">{node.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold capitalize" style={{ color: color }}>{node.mode || "Station"}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-[var(--muted-foreground)] opacity-50" />
                      <span className="text-[10px] text-[var(--muted-foreground)]">ID: {node.id}</span>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-[var(--border)] shrink-0" />
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
