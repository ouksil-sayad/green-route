import { useNavigate } from "react-router-dom";
import logoImg from "../../assests/logo.png";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#F4F6F4",
        color: "#1a2e24",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Global Landing Animations */}
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-in-up-1 { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; }
          .fade-in-up-2 { animation: fadeInUp 0.8s ease-out 0.2s forwards; opacity: 0; }
          .fade-in-up-3 { animation: fadeInUp 0.8s ease-out 0.4s forwards; opacity: 0; }
          .fade-in-up-4 { animation: fadeInUp 0.8s ease-out 0.6s forwards; opacity: 0; }
          .fade-in-up-5 { animation: fadeInUp 0.8s ease-out 0.8s forwards; opacity: 0; }
        `}
      </style>

      {/* Background Map Image on the Right */}
      <div
        style={{
          position: "absolute",
          top: "-10vh",
          right: "-5%",
          width: "60%",
          height: "120vh",
          transform: "scale(0.85)",
          transformOrigin: "right center",
          backgroundImage: 'url(/algiers_light_map_glow.png)',
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          opacity: 0.9,
          zIndex: 0,
          maskImage: "radial-gradient(ellipse at 70% 50%, black 35%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(ellipse at 70% 50%, black 35%, transparent 65%)",
        }}
      >
        {/* Animated Traffic & Nodes Overlay */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            opacity: 0.65,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>
              {`
                .node {
                  fill: #114931;
                  transform-origin: center;
                  filter: drop-shadow(0 0 4px rgba(17, 73, 49, 0.5));
                }
                .node-anim-1 { animation: nodeFlicker 3.2s infinite ease-in-out; }
                .node-anim-2 { animation: nodeFlicker 4.5s infinite ease-in-out 0.7s; }
                .node-anim-3 { animation: nodeFlicker 2.8s infinite ease-in-out 1.4s; }
                .node-anim-4 { animation: nodeFlicker 3.8s infinite ease-in-out 2.2s; }
                .node-anim-5 { animation: nodeFlicker 5.1s infinite ease-in-out 0.3s; }
                .route-highlight {
                  stroke-dasharray: 12 88;
                  filter: drop-shadow(0 0 5px rgba(17,73,49,0.6));
                  opacity: 0.9;
                }
                .anim-flow-1 { animation: pathFlow1 4.5s linear infinite; }
                .anim-flow-2 { animation: pathFlow2 5.8s linear infinite 1s; }
                .anim-flow-3 { animation: pathFlow1 3.8s linear infinite 0.5s; }
                .anim-flow-4 { animation: pathFlow2 5s linear infinite 2s; }
                .anim-flow-5 { animation: pathFlow1 6.5s linear infinite 1.5s; }
                .anim-flow-6 { animation: pathFlow2 4.2s linear infinite 0.8s; }
                @keyframes pathFlow1 {
                  0% { stroke-dashoffset: 100; }
                  100% { stroke-dashoffset: 0; }
                }
                @keyframes pathFlow2 {
                  0% { stroke-dashoffset: -100; }
                  100% { stroke-dashoffset: 0; }
                }
                @keyframes nodeFlicker {
                  0% { r: 4px; opacity: 0.6; stroke-width: 0; stroke: rgba(17, 73, 49, 0); }
                  20% { r: 6px; opacity: 1; stroke-width: 14px; stroke: rgba(17, 73, 49, 0.3); }
                  23% { r: 5px; opacity: 0.8; stroke-width: 8px; stroke: rgba(17, 73, 49, 0.15); }
                  26% { r: 7px; opacity: 1; stroke-width: 18px; stroke: rgba(17, 73, 49, 0.4); }
                  60% { r: 5px; opacity: 0.85; stroke-width: 6px; stroke: rgba(17, 73, 49, 0.2); }
                  100% { r: 4px; opacity: 0.6; stroke-width: 0; stroke: rgba(17, 73, 49, 0); }
                }
              `}
            </style>

            <path id="r1" pathLength="100" d="M 10% 25% Q 35% 35% 55% 50% T 95% 75%" />
            <path id="r2" pathLength="100" d="M 25% 85% Q 45% 65% 65% 45% T 85% 25%" />
            <path id="r3" pathLength="100" d="M 45% 15% L 50% 55% L 75% 95%" />
            <path id="r4" pathLength="100" d="M 15% 55% Q 55% 25% 90% 55%" />
            <path id="r5" pathLength="100" d="M 20% 40% Q 50% 55% 85% 70%" />
            <path id="r6" pathLength="100" d="M 35% 35% L 55% 50% L 65% 45%" />
          </defs>

          {/* Base lines */}
          <use href="#r1" fill="none" stroke="#114931" strokeWidth="1" strokeOpacity="0.15" />
          <use href="#r2" fill="none" stroke="#114931" strokeWidth="1" strokeOpacity="0.15" />
          <use href="#r3" fill="none" stroke="#114931" strokeWidth="1" strokeOpacity="0.15" />
          <use href="#r4" fill="none" stroke="#114931" strokeWidth="1" strokeOpacity="0.15" />
          <use href="#r5" fill="none" stroke="#114931" strokeWidth="1" strokeOpacity="0.15" />
          <use href="#r6" fill="none" stroke="#114931" strokeWidth="1" strokeOpacity="0.15" />

          {/* Highlight Routes */}
          <use href="#r1" fill="none" stroke="#1a6b47" strokeWidth="2.5" strokeLinecap="round" className="route-highlight anim-flow-1" />
          <use href="#r2" fill="none" stroke="#1a6b47" strokeWidth="2.5" strokeLinecap="round" className="route-highlight anim-flow-2" />
          <use href="#r3" fill="none" stroke="#1a6b47" strokeWidth="2.5" strokeLinecap="round" className="route-highlight anim-flow-3" />
          <use href="#r4" fill="none" stroke="#1a6b47" strokeWidth="2.5" strokeLinecap="round" className="route-highlight anim-flow-4" />
          <use href="#r5" fill="none" stroke="#1a6b47" strokeWidth="2.5" strokeLinecap="round" className="route-highlight anim-flow-5" />
          <use href="#r6" fill="none" stroke="#1a6b47" strokeWidth="2.5" strokeLinecap="round" className="route-highlight anim-flow-6" />

          {/* Moving Dots */}
          <g fill="#ffffff" filter="drop-shadow(0 0 6px #114931)">
            <circle r="3"><animateMotion dur="4.5s" repeatCount="indefinite"><mpath href="#r1" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4.5s" repeatCount="indefinite" /></circle>
            <circle r="2.5"><animateMotion dur="5.8s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#r2" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5.8s" repeatCount="indefinite" /></circle>
            <circle r="3.5"><animateMotion dur="3.8s" repeatCount="indefinite"><mpath href="#r3" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="3.8s" repeatCount="indefinite" /></circle>
            <circle r="2"><animateMotion dur="5s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#r4" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5s" repeatCount="indefinite" /></circle>
            <circle r="3"><animateMotion dur="6.5s" repeatCount="indefinite"><mpath href="#r5" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="6.5s" repeatCount="indefinite" /></circle>
            <circle r="2.5"><animateMotion dur="4.2s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#r6" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4.2s" repeatCount="indefinite" /></circle>
            <circle r="2.5"><animateMotion dur="7s" repeatCount="indefinite"><mpath href="#r1" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="7s" repeatCount="indefinite" /></circle>
            <circle r="2"><animateMotion dur="6s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#r3" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="6s" repeatCount="indefinite" /></circle>
            <circle r="2"><animateMotion dur="4.8s" repeatCount="indefinite"><mpath href="#r2" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4.8s" repeatCount="indefinite" /></circle>
            <circle r="2.5"><animateMotion dur="5.5s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#r5" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="5.5s" repeatCount="indefinite" /></circle>
            <circle r="3"><animateMotion dur="7.5s" repeatCount="indefinite"><mpath href="#r6" /></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="7.5s" repeatCount="indefinite" /></circle>
          </g>

          {/* Pulsing Nodes */}
          <circle cx="20%" cy="40%" className="node node-anim-1" />
          <circle cx="35%" cy="35%" className="node node-anim-2" />
          <circle cx="55%" cy="50%" className="node node-anim-3" />
          <circle cx="45%" cy="65%" className="node node-anim-4" />
          <circle cx="65%" cy="45%" className="node node-anim-5" />
          <circle cx="50%" cy="55%" className="node node-anim-1" />
          <circle cx="85%" cy="25%" className="node node-anim-2" />
          <circle cx="75%" cy="95%" className="node node-anim-3" />
          <circle cx="25%" cy="85%" className="node node-anim-4" />
          <circle cx="45%" cy="15%" className="node node-anim-5" />
          <circle cx="15%" cy="55%" className="node node-anim-1" />
          <circle cx="90%" cy="55%" className="node node-anim-2" />
          <circle cx="60%" cy="20%" className="node node-anim-3" />
          <circle cx="75%" cy="60%" className="node node-anim-4" />
          <circle cx="30%" cy="75%" className="node node-anim-5" />
          <circle cx="85%" cy="70%" className="node node-anim-1" />
          <circle cx="10%" cy="25%" className="node node-anim-2" />
          <circle cx="40%" cy="85%" className="node node-anim-3" />
          <circle cx="5%" cy="35%" className="node node-anim-4" />
          <circle cx="15%" cy="70%" className="node node-anim-5" />
          <circle cx="25%" cy="20%" className="node node-anim-1" />
          <circle cx="30%" cy="50%" className="node node-anim-2" />
          <circle cx="35%" cy="85%" className="node node-anim-3" />
          <circle cx="40%" cy="25%" className="node node-anim-4" />
          <circle cx="50%" cy="10%" className="node node-anim-5" />
          <circle cx="55%" cy="80%" className="node node-anim-1" />
          <circle cx="60%" cy="65%" className="node node-anim-2" />
          <circle cx="70%" cy="15%" className="node node-anim-3" />
          <circle cx="70%" cy="40%" className="node node-anim-4" />
          <circle cx="80%" cy="80%" className="node node-anim-5" />
          <circle cx="85%" cy="45%" className="node node-anim-1" />
          <circle cx="95%" cy="30%" className="node node-anim-2" />
          <circle cx="95%" cy="80%" className="node node-anim-3" />
          <circle cx="12%" cy="90%" className="node node-anim-4" />
          <circle cx="68%" cy="25%" className="node node-anim-5" />
          <circle cx="78%" cy="50%" className="node node-anim-1" />
          <circle cx="88%" cy="15%" className="node node-anim-2" />
          <circle cx="48%" cy="30%" className="node node-anim-3" />
        </svg>
      </div>

      {/* Map Label Overlay */}
      <div
        className="fade-in-up-5"
        style={{
          position: "absolute",
          bottom: "40px",
          right: "50px",
          textAlign: "right",
          zIndex: 20,
          pointerEvents: "none",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: 400, color: "#6b8a7a", letterSpacing: "4px" }}>
          ALGIERS, ALGERIA
        </div>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "#8cc4a8", letterSpacing: "2px", marginTop: "6px" }}>
          CITY MAP DATA VISUALIZATION
        </div>
      </div>

        <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "0 40px",
        }}
      >
        {/* Header */}
        <header
          style={{
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
             <img src={logoImg} alt="Logo" style={{ height: "40px", width: "auto" }} />
             <span style={{ fontWeight: 700, letterSpacing: "1px", color: "#114931" }}>AlgierRoute</span>
          </div>
        </header>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: "500px",
            paddingBottom: "10vh",
            position: "relative",
          }}
        >
          {/* Faded Background Text */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "-10px",
              fontSize: "120px",
              fontWeight: 800,
              color: "rgba(17, 73, 49, 0.04)",
              zIndex: -1,
              letterSpacing: "4px",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Green
          </div>

          <h2 className="fade-in-up-1" style={{ fontSize: "14px", color: "#5a7568", fontWeight: 500, letterSpacing: "2px", marginBottom: "16px", textTransform: "uppercase" }}>
            Smart Map Navigation
          </h2>
          
          <h1
            className="fade-in-up-2"
            style={{
              fontSize: "clamp(48px, 8vw, 72px)",
              fontWeight: 700,
              color: "#1a2e24",
              lineHeight: 1.1,
              marginBottom: "24px",
              letterSpacing: "-1px",
            }}
          >
            Algiers <br />Route
          </h1>

          <div className="fade-in-up-3" style={{ width: "40px", height: "3px", backgroundColor: "#114931", marginBottom: "32px" }} />

          <p
            className="fade-in-up-3"
            style={{
              fontSize: "16px",
              color: "#5a7568",
              lineHeight: 1.8,
              marginBottom: "48px",
              maxWidth: "420px",
            }}
          >
            AI-powered route optimization for buses, trains, and trams across Algiers. Find faster journeys, reduce delays, and travel smarter.
          </p>

          <button
            className="fade-in-up-4"
            onClick={() => navigate("/user")}
            style={{
              padding: "18px 40px",
              backgroundColor: "#114931",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              cursor: "pointer",
              width: "fit-content",
              boxShadow: "0 4px 14px rgba(17, 73, 49, 0.15)",
              transition: "transform 0.2s, background-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0d3a26";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(17, 73, 49, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#114931";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(17, 73, 49, 0.15)";
            }}
          >
            GET STARTED
          </button>
        </main>
      </div>
    </div>
  );
}
