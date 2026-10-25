import sys
import types
from pathlib import Path

# Add backend directory and parent directory to sys.path
backend_dir = Path(__file__).resolve().parent
repo_root = backend_dir.parent

for p in [str(backend_dir), str(repo_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Alias 'backend' to backend_dir if not present so 'from backend.app...' imports always resolve
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(backend_dir)]
    sys.modules["backend"] = backend_pkg

# Import FastAPI app instance
try:
    from app.main import app
except ImportError:
    from backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
