import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func

from app.database.models import AiCostLog, AiProviderConfig

class AiCostManagementService:
    def __init__(self, db: Session):
        self.db = db

    def route_ai_model(self, task_type: str) -> Dict[str, Any]:
        """
        Model router for optimizing AI cost vs reasoning performance:
        - Lightweight: Classification, tag extraction
        - Medium: Structured summarization, alert explanation
        - Advanced: Multi-source strategic market reasoning, scenario analysis
        """
        task_type_upper = task_type.upper()
        if task_type_upper in ["CLASSIFICATION", "TAGGING", "SIMPLE_INTENT"]:
            return {
                "model_name": "gpt-4o-mini",
                "tier": "LIGHTWEIGHT",
                "cost_input_1k": 0.00015,
                "cost_output_1k": 0.00060,
                "reason": "Lightweight model selected for low-latency classification task"
            }
        elif task_type_upper in ["SUMMARIZATION", "ALERT_EXPLANATION", "REPORT_OUTLINE"]:
            return {
                "model_name": "gpt-4o-mini",
                "tier": "MEDIUM",
                "cost_input_1k": 0.00015,
                "cost_output_1k": 0.00060,
                "reason": "Medium model selected for structured summarization"
            }
        else:
            return {
                "model_name": "gpt-4o",
                "tier": "ADVANCED",
                "cost_input_1k": 0.00500,
                "cost_output_1k": 0.01500,
                "reason": "Advanced model selected for complex strategic reasoning & evidence synthesis"
            }

    def log_ai_cost(
        self,
        provider_name: str,
        model_name: str,
        feature_name: str,
        input_tokens: int,
        output_tokens: int,
        user_email: str = "system"
    ) -> Dict[str, Any]:
        cost_input_1k = 0.005 if "gpt-4o" in model_name and "mini" not in model_name else 0.00015
        cost_output_1k = 0.015 if "gpt-4o" in model_name and "mini" not in model_name else 0.0006

        cost = ((input_tokens / 1000.0) * cost_input_1k) + ((output_tokens / 1000.0) * cost_output_1k)

        log = AiCostLog(
            provider_name=provider_name,
            model_name=model_name,
            feature_name=feature_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            calculated_cost_usd=round(cost, 6),
            user_email=user_email
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)

        return {"status": "logged", "cost_usd": log.calculated_cost_usd, "log_id": log.id}

    def get_cost_dashboard(self) -> Dict[str, Any]:
        logs = self.db.scalars(select(AiCostLog).order_by(desc(AiCostLog.created_at)).limit(100)).all()
        if not logs:
            # Seed initial sample log metrics if empty
            sample_logs = [
                ("OpenAI", "gpt-4o-mini", "Alert Classification", 450, 120, 0.000139, "admin@mmjdocs.com"),
                ("OpenAI", "gpt-4o", "Market Forecast Synthesis", 3200, 850, 0.028750, "analyst@mmjdocs.com"),
                ("OpenAI", "gpt-4o-mini", "Dispensary Enrichment", 890, 310, 0.000320, "system"),
            ]
            for prov, mdl, feat, in_t, out_t, cst, usr in sample_logs:
                item = AiCostLog(
                    provider_name=prov,
                    model_name=mdl,
                    feature_name=feat,
                    input_tokens=in_t,
                    output_tokens=out_t,
                    calculated_cost_usd=cst,
                    user_email=usr
                )
                self.db.add(item)
            self.db.commit()
            logs = self.db.scalars(select(AiCostLog).order_by(desc(AiCostLog.created_at)).limit(100)).all()

        total_cost = sum(l.calculated_cost_usd for l in logs)
        total_tokens = sum(l.input_tokens + l.output_tokens for l in logs)

        by_feature = {}
        for l in logs:
            by_feature[l.feature_name] = by_feature.get(l.feature_name, 0.0) + l.calculated_cost_usd

        return {
            "total_cost_usd": round(total_cost, 4),
            "total_tokens": total_tokens,
            "total_requests": len(logs),
            "cost_by_feature": {k: round(v, 4) for k, v in by_feature.items()},
            "recent_logs": [
                {
                    "id": l.id,
                    "provider": l.provider_name,
                    "model": l.model_name,
                    "feature": l.feature_name,
                    "tokens": l.input_tokens + l.output_tokens,
                    "cost_usd": l.calculated_cost_usd,
                    "created_at": l.created_at.isoformat() if l.created_at else None
                } for l in logs[:10]
            ]
        }
