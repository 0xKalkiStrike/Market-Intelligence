"""
Intelligence Module Extensibility Framework (Phase 6).
Provides a declarative registry for adding and managing intelligence modules:
Each module declares:
- module_name, version, purpose
- input_data, output_data, permissions
- dependencies, background_jobs, api_routes
- health_status probe
"""
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class ModuleManifest:
    module_name: str
    display_name: str
    version: str
    purpose: str
    input_data: List[str]
    output_data: List[str]
    required_permissions: List[str]
    dependencies: List[str] = field(default_factory=list)
    api_routes: List[str] = field(default_factory=list)
    background_jobs: List[str] = field(default_factory=list)
    is_active: bool = True
    health_check_fn: Optional[Callable[[], bool]] = None


class ModuleRegistryService:
    """Central registry declaring and orchestrating modular intelligence extensions."""

    def __init__(self):
        self._modules: Dict[str, ModuleManifest] = {}
        self._register_default_modules()

    def _register_default_modules(self):
        defaults = [
            ModuleManifest(
                module_name="competitor_movement_engine",
                display_name="Competitor Intelligence & Movement Engine",
                version="2.1.0",
                purpose="Monitors competitor pricing, physical locations, rating shifts, and strategic positioning.",
                input_data=["Surface Web Scrapes", "Public Directory Feeds", "Price Snapshots"],
                output_data=["Competitor Details", "Movement Scores", "Price Change Alerts"],
                required_permissions=["intelligence:read"],
                api_routes=["/api/v1/governed/competitors", "/api/v1/governed/competitor-pricing"],
                dependencies=["Central DB", "Circuit Breakers"],
            ),
            ModuleManifest(
                module_name="geo_optimization_engine",
                display_name="Geographic & Clinic Capacity Optimization",
                version="1.8.0",
                purpose="Analyzes centroid clusters, physician travel buffers, and underserved market zip codes.",
                input_data=["OpenStreetMap Overpass", "Entity Locations", "Doctor Details"],
                output_data=["Geographic Clusters", "Opportunity Zones", "Cannibalization Risks"],
                required_permissions=["intelligence:read"],
                api_routes=["/api/v1/governed/geographic-analytics"],
                dependencies=["Spatial Engine", "NPI Registry"],
            ),
            ModuleManifest(
                module_name="regulatory_bulletin_monitor",
                display_name="Regulatory & Compliance Intelligence",
                version="1.4.0",
                purpose="Monitors state medical board and Department of Health announcements and rule changes.",
                input_data=["State DOH Portals", "Public Legislative Feeds"],
                output_data=["Regulatory Changes", "Compliance Warnings", "Policy Bulletins"],
                required_permissions=["regulatory:review"],
                api_routes=["/api/v1/governed/regulatory-intelligence"],
                dependencies=["State DOH Portals Connector"],
            ),
            ModuleManifest(
                module_name="dispensary_crm_pipeline",
                display_name="Dispensary Partnership & Lead Pipeline",
                version="2.0.0",
                purpose="Manages dispensary partnership outreach, referral agreements, and pipeline stages.",
                input_data=["Dispensary Details", "Contact Scrapes", "Internal Sync Feeds"],
                output_data=["Partnership Opportunities", "Conversion Rates"],
                required_permissions=["partnerships:manage"],
                api_routes=["/api/v1/governed/partnerships", "/api/v1/governed/dispensaries"],
                dependencies=["CRM Data Store"],
            ),
            ModuleManifest(
                module_name="forecasting_scenario_simulator",
                display_name="Market Forecasting & Scenario Engine",
                version="1.9.0",
                purpose="Projects patient volume growth and simulates competitor price reduction impacts.",
                input_data=["Historical State Metrics", "Price Trends", "Demographic Growth Data"],
                output_data=["90-Day Volume Forecasts", "Monte Carlo Simulations"],
                required_permissions=["intelligence:read"],
                api_routes=["/api/v1/governed/forecasts-scenarios"],
                dependencies=["Forecasting Model Store"],
            ),
            ModuleManifest(
                module_name="internal_ehr_bridge",
                display_name="MMJ-DOCS Internal Operations Bridge",
                version="1.0.0",
                purpose="Secure bridge ingesting operational appointment aggregates and utilization without PHI.",
                input_data=["Internal MMJ-DOCS Operations System"],
                output_data=["State Market Aggregates", "Capacity Benchmarks"],
                required_permissions=["internal_metrics:read"],
                api_routes=["/api/v1/governed/integration-status"],
                dependencies=["InternalMmjDocsAdapter"],
            ),
            ModuleManifest(
                module_name="advanced_research_optimization_engine",
                display_name="Advanced Intelligence Research & Optimization Engine",
                version="3.0.0",
                purpose="Orchestrates hypothesis-driven market research, statistical validation, geographic opportunity v2, and evidence-grounded AI decision support.",
                input_data=["State Market Aggregates", "Entity Locations", "Historical Price Records", "Regulatory Bulletins"],
                output_data=["Research Dossiers", "Validated Findings", "Competitive Patterns", "Probabilistic Scenarios", "Audited Citations"],
                required_permissions=["intelligence:read"],
                api_routes=[
                    "/api/v1/governed/research/projects",
                    "/api/v1/governed/research/statistical-analysis",
                    "/api/v1/governed/research/competitive-patterns",
                    "/api/v1/governed/research/geo-opportunity",
                    "/api/v1/governed/research/scenarios/compare",
                    "/api/v1/governed/research/pricing-analysis",
                    "/api/v1/governed/research/ai-assistant",
                ],
                dependencies=["Central DB", "Statistical Engine", "Evidence Store"],
            ),
            ModuleManifest(
                module_name="continuous_improvement_quality_engine",
                display_name="Continuous Improvement & Intelligence Quality Engine",
                version="4.0.0",
                purpose="Monitors data completeness, freshness, source reliability, AI regression evaluation, empirical forecast calibration, and Population Stability Index (PSI) drift.",
                input_data=["Quality Snapshots", "Collection Runs", "Forecast Outcomes", "AI Benchmarks", "Feedback Items"],
                output_data=["Quality Health Index", "AI Regression Scores", "Empirical MAE/RMSE", "PSI Drift Alerts", "Remediation Audit Trail"],
                required_permissions=["intelligence:read", "admin:access"],
                api_routes=[
                    "/api/v1/governed/quality/health",
                    "/api/v1/governed/quality/ai-regression",
                    "/api/v1/governed/quality/forecast-outcomes",
                    "/api/v1/governed/quality/drift-monitors",
                    "/api/v1/governed/quality/feedback",
                    "/api/v1/governed/quality/cost-governance",
                ],
                dependencies=["Quality Store", "AI Benchmark Suite", "Telemetry Store"],
            ),
        ]
        for m in defaults:
            self._modules[m.module_name] = m

    def register_module(self, manifest: ModuleManifest):
        self._modules[manifest.module_name] = manifest

    def list_modules(self) -> List[Dict[str, Any]]:
        results = []
        for name, m in self._modules.items():
            health = "HEALTHY"
            if m.health_check_fn:
                try:
                    health = "HEALTHY" if m.health_check_fn() else "DEGRADED"
                except Exception:
                    health = "UNAVAILABLE"

            results.append({
                "module_name": m.module_name,
                "display_name": m.display_name,
                "version": m.version,
                "purpose": m.purpose,
                "input_data": m.input_data,
                "output_data": m.output_data,
                "required_permissions": m.required_permissions,
                "dependencies": m.dependencies,
                "api_routes": m.api_routes,
                "is_active": m.is_active,
                "health_status": health,
            })
        return results
