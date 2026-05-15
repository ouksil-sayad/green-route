export interface GraphNode {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  type?: "landmark" | "transit" | "hub";
  mode?: string;
  stop_id?: string | number;
}

export interface GraphEdge {
  from: string | number;
  to: string | number;
  timeMins: number;
  costDZD: number;
  co2Grams: number;
  transport: "walk" | "bus" | "metro" | "tram" | "train" | "taxi";
  line?: string;
}

export interface RouteResult {
  path: GraphNode[];
  coordinates?: [number, number][];
  totalTime: number;
  totalCost: number;
  totalCO2: number;
  steps: RouteStep[];
  segments?: RouteSegment[];
}

export interface RouteSegment {
  mode: string;
  coordinates: [number, number][];
  from: string;
  to: string;
  time: number;
  money: number;
  co2: number;
}

export interface RouteStep {
  instruction: string;
  transport: "walk" | "bus" | "metro" | "tram" | "train" | "taxi" | string;
  from: string;
  to: string;
  timeMins: number;
  costDZD: number;
  co2Grams: number;
  line?: string;
  mode?: string;
}

export const MODE_COLORS = {
  bus: "#2563eb",
  tram: "#16a34a",
  metro: "#9333ea",
  train: "#eab308",
  walk: "#f97316",
  default: "#64748b"
};

export function normalizeMode(mode: any) {
  if (!mode) return "default";
  const value = String(mode).toLowerCase();
  if (value === "bus") return "bus";
  if (value === "tram") return "tram";
  if (value === "metro") return "metro";
  if (value === "train") return "train";
  if (value === "walk" || value === "walking" || value === "foot") return "walk";
  
  if (value.includes("bus")) return "bus";
  if (value.includes("tram")) return "tram";
  if (value.includes("metro")) return "metro";
  if (value.includes("train")) return "train";
  if (value.includes("walk")) return "walk";
  return "default";
}

export function getDisplayMode(segment: any) {
  const rawMode = normalizeMode(segment.mode);
  const money = Number(segment.money ?? segment.cost ?? 0);

  if (rawMode === "walk" && money > 0) {
    const text = `${segment.from || ""} ${segment.to || ""} ${segment.raw_mode || ""}`.toLowerCase();
    if (text.includes("tram")) return "tram";
    if (text.includes("metro")) return "metro";
    if (text.includes("train")) return "train";
    if (text.includes("bus")) return "bus";
    return "bus"; // Default to bus if cost > 0 but mode is walk
  }

  return rawMode;
}

export let ALGIERS_NODES: GraphNode[] = [
  { id: 1, name: "Place des Martyrs", lat: 36.7856739, lng: 3.0595851, type: "hub", mode: "Metro" },
  { id: 2, name: "Ali Boumendjel", lat: 36.7788456, lng: 3.0583215, type: "hub", mode: "Metro" },
  { id: 3, name: "Tafourah Grande Poste", lat: 36.7722145, lng: 3.0589142, type: "hub", mode: "Metro" }
];

export function nearestNode(lat: number, lng: number): GraphNode {
  let min = Infinity;
  let nearest = ALGIERS_NODES[0];
  for (const n of ALGIERS_NODES) {
    const d = Math.sqrt(Math.pow(n.lat - lat, 2) + Math.pow(n.lng - lng, 2));
    if (d < min) {
      min = d;
      nearest = n;
    }
  }
  return nearest;
}

export function setAlgiersNodes(nodes: GraphNode[]) {
  ALGIERS_NODES = nodes;
}

export function mapBackendToFrontend(backendRoute: any): RouteResult {
  const { path, coordinates, totals, segments } = backendRoute;

  const steps: RouteStep[] = segments.map((seg: any) => {
    const displayMode = getDisplayMode(seg);
    let instruction = "";
    if (displayMode === "walk") {
      instruction = `Walk to ${seg.to}`;
    } else if (["bus", "tram", "metro", "train"].includes(displayMode)) {
      const modeLabel = displayMode === "metro" ? "Metro" : (displayMode === "train" ? "Train" : displayMode.charAt(0).toUpperCase() + displayMode.slice(1));
      instruction = `Ride ${modeLabel} to ${seg.to}`;
    } else {
      instruction = `Go to ${seg.to}`;
    }

    return {
      instruction,
      transport: displayMode,
      from: seg.from,
      to: seg.to,
      timeMins: seg.time,
      costDZD: seg.money,
      co2Grams: seg.co2,
      line: seg.line,
      mode: seg.mode // Keep original mode for reference
    };
  });

  return {
    path: path.map((p: any) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lon,
      type: "transit",
      mode: p.mode,
      stop_id: p.stop_id
    })),
    coordinates: coordinates,
    totalTime: totals.time,
    totalCost: totals.money,
    totalCO2: totals.co2,
    steps: steps,
    segments: segments.map((seg: any) => ({
      mode: seg.mode,
      coordinates: seg.coordinates,
      from: seg.from,
      to: seg.to,
      time: seg.time,
      money: seg.money,
      co2: seg.co2
    }))
  };
}
