export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "landmark" | "transit" | "hub";
}

export interface GraphEdge {
  from: string;
  to: string;
  timeMins: number;
  costDZD: number;
  co2Grams: number;
  transport: "walk" | "bus" | "metro" | "taxi";
  line?: string;
}

export interface RouteResult {
  path: GraphNode[];
  totalTime: number;
  totalCost: number;
  totalCO2: number;
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  transport: "walk" | "bus" | "metro" | "taxi";
  from: string;
  to: string;
  timeMins: number;
  costDZD: number;
  co2Grams: number;
  line?: string;
}

export const ALGIERS_NODES: GraphNode[] = [
  { id: "grande_poste", name: "Grande Poste", lat: 36.7372, lng: 3.0560, type: "hub" },
  { id: "place_des_martyrs", name: "Place des Martyrs", lat: 36.7327, lng: 3.0610, type: "hub" },
  { id: "notre_dame", name: "Notre Dame d'Afrique", lat: 36.7720, lng: 3.0460, type: "landmark" },
  { id: "casbah", name: "La Casbah", lat: 36.7855, lng: 3.0604, type: "landmark" },
  { id: "jardin_essai", name: "Jardin d'Essai", lat: 36.7480, lng: 3.0770, type: "landmark" },
  { id: "bab_el_oued", name: "Bab El Oued", lat: 36.7812, lng: 3.0518, type: "transit" },
  { id: "belcourt", name: "Belcourt", lat: 36.7252, lng: 3.0685, type: "transit" },
  { id: "hussein_dey", name: "Hussein Dey", lat: 36.7188, lng: 3.1005, type: "transit" },
  { id: "el_harrach", name: "El Harrach", lat: 36.7158, lng: 3.1318, type: "hub" },
  { id: "ain_naadja", name: "Aïn Naadja", lat: 36.6948, lng: 3.0750, type: "transit" },
  { id: "kouba", name: "Kouba", lat: 36.7315, lng: 3.0990, type: "transit" },
  { id: "bir_mourad_rais", name: "Bir Mourad Raïs", lat: 36.7102, lng: 3.0510, type: "transit" },
  { id: "hydra", name: "Hydra", lat: 36.7280, lng: 3.0355, type: "landmark" },
  { id: "ben_aknoun", name: "Ben Aknoun", lat: 36.7462, lng: 3.0168, type: "transit" },
  { id: "alger_centre", name: "Alger Centre", lat: 36.7390, lng: 3.0495, type: "hub" },
  { id: "hamma", name: "Le Hamma", lat: 36.7395, lng: 3.0685, type: "transit" },
  { id: "agha", name: "Agha", lat: 36.7298, lng: 3.0572, type: "transit" },
  { id: "el_biar", name: "El Biar", lat: 36.7600, lng: 3.0305, type: "landmark" },
  { id: "birkhadem", name: "Birkhadem", lat: 36.7051, lng: 3.0370, type: "transit" },
  { id: "didouche_mourad", name: "Rue Didouche Mourad", lat: 36.7415, lng: 3.0523, type: "hub" },
];

export const ALGIERS_EDGES: GraphEdge[] = [
  // Metro Line 1 segment
  { from: "grande_poste", to: "place_des_martyrs", timeMins: 3, costDZD: 50, co2Grams: 8, transport: "metro", line: "M1" },
  { from: "place_des_martyrs", to: "grande_poste", timeMins: 3, costDZD: 50, co2Grams: 8, transport: "metro", line: "M1" },
  { from: "grande_poste", to: "alger_centre", timeMins: 5, costDZD: 50, co2Grams: 10, transport: "metro", line: "M1" },
  { from: "alger_centre", to: "grande_poste", timeMins: 5, costDZD: 50, co2Grams: 10, transport: "metro", line: "M1" },
  { from: "alger_centre", to: "hamma", timeMins: 4, costDZD: 50, co2Grams: 8, transport: "metro", line: "M1" },
  { from: "hamma", to: "alger_centre", timeMins: 4, costDZD: 50, co2Grams: 8, transport: "metro", line: "M1" },
  { from: "hamma", to: "jardin_essai", timeMins: 6, costDZD: 50, co2Grams: 12, transport: "metro", line: "M1" },
  { from: "jardin_essai", to: "hamma", timeMins: 6, costDZD: 50, co2Grams: 12, transport: "metro", line: "M1" },
  { from: "jardin_essai", to: "hussein_dey", timeMins: 5, costDZD: 50, co2Grams: 10, transport: "metro", line: "M1" },
  { from: "hussein_dey", to: "jardin_essai", timeMins: 5, costDZD: 50, co2Grams: 10, transport: "metro", line: "M1" },
  { from: "hussein_dey", to: "el_harrach", timeMins: 10, costDZD: 75, co2Grams: 22, transport: "metro", line: "M1" },
  { from: "el_harrach", to: "hussein_dey", timeMins: 10, costDZD: 75, co2Grams: 22, transport: "metro", line: "M1" },
  // Bus routes
  { from: "grande_poste", to: "bab_el_oued", timeMins: 12, costDZD: 30, co2Grams: 45, transport: "bus", line: "B15" },
  { from: "bab_el_oued", to: "grande_poste", timeMins: 12, costDZD: 30, co2Grams: 45, transport: "bus", line: "B15" },
  { from: "bab_el_oued", to: "casbah", timeMins: 8, costDZD: 30, co2Grams: 32, transport: "bus", line: "B15" },
  { from: "casbah", to: "bab_el_oued", timeMins: 8, costDZD: 30, co2Grams: 32, transport: "bus", line: "B15" },
  { from: "grande_poste", to: "belcourt", timeMins: 10, costDZD: 30, co2Grams: 38, transport: "bus", line: "B21" },
  { from: "belcourt", to: "grande_poste", timeMins: 10, costDZD: 30, co2Grams: 38, transport: "bus", line: "B21" },
  { from: "belcourt", to: "ain_naadja", timeMins: 20, costDZD: 40, co2Grams: 72, transport: "bus", line: "B33" },
  { from: "ain_naadja", to: "belcourt", timeMins: 20, costDZD: 40, co2Grams: 72, transport: "bus", line: "B33" },
  { from: "el_harrach", to: "kouba", timeMins: 15, costDZD: 35, co2Grams: 52, transport: "bus", line: "B44" },
  { from: "kouba", to: "el_harrach", timeMins: 15, costDZD: 35, co2Grams: 52, transport: "bus", line: "B44" },
  { from: "kouba", to: "hussein_dey", timeMins: 12, costDZD: 30, co2Grams: 44, transport: "bus", line: "B44" },
  { from: "hussein_dey", to: "kouba", timeMins: 12, costDZD: 30, co2Grams: 44, transport: "bus", line: "B44" },
  { from: "alger_centre", to: "hydra", timeMins: 18, costDZD: 35, co2Grams: 65, transport: "bus", line: "B62" },
  { from: "hydra", to: "alger_centre", timeMins: 18, costDZD: 35, co2Grams: 65, transport: "bus", line: "B62" },
  { from: "hydra", to: "ben_aknoun", timeMins: 14, costDZD: 35, co2Grams: 50, transport: "bus", line: "B62" },
  { from: "ben_aknoun", to: "hydra", timeMins: 14, costDZD: 35, co2Grams: 50, transport: "bus", line: "B62" },
  { from: "grande_poste", to: "el_biar", timeMins: 20, costDZD: 40, co2Grams: 75, transport: "bus", line: "B71" },
  { from: "el_biar", to: "grande_poste", timeMins: 20, costDZD: 40, co2Grams: 75, transport: "bus", line: "B71" },
  { from: "el_biar", to: "notre_dame", timeMins: 18, costDZD: 40, co2Grams: 65, transport: "bus", line: "B71" },
  { from: "notre_dame", to: "el_biar", timeMins: 18, costDZD: 40, co2Grams: 65, transport: "bus", line: "B71" },
  { from: "bir_mourad_rais", to: "birkhadem", timeMins: 10, costDZD: 30, co2Grams: 36, transport: "bus", line: "B52" },
  { from: "birkhadem", to: "bir_mourad_rais", timeMins: 10, costDZD: 30, co2Grams: 36, transport: "bus", line: "B52" },
  { from: "belcourt", to: "bir_mourad_rais", timeMins: 14, costDZD: 35, co2Grams: 50, transport: "bus", line: "B52" },
  { from: "bir_mourad_rais", to: "belcourt", timeMins: 14, costDZD: 35, co2Grams: 50, transport: "bus", line: "B52" },
  // Walking connections
  { from: "grande_poste", to: "didouche_mourad", timeMins: 5, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "didouche_mourad", to: "grande_poste", timeMins: 5, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "grande_poste", to: "agha", timeMins: 7, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "agha", to: "grande_poste", timeMins: 7, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "agha", to: "belcourt", timeMins: 8, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "belcourt", to: "agha", timeMins: 8, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "didouche_mourad", to: "alger_centre", timeMins: 6, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "alger_centre", to: "didouche_mourad", timeMins: 6, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "place_des_martyrs", to: "casbah", timeMins: 10, costDZD: 0, co2Grams: 0, transport: "walk" },
  { from: "casbah", to: "place_des_martyrs", timeMins: 10, costDZD: 0, co2Grams: 0, transport: "walk" },
  // Taxi connections for distant nodes
  { from: "notre_dame", to: "bab_el_oued", timeMins: 14, costDZD: 350, co2Grams: 120, transport: "taxi" },
  { from: "bab_el_oued", to: "notre_dame", timeMins: 14, costDZD: 350, co2Grams: 120, transport: "taxi" },
  { from: "ain_naadja", to: "birkhadem", timeMins: 12, costDZD: 280, co2Grams: 95, transport: "taxi" },
  { from: "birkhadem", to: "ain_naadja", timeMins: 12, costDZD: 280, co2Grams: 95, transport: "taxi" },
  { from: "el_harrach", to: "ain_naadja", timeMins: 22, costDZD: 450, co2Grams: 160, transport: "taxi" },
  { from: "ain_naadja", to: "el_harrach", timeMins: 22, costDZD: 450, co2Grams: 160, transport: "taxi" },
  { from: "ben_aknoun", to: "birkhadem", timeMins: 16, costDZD: 380, co2Grams: 130, transport: "taxi" },
  { from: "birkhadem", to: "ben_aknoun", timeMins: 16, costDZD: 380, co2Grams: 130, transport: "taxi" },
  { from: "notre_dame", to: "casbah", timeMins: 20, costDZD: 420, co2Grams: 145, transport: "taxi" },
  { from: "casbah", to: "notre_dame", timeMins: 20, costDZD: 420, co2Grams: 145, transport: "taxi" },
];

// Build adjacency list
function buildGraph(): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();
  ALGIERS_NODES.forEach(n => graph.set(n.id, []));
  ALGIERS_EDGES.forEach(edge => {
    graph.get(edge.from)?.push(edge);
  });
  return graph;
}

// Weighted Dijkstra with combined cost function
export function findOptimalRoute(
  fromId: string,
  toId: string,
  timeWeight: number,
  costWeight: number,
  co2Weight: number
): RouteResult | null {
  const graph = buildGraph();
  const nodeMap = new Map<string, GraphNode>(ALGIERS_NODES.map(n => [n.id, n]));

  // Normalize weights
  const total = timeWeight + costWeight + co2Weight;
  const wT = total > 0 ? timeWeight / total : 1/3;
  const wC = total > 0 ? costWeight / total : 1/3;
  const wE = total > 0 ? co2Weight / total : 1/3;

  // Normalize edge costs to 0-1 range
  const maxTime = 60;
  const maxCost = 1000;
  const maxCO2 = 500;

  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; edge: GraphEdge } | null>();
  const metrics = new Map<string, { time: number; cost: number; co2: number }>();

  ALGIERS_NODES.forEach(n => {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
    metrics.set(n.id, { time: 0, cost: 0, co2: 0 });
  });
  dist.set(fromId, 0);

  const visited = new Set<string>();
  const queue = [fromId];

  while (queue.length > 0) {
    // Get min dist node
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current === toId) break;

    const edges = graph.get(current) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      const weight =
        wT * (edge.timeMins / maxTime) +
        wC * (edge.costDZD / maxCost) +
        wE * (edge.co2Grams / maxCO2);
      const newDist = (dist.get(current) ?? 0) + weight;
      if (newDist < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, { node: current, edge });
        const prevMetrics = metrics.get(current)!;
        metrics.set(edge.to, {
          time: prevMetrics.time + edge.timeMins,
          cost: prevMetrics.cost + edge.costDZD,
          co2: prevMetrics.co2 + edge.co2Grams,
        });
        queue.push(edge.to);
      }
    }
  }

  if (dist.get(toId) === Infinity) return null;

  // Reconstruct path
  const path: GraphNode[] = [];
  const steps: RouteStep[] = [];
  let current: string | null = toId;

  while (current !== null) {
    const node = nodeMap.get(current);
    if (node) path.unshift(node);
    const p = prev.get(current);
    if (p) {
      const fromNode = nodeMap.get(p.node);
      const toNode = nodeMap.get(current);
      if (fromNode && toNode) {
        const edge = p.edge;
        let instruction = "";
        if (edge.transport === "walk") {
          instruction = `Walk to ${toNode.name}`;
        } else if (edge.transport === "bus") {
          instruction = `Take Bus ${edge.line} to ${toNode.name}`;
        } else if (edge.transport === "metro") {
          instruction = `Take Metro ${edge.line} to ${toNode.name}`;
        } else {
          instruction = `Taxi to ${toNode.name}`;
        }
        steps.unshift({
          instruction,
          transport: edge.transport,
          from: fromNode.name,
          to: toNode.name,
          timeMins: edge.timeMins,
          costDZD: edge.costDZD,
          co2Grams: edge.co2Grams,
          line: edge.line,
        });
      }
      current = p.node;
    } else {
      current = null;
    }
  }

  const m = metrics.get(toId)!;
  return {
    path,
    totalTime: m.time,
    totalCost: m.cost,
    totalCO2: m.co2,
    steps,
  };
}

// Find nearest node to a lat/lng click
export function nearestNode(lat: any, lng: any): GraphNode {
  // Ensure we have numbers
  const nLat = typeof lat === "number" ? lat : parseFloat(String(lat));
  const nLng = typeof lng === "number" ? lng : parseFloat(String(lng));
  
  console.log(`[nearestNode] Input: ${nLat}, ${nLng}`);
  
  let best = ALGIERS_NODES[0];
  let bestDist = Infinity;
  
  for (const node of ALGIERS_NODES) {
    const dLat = node.lat - nLat;
    const dLng = node.lng - nLng;
    const d = (dLat * dLat) + (dLng * dLng);
    
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  
  console.log(`[nearestNode] Result: ${best.name} (d2: ${bestDist.toFixed(8)})`);
  return best;
}
