from typing import Optional
from pathlib import Path
import os

class Settings:
    PROJECT_NAME: str = "AEOLUS - UK Wind Forecast & Accuracy Analytics"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Elexon BMRS API Endpoints
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    FUELHH_ENDPOINT: str = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
    WINDFOR_ENDPOINT: str = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
    
    # Defaults
    DEFAULT_CUTOFF_TIME: str = "12:00"  # UK Local Time on D-1
    DEFAULT_START_DATE: str = "2026-01-01"
    DEFAULT_END_DATE: str = "2026-01-07"
    
    # Base directory paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    @property
    def CACHE_FILE(self) -> Path:
        """Resolve the pre-fetched cache file across local, container, and Vercel environments."""
        this_file = Path(__file__).resolve()
        candidates = [
            # backend/app/data/cache_jan2026.json
            this_file.parent.parent / "data" / "cache_jan2026.json",
            # backend/data/cache_jan2026.json
            this_file.parent.parent.parent / "data" / "cache_jan2026.json",
            # repo_root/data/cache_jan2026.json
            this_file.parent.parent.parent.parent / "data" / "cache_jan2026.json",
            # CWD relative paths
            Path.cwd() / "data" / "cache_jan2026.json",
            Path.cwd() / "backend" / "data" / "cache_jan2026.json",
            Path.cwd() / "app" / "data" / "cache_jan2026.json",
            # Vercel serverless Lambda root paths
            Path("/var/task/app/data/cache_jan2026.json"),
            Path("/var/task/backend/data/cache_jan2026.json"),
            Path("/var/task/data/cache_jan2026.json"),
            # Writable temp fallback
            Path("/tmp/cache_jan2026.json"),
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        # Default to first candidate
        return candidates[0]

settings = Settings()
