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
    
    # Cache File Path
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    
    @property
    def CACHE_FILE(self) -> Path:
        # Check standard root/data path first
        candidate1 = self.DATA_DIR / "cache_jan2026.json"
        if candidate1.exists():
            return candidate1
        # Check relative to cwd
        candidate2 = Path("data/cache_jan2026.json").resolve()
        if candidate2.exists():
            return candidate2
        # Check relative to api directory (Vercel)
        candidate3 = Path(__file__).resolve().parents[2] / "data" / "cache_jan2026.json"
        if candidate3.exists():
            return candidate3
        return candidate1

settings = Settings()
