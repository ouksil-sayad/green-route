import { useEffect, useRef, useCallback } from "react";
import { ALGIERS_NODES, GraphNode, RouteResult, nearestNode } from "../lib/algiersGraph";

declare global {
  interface Window {
    L: any;
  }
}

interface AlgiersMapProps {
  startNode?: GraphNode | null;
  endNode?: GraphNode | null;
  routeResult?: RouteResult | null;
  onNodeSelect?: (node: GraphNode, role: "start" | "end") => void;
  selectMode?: "start" | "end";
}

export default function AlgiersMap({
  startNode = null,
  endNode = null,
  routeResult = null,
  onNodeSelect = () => {},
  selectMode = "start",
}: AlgiersMapProps) {
  const [isReady, setIsReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ marker: any; node: GraphNode }[]>([]);
  const routeLayerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const lastClickRef = useRef<number>(0);

  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const algiersCenter: [number, number] = [36.75, 3.06];
    const map = L.map(mapContainerRef.current, {
      center: algiersCenter,
      zoom: 13,
      minZoom: 12,
      maxBounds: [
        [36.65, 2.90], // Southwest
        [36.85, 3.25]  // Northeast
      ],
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    mapRef.current = map;
    console.log("Map instance created");

    // Draw node markers
    const newMarkers: { marker: any; node: GraphNode }[] = [];
    ALGIERS_NODES.forEach(node => {
      const color = node.type === "hub" ? "#00d4c8" : node.type === "landmark" ? "#8b5cf6" : "#3b82f6";
      const circleMarker = L.circleMarker([node.lat, node.lng], {
        radius: node.type === "hub" ? 9 : 7,
        fillColor: color,
        color: "rgba(0,0,0,0.5)",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(map);

      circleMarker.bindTooltip(node.name, {
        permanent: false,
        direction: "top",
        className: "leaflet-tooltip-custom",
        offset: [0, -8],
      });

      newMarkers.push({ marker: circleMarker, node });
    });

    markersRef.current = newMarkers;
    setIsReady(true);
  }, []);

  useEffect(() => {
    const tryInit = () => {
      if (window.L) {
        initMap();
      } else {
        setTimeout(tryInit, 100);
      }
    };
    tryInit();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  // Attach handlers when ready or mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    
    console.log(`Setting up handlers for mode: ${selectMode}`);

    const onMapClick = (e: any) => {
      const now = Date.now();
      if (now - lastClickRef.current < 300) return;
      lastClickRef.current = now;

      const nearest = nearestNode(e.latlng.lat, e.latlng.lng);
      console.log(`[Map Click] ${nearest.name}`);
      onNodeSelect(nearest, selectMode);
    };

    map.off("click");
    map.on("click", onMapClick);
    
    markersRef.current.forEach(({ marker, node }) => {
      marker.off("click");
      marker.on("click", (e: any) => {
        window.L.DomEvent.stopPropagation(e);
        const now = Date.now();
        if (now - lastClickRef.current < 300) return;
        lastClickRef.current = now;
        
        console.log(`[Marker Click] ${node.name}`);
        onNodeSelect(node, selectMode);
      });
    });
  }, [isReady, selectMode, onNodeSelect]);

  // Auto-invalidate size when container changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      console.log("Map container resized, invalidating size...");
      map.invalidateSize();
    });

    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [isReady]);

  // Update start/end markers
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (startNode) {
      const icon = L.divIcon({
        html: `<div style="width:22px;height:22px;border-radius:50%;background:var(--neon);border:3px solid var(--background);box-shadow:0 0 15px rgba(0,212,200,0.9),0 0 30px rgba(0,212,200,0.5);display:flex;align-items:center;justify-content:center;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        className: "",
      });
      startMarkerRef.current = L.marker([startNode.lat, startNode.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>FROM:</b> ${startNode.name}`);
    }

    if (endMarkerRef.current) {
      map.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }
    if (endNode) {
      const icon = L.divIcon({
        html: `<div style="width:22px;height:22px;border-radius:50%;background:#8b5cf6;border:3px solid var(--background);box-shadow:0 0 15px rgba(139,92,246,0.9),0 0 30px rgba(139,92,246,0.5);display:flex;align-items:center;justify-content:center;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        className: "",
      });
      endMarkerRef.current = L.marker([endNode.lat, endNode.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>TO:</b> ${endNode.name}`);
    }
  }, [startNode, endNode]);

  // Draw route polyline
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routeResult && routeResult.path.length > 1) {
      const latlngs = routeResult.path.map(n => [n.lat, n.lng]);

      // Outer glow line
      L.polyline(latlngs, {
        color: "rgba(0,212,200,0.25)",
        weight: 14,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Main route line
      routeLayerRef.current = L.polyline(latlngs, {
        color: "var(--neon)",
        weight: 5,
        lineCap: "round",
        lineJoin: "round",
        dashArray: null,
      }).addTo(map);

      // Fit bounds
      map.fitBounds(routeLayerRef.current.getBounds(), { padding: [60, 60] });
    }
  }, [routeResult]);

  return (
    <div data-cmp="AlgiersMap" style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", borderRadius: "inherit" }} />
      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 1000,
          background: "var(--card)",
          opacity: 0.9,
          backdropFilter: "blur(12px)",
          transition: "background 0.3s ease",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          padding: "10px 14px",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "6px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Legend</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--neon)" }} />
            <span style={{ fontSize: "11px", color: "var(--foreground)" }}>Hub</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#8b5cf6" }} />
            <span style={{ fontSize: "11px", color: "var(--foreground)" }}>Landmark</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6" }} />
            <span style={{ fontSize: "11px", color: "var(--foreground)" }}>Transit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
