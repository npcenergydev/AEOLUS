import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "AEOLUS" in resp.text

def test_api_info():
    resp = client.get("/api")
    assert resp.status_code == 200
    assert "AEOLUS" in resp.json()["app"]

def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["actuals_count"] > 0
    assert data["forecasts_count"] > 0

def test_dates():
    resp = client.get("/api/dates")
    assert resp.status_code == 200
    data = resp.json()
    assert data["min_date"] == "2026-01-01"
    assert data["max_date"] == "2026-01-31"
    assert data["settlement_periods_per_day"] == 48

def test_get_actuals():
    resp = client.get("/api/actuals?start_date=2026-01-01&end_date=2026-01-01&resolution=30min")
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) == 48
    assert points[0]["fuelType"] == "WIND"
    assert "generation" in points[0]

def test_get_actuals_hourly():
    resp = client.get("/api/actuals?start_date=2026-01-01&end_date=2026-01-01&resolution=60min")
    assert resp.status_code == 200
    points = resp.json()
    assert len(points) == 24

def test_get_forecast():
    resp = client.get("/api/forecast?start_date=2026-01-01&end_date=2026-01-02&cutoff_time=12:00&resolution=30min")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_points"] == 96
    assert data["matched_points"] > 0
    p = data["points"][0]
    assert "actual_mw" in p
    assert "forecast_mw" in p
    assert "p10_uncertainty_mw" in p
    assert "p90_uncertainty_mw" in p

def test_get_metrics():
    resp = client.get("/api/metrics?start_date=2026-01-01&end_date=2026-01-03&cutoff_time=12:00&resolution=30min")
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall"]["count"] == 144
    assert data["overall"]["mae"] > 0
    assert data["overall"]["rmse"] >= data["overall"]["mae"]
    assert len(data["hourly_breakdown"]) == 24
    assert len(data["error_histogram"]) > 0

def test_get_horizons():
    resp = client.get("/api/horizons?target_date=2026-01-02&target_hour=14")
    assert resp.status_code == 200
    horizons = resp.json()
    assert isinstance(horizons, list)
    if horizons:
        assert "leadTimeHours" in horizons[0]
        assert "forecast_mw" in horizons[0]

def test_invalid_resolution_validation():
    resp = client.get("/api/forecast?resolution=invalid")
    assert resp.status_code == 422
