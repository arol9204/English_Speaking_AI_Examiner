"""Start DET Practice with one command: python run.py

Builds the web page the first time (needs Node.js), starts the server and opens your browser.
"""

import shutil
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
URL = "http://localhost:8000"


def build_frontend():
    npm = shutil.which("npm")
    if not npm:
        sys.exit("Node.js is needed to build the web page. Install it from https://nodejs.org")
    if not (FRONTEND / "node_modules").is_dir():
        subprocess.run([npm, "install"], cwd=FRONTEND, check=True)
    subprocess.run([npm, "run", "build"], cwd=FRONTEND, check=True)


def frontend_is_stale() -> bool:
    """True when the web page was never built or its source changed since the last build."""
    built = FRONTEND / "dist" / "index.html"
    if not built.exists():
        return True
    sources = [FRONTEND / "index.html", FRONTEND / "package.json", *(FRONTEND / "src").rglob("*")]
    return max(p.stat().st_mtime for p in sources if p.is_file()) > built.stat().st_mtime


def main():
    if "--build" in sys.argv or frontend_is_stale():
        build_frontend()
    sys.path.insert(0, str(ROOT / "backend"))
    import uvicorn

    threading.Timer(1.5, lambda: webbrowser.open(URL)).start()
    print(f"DET Practice is running at {URL} (press Ctrl+C to stop)")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="warning")


if __name__ == "__main__":
    main()
