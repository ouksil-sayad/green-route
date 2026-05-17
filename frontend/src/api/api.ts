const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://the-green-multi-modal-public-transit.onrender.com";
export interface ApiRouteRequest {
  start: string | number;
  end: string | number;
  weights: {
    time: number;
    money: number;
    co2: number;
  };
  algorithm?: string;
  heuristic?: string;
}

export interface ApiRouteResponse {
  success: boolean;
  error?: string;
  route?: {
    path: any[];
    coordinates: [number, number][];
    segments: any[];
    totals: {
      time: number;
      money: number;
      co2: number;
    };
  };
  performance?: {
    algorithm: string;
    execution_time_ms: number;
    expanded_nodes: number;
  };
}

export const fetchRoute = async (data: ApiRouteRequest): Promise<ApiRouteResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

export const fetchNodes = async () => {
  try {
    console.log("Fetching nodes from", `${API_BASE_URL}/api/nodes`);
    const response = await fetch(`${API_BASE_URL}/api/nodes`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Loaded nodes count", data.nodes?.length);
    return data.nodes || [];
  } catch (error) {
    console.error("Failed to fetch nodes from /api/nodes:", error);
    throw error; // Rethrow to handle in the component
  }
};

