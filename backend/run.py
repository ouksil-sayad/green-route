import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEPS_DIR = os.path.join(BASE_DIR, ".deps")

sys.path.insert(0, BASE_DIR)
if os.path.isdir(DEPS_DIR):
    sys.path.insert(0, DEPS_DIR)

from app.main import app

if __name__ == "__main__":
    print("Starting server on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)