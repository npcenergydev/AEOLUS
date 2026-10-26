import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from app.core.config import settings
    from app.api.routes import router as api_router
    from app.services.elexon_client import elexon_client
except ImportError:
    from backend.app.core.config import settings
    from backend.app.api.routes import router as api_router
    from backend.app.services.elexon_client import elexon_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aeolus")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly initialize cache on startup
    logger.info("Starting AEOLUS backend service...")
    try:
        elexon_client.initialize()
        logger.info("Elexon data cache ready.")
    except Exception as e:
        logger.error(f"Error during Elexon client startup: {e}")
    yield
    logger.info("Shutting down AEOLUS backend service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="UK Day-Ahead Wind Forecast & Quantitative Accuracy Platform for Power Traders",
    lifespan=lifespan
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix="/api")

# API root info endpoint
@app.get("/api")
def api_info():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "endpoints": {
            "health": "/api/health",
            "dates": "/api/dates",
            "actuals": "/api/actuals",
            "forecast": "/api/forecast",
            "metrics": "/api/metrics",
            "horizons": "/api/horizons",
        }
    }

# Mount built frontend static files if available (for Docker / unified deployment)
dist_dir = settings.BASE_DIR / "frontend" / "dist"
if dist_dir.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "docs": "/docs",
            "api": "/api"
        }
