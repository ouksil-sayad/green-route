import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster, toast } from "sonner";
import Home from "./pages/Home";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.log("ErrorBoundary caught:", error);
    toast.error("Something went wrong, please refresh the page");
  }
  render() {
    return this.state.hasError ? (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px" }}>⚠️</div>
        <p style={{ color: "var(--foreground)", fontSize: "20px", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </p>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", margin: 0 }}>
          Please refresh the page to try again
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 24px",
            borderRadius: "0.75rem",
            background: "var(--neon)",
            border: "none",
            color: "var(--background)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          Refresh Page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

import { ThemeProvider } from "./components/theme-provider";

const App = () => (
  <BrowserRouter>
    <ThemeProvider defaultTheme="dark" storageKey="algier-route-theme">
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </ThemeProvider>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        },
      }}
    />
  </BrowserRouter>
);

export default App;
