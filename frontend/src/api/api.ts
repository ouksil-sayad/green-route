const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface ApiRouteRequest {
  start: string | number;
  end: string | number;
  weights: {
    time: number;
    money: number;
    co2: number;
  };
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
    const response = await fetch(`${API_BASE_URL}/api/nodes`);
    const data = await response.json();
    if (data.status === "ok") {
      return data.nodes;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch nodes:", error);
    return [];
  }
};
