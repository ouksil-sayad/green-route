import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ALGIERS_NODES, GraphNode, RouteResult, nearestNode, MODE_COLORS, normalizeMode, getDisplayMode } from "../lib/algiersGraph";

// Fix for Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon,
  iconUrl: icon,
  shadowUrl: iconShadow,
});

interface AlgiersMapProps {
  startNode?: GraphNode | null;
  endNode?: GraphNode | null;
  routeResult?: RouteResult | null;
  onNodeSelect?: (node: GraphNode, role: "start" | "end") => void;
  selectMode?: "start" | "end";
  nodes?: GraphNode[];
}

// Helper to normalize coordinates for Leaflet [lat, lng]
function normalizeCoordinates(coords: any[]): [number, number][] {
  if (!coords) return [];
  return coords.map((point: any) => {
    if (Array.isArray(point)) {
      return [Number(point[0]), Number(point[1])] as [number, number];
    }
    return [Number(point.lat), Number(point.lon ?? point.lng)] as [number, number];
  }).filter((point) => 
    point.length === 2 && 
    !isNaN(point[0]) && 
    !isNaN(point[1])
  );
}

// Helper to fit map bounds to the route
function FitRouteBounds({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!coordinates || coordinates.length < 2) return;
    try {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14 });
    } catch (e) {
      console.error("Error fitting bounds:", e);
    }
  }, [coordinates, map]);

  return null;
}

// Helper to handle map clicks
function MapEventsHandler({ onNodeSelect, selectMode }: { onNodeSelect: any, selectMode: any }) {
  useMapEvents({
    click(e) {
      const nearest = nearestNode(e.latlng.lat, e.latlng.lng);
      console.log(`[Map Click] Nearest: ${nearest.name}`);
      onNodeSelect(nearest, selectMode);
    },
  });
  return null;
}

function TransportLegend() {
  const modes = [
    { label: "Bus", mode: "bus" },
    { label: "Tram", mode: "tram" },
    { label: "Metro", mode: "metro" },
    { label: "Walk", mode: "walk" }
  ];

  return (
    <div 
      className="absolute bottom-2 right-2 z-[1000] flex items-center flex-wrap gap-2.5 sm:gap-3 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-[var(--card)]/90 backdrop-blur-md rounded-full border border-[var(--border)] shadow-lg pointer-events-auto"
    >
      {modes.map((item) => (
        <div key={item.mode} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: (MODE_COLORS as any)[item.mode],
              boxShadow: `0 0 4px ${(MODE_COLORS as any)[item.mode]}44`
            }}
          />
          <span className="text-[9px] sm:text-[10px] font-bold text-[var(--foreground)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Robust Leaflet resize helper using ResizeObserver
function LeafletResizeFix({ route }: { route?: any }) {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => {
      console.log("[Map] Robust invalidation...");
      map.invalidateSize();
      // Dispatch global resize event as well
      window.dispatchEvent(new Event('resize'));
      
      // Sequence of attempts
      [100, 300, 800, 1500].forEach(delay => {
        setTimeout(() => {
          map.invalidateSize();
          map.setView(map.getCenter()); // Force tile refresh
        }, delay);
      });
    };

    invalidate();

    window.addEventListener("resize", invalidate);

    const container = map.getContainer();
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);

    return () => {
      window.removeEventListener("resize", invalidate);
      observer.disconnect();
    };
  }, [map, route]);

  return null;
}

export default function AlgiersMap({
  startNode = null,
  endNode = null,
  routeResult = null,
  onNodeSelect = () => {},
  selectMode = "start",
  nodes = ALGIERS_NODES,
}: AlgiersMapProps) {
  const algiersCenter: [number, number] = [36.7538, 3.0588];
  const algiersBounds: L.LatLngBoundsExpression = [
    [36.55, 2.65], 
    [36.95, 3.45]
  ];

  // Filtering logic: Show only nodes that are part of the current route result
  const visibleRouteNodeIds = new Set(
    routeResult?.path?.map((item: any) => {
      if (typeof item === "object") return String(item.id ?? item.node_id ?? item.stop_id);
      return String(item);
    }) ?? []
  );

  const selectedNodeIds = new Set([
    startNode?.id,
    endNode?.id,
  ].filter(Boolean).map(String));

  const visibleNodeIds = new Set([
    ...Array.from(visibleRouteNodeIds),
    ...Array.from(selectedNodeIds)
  ]);

  const visibleNodes = routeResult
    ? nodes.filter((node) =>
        visibleNodeIds.has(String(node.id))
      )
    : [];

  // Route positions normalization
  const routePositions = normalizeCoordinates(routeResult?.coordinates || []);

  // Check if we have valid segments with coordinates
  const hasSegmentCoordinates = routeResult?.segments?.some(
    (segment) => segment.coordinates && segment.coordinates.length > 1
  );

  // Debug logs as requested
  useEffect(() => {
    if (routeResult) {
      console.log("route.segments:", routeResult?.segments);
      console.log("hasSegmentCoordinates:", hasSegmentCoordinates);
      console.log("routePositions (normalized):", routePositions);
      console.log("visibleNodes:", visibleNodes);
    }
  }, [routeResult, visibleNodes, routePositions, hasSegmentCoordinates]);

  return (
    <div data-cmp="AlgiersMap" className="absolute inset-0 w-full h-full overflow-hidden rounded-[inherit]">
      <MapContainer
        key={`${startNode?.id || "start"}-${endNode?.id || "end"}`}
        center={algiersCenter}
        zoom={11}
        minZoom={10}
        maxZoom={18}
        maxBounds={algiersBounds}
        maxBoundsViscosity={0.8}
        className="z-[1]"
        style={{ 
          position: "absolute",
          top: "-1%",
          left: "-1%",
          width: "102%",
          height: "102%",
          background: "#000" 
        }}
      >
        <LeafletResizeFix route={routeResult} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapEventsHandler onNodeSelect={onNodeSelect} selectMode={selectMode} />

        {/* Dynamic Nodes - filtered to show only route-related nodes */}
        {visibleNodes.map((node) => {
          const mode = normalizeMode(node.mode);
          const color = (MODE_COLORS as any)[mode] || MODE_COLORS.default;
          
          return (
            <CircleMarker
              key={`${node.id}-${node.lat}-${node.lng}`}
              center={[node.lat, node.lng]}
              radius={6}
              pathOptions={{
                fillColor: color,
                color: "rgba(0,0,0,0.5)",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div style={{ fontWeight: 700, color: "var(--foreground)" }}>{node.name}</div>
                <div style={{ fontSize: "11px", color: color, textTransform: "capitalize" }}>Mode: {node.mode || "Unknown"}</div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Route Visualization */}
        {routeResult && (
          <>
            {/* Draw segments if available, otherwise draw full path as fallback */}
            {hasSegmentCoordinates ? (
              routeResult.segments?.map((segment, index) => {
                const positions = normalizeCoordinates(segment.coordinates);
                if (positions.length < 2) return null;

                const displayMode = getDisplayMode(segment);
                const color = (MODE_COLORS as any)[displayMode] || MODE_COLORS.default;

                return (
                  <Polyline
                    key={`segment-${index}`}
                    positions={positions}
                    pathOptions={{
                      color: color,
                      weight: displayMode === "walk" ? 5 : 7,
                      opacity: 0.95,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                );
              })
            ) : (
              // Fallback to route.coordinates
              routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: MODE_COLORS.bus,
                    weight: 7,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )
            )}
            
            <FitRouteBounds coordinates={routePositions.length > 1 ? routePositions : normalizeCoordinates(routeResult.path.map(n => ({ lat: n.lat, lng: n.lng })))} />
          </>
        )}

        {/* Selection Markers - visually distinct start/end */}
        {startNode && (
          <Marker
            position={[startNode.lat, startNode.lng]}
            icon={L.divIcon({
              html: `<div style="width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 0 15px rgba(16,185,129,0.9);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:8px;">START</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
              className: "",
            })}
          >
            <Popup><b>DEPARTURE:</b> {startNode.name}</Popup>
          </Marker>
        )}

        {endNode && (
          <Marker
            position={[endNode.lat, endNode.lng]}
            icon={L.divIcon({
              html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 15px rgba(239,68,68,0.9);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:8px;">END</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
              className: "",
            })}
          >
            <Popup><b>DESTINATION:</b> {endNode.name}</Popup>
          </Marker>
        )}
      </MapContainer>

      <TransportLegend />
    </div>
  );
}
