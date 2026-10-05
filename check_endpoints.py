import requests

API_BASE = "http://localhost:8000"

endpoints = [
    ("/api/phase4/geo-optimization?state=FL", "Geo Spatial Grid"),
    ("/api/market-intelligence/opportunity-scoring/rankings", "Opportunity Scoring Rankings"),
    ("/api/market-intelligence/opportunity-scoring/config", "Opportunity Scoring Config"),
    ("/api/market-intelligence/partnerships", "Dispensary Partnerships"),
    ("/api/market-intelligence/physicians/coverage", "Physician Coverage"),
    ("/api/market-intelligence/seo/rankings", "SEO Intelligence"),
    ("/api/market-intelligence/reviews/intelligence", "Review Intelligence"),
    ("/api/market-intelligence/regulatory/requirements", "Regulatory Requirements"),
    ("/api/market-intelligence/regulatory/changes", "Regulatory Changes"),
    ("/api/market-intelligence/events", "Intelligence Events"),
    ("/api/market-intelligence/relationships", "Entity Relationships"),
    ("/api/market-intelligence/data-quality", "Verification & Data Quality"),
    ("/api/jobs", "Executions & Jobs"),
]

print("=== Testing 12 Market Intelligence Endpoints ===")
for path, name in endpoints:
    url = f"{API_BASE}{path}"
    try:
        res = requests.get(url, timeout=10)
        status = res.status_code
        data = res.json()
        keys = list(data.keys()) if isinstance(data, dict) else f"list({len(data)})"
        print(f"[STATUS {status}] {name} ({path}) -> {keys}")
    except Exception as e:
        print(f"[FAIL] {name} ({path}) -> {e}")
