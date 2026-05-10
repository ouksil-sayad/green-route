import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in meters.
    """
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2.0) ** 2
    return 2.0 * r * math.asin(math.sqrt(a))


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in kilometers."""
    return haversine_distance(lat1, lon1, lat2, lon2) / 1000.0


def get_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the bearing (direction) from point 1 to point 2.
    Returns bearing in degrees (0-360).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    
    x = math.sin(dl) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dl)
    
    theta = math.atan2(x, y)
    return (math.degrees(theta) + 360) % 360


def estimate_travel_time(distance_km: float, speed_kmh: float) -> float:
    """
    Estimate travel time in minutes given distance in km and speed in km/h.
    """
    if speed_kmh <= 0:
        return 0.0
    return (distance_km / speed_kmh) * 60.0


def estimate_co2_emissions(distance_km: float, mode: str) -> float:
    """
    Estimate CO2 emissions in grams given distance in km and transport mode.
    """
    co2_per_km = {
        "walk": 0.0,
        "bus": 89.0,
        "tram": 35.0,
        "train": 20.0,
        "metro": 20.0,
    }
    return distance_km * co2_per_km.get(mode.lower(), 89.0)


def get_midpoint(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple:
    """
    Calculate the midpoint between two coordinates.
    Returns (lat, lon).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    lon1_rad = math.radians(lon1)
    dl = math.radians(lon2 - lon1)
    
    bx = math.cos(phi2) * math.cos(dl)
    by = math.cos(phi2) * math.sin(dl)
    
    phi3 = math.atan2(
        math.sin(phi1) + math.sin(phi2),
        math.sqrt((math.cos(phi1) + bx) ** 2 + by ** 2)
    )
    lon3 = lon1_rad + math.atan2(by, math.cos(phi1) + bx)
    
    return (math.degrees(phi3), math.degrees(lon3))


__all__ = [
    "haversine_distance",
    "haversine_distance_km",
    "get_bearing",
    "estimate_travel_time",
    "estimate_co2_emissions",
    "get_midpoint",
]