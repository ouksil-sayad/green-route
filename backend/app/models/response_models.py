from dataclasses import dataclass
from typing import Optional


@dataclass
class RouteMetrics:
    total_time_mins: float
    total_co2_grams: float
    total_price_dzd: float


@dataclass
class RouteStep:
    node_id: int
    name: str
    lat: float
    lon: float
    mode: str
    instruction: str
    time: float
    price: float
    co2: float
    distance_km: float


@dataclass
class RouteSegment:
    from_node: str
    to_node: str
    mode: str
    distance_km: float
    is_transfer: bool


@dataclass
class PriceBreakdown:
    segments: list
    total: float
    subtotal: float
    tax: float


@dataclass
class RouteResponse:
    status: str
    metrics: Optional[RouteMetrics] = None
    route_steps: Optional[list] = None
    price_breakdown: Optional[PriceBreakdown] = None
    meta: Optional[dict] = None


def success_response(metrics, route_steps, price_breakdown, meta=None):
    return {
        "status": "success",
        "metrics": metrics,
        "route_steps": route_steps,
        "price_breakdown": price_breakdown,
        "meta": meta or {},
    }


def error_response(message):
    return {
        "status": "error",
        "message": message,
    }