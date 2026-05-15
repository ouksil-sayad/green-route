import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
NODES_CSV = os.path.join(DATA_DIR, "nodes.csv")
EDGES_CSV = os.path.join(DATA_DIR, "edges.csv")

MODE_FREQUENCIES = {
    "bus": 20.0,
    "tram": 15.0,
    "train": 60.0,
    "metro": 10.0,
}


MODE_PREFIXES = {
    "bus": 100000,
    "tram": 200000,
    "train": 300000,
    "metro": 300000,
}

MODE_SPEEDS_KMH = {
    "walk": 5.0,
    "bus": 20.0,
    "tram": 25.0,
    "train": 40.0,
    "metro": 40.0,
}

# CO2 intensity per km in grams.
CO2_GRAMS_PER_KM = {
    "walk": 0.000,
    "bus": 89.0,
    "tram": 35.0,
    "train": 20.0,
    "metro": 20.0,
}

DEFAULT_WEIGHTS = {
    "time": 0.33,
    "price": 0.33,
    "co2": 0.34,
}

MAX_SPEED_KMH = 40.0

# Normalization factors to bring different metrics (time, price, co2) to a comparable scale.
# These represent the value of one "utility unit" in raw units.
# 1 utility unit = 1 minute = 10 DZD = 20 g CO2
NORM_TIME = 1.0
NORM_PRICE = 10.0
NORM_CO2 = 20.0

API_HOST = "0.0.0.0"
API_PORT = 5000