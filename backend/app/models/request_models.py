from dataclasses import dataclass
from typing import Optional


@dataclass
class RouteRequest:
    start: int
    end: int
    weights: dict


@dataclass
class Weights:
    time: float = 0.33
    price: float = 0.33
    co2: float = 0.34


def validate_route_request(data: dict) -> tuple[Optional[str], bool]:
    if not isinstance(data, dict):
        return "Request must be JSON object", False

    if "start" not in data or "end" not in data:
        return "Fields 'start' and 'end' are required", False

    try:
        start = int(data["start"])
        end = int(data["end"])
    except (ValueError, TypeError):
        return "Fields 'start' and 'end' must be integers", False

    if start < 0 or end < 0:
        return "Node IDs must be non-negative", False

    return None, True