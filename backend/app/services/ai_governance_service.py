"""
AI Governance, Safety Enforcement & Regression Evaluation Service (Phase 5).
Implements:
- Strict query validation: Prevents internal data leakage & blocks any PHI input/extraction
- Cost & Token Budget Controls with configurable threshold actions
- Automated Regression Benchmark Suite for the 6 Core Executive Business Questions
- Groundedness, Hallucination Rate, and Uncertainty validation
"""
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.rbac import get_user_permission_codes
from app.database.models import (
    AiAuditLog,
    AiCostLog,
    AiEvaluationBenchmarkRun,
    User,
    utc_now,
)
from app.services.ai_assistant_service import AiAssistantService


EXECUTIVE_CORE_6_QUESTIONS = [
    {
        "id": "Q1_COMPETITOR_PRICING",
        "question": "Which competitors changed pricing this month?",
        "intent": "COMPETITOR_PRICING",
        "category": "PRICING",
        "expected_keywords": ["competitor", "price", "fee"],
        "criteria": "Identifies verified price changes, renewal fees, and competitor shifts.",
    },
    {
        "id": "Q2_FLORIDA_WHAT_CHANGED",
        "question": "What changed in Florida this week?",
        "intent": "WHAT_CHANGED",
        "category": "STATE_DELTA",
        "expected_keywords": ["Florida", "FL", "changes"],
        "criteria": "Returns state-specific week-over-week deltas without fabricating missing events.",
    },
    {
        "id": "Q3_TOP_OPPORTUNITY_STATES",
        "question": "Which states have the strongest opportunity signals?",
        "intent": "MARKET_OPPORTUNITY",
        "category": "OPPORTUNITY",
        "expected_keywords": ["opportunity", "score", "market"],
        "criteria": "Ranks states using explainable 9-factor weighted scoring methodology.",
    },
    {
        "id": "Q4_UNCONTACTED_DISPENSARIES",
        "question": "Which dispensaries have never been contacted?",
        "intent": "DISPENSARY_PARTNERSHIP",
        "category": "CRM_PIPELINE",
        "expected_keywords": ["dispensary", "contacted", "partner"],
        "criteria": "Filters partnership pipeline strictly for status NOT_CONTACTED.",
    },
    {
        "id": "Q5_REGULATORY_REVIEW_REQUIRED",
        "question": "Which regulatory changes require review?",
        "intent": "REGULATORY_INTELLIGENCE",
        "category": "COMPLIANCE",
        "expected_keywords": ["regulatory", "telehealth", "compliance"],
        "criteria": "Surfaces high and critical priority regulatory updates across state jurisdictions.",
    },
    {
        "id": "Q6_STATE_SCORE_EXPLANATION",
        "question": "Why did a state opportunity score change?",
        "intent": "ADVANCED_OPPORTUNITY",
        "category": "EXPLAINABILITY",
        "expected_keywords": ["score", "factor", "opportunity"],
        "criteria": "Provides factor-by-factor breakdown explaining score movement transparently.",
    },
]


class AiGovernancePolicyError(Exception):
    """Raised when an AI query violates data governance, PHI restrictions, or safety boundaries."""
    pass


class AiBudgetExceededError(Exception):
    """Raised when operational LLM usage exceeds configured financial budget."""
    pass


class AiGovernanceService:
    DAILY_BUDGET_USD = 50.0  # Configurable daily cost cap
    MONTHLY_BUDGET_USD = 1000.0

    def __init__(self, db: Session):
        self.db = db

    def validate_and_sanitize_query(self, user: User, prompt: str) -> str:
        """Enforces query validation: blocks PHI, protects internal metrics, and verifies permissions."""
        if not prompt or not prompt.strip():
            raise AiGovernancePolicyError("Query prompt cannot be empty.")

        clean_prompt = prompt.strip()
        lower_prompt = clean_prompt.lower()

        # 1. Strictly Reject Protected Health Information (PHI)
        phi_indicators = [
            "patient diagnosis", "medical chart", "clinical notes", "patient cert",
            "medical record number", "mrn", "patient name", "prescription details",
            "social security", "ssn", "date of birth",
        ]
        for phi_term in phi_indicators:
            if phi_term in lower_prompt:
                raise AiGovernancePolicyError(
                    f"Governance Violation: Clinical patient health information ('{phi_term}') is strictly prohibited from the Market Intelligence platform."
                )

        # 2. Check internal business metrics permissions
        internal_indicators = ["internal revenue", "doctor capacity schedule", "appointment booking volume", "internal payroll"]
        user_perms = get_user_permission_codes(user)
        for term in internal_indicators:
            if term in lower_prompt and "internal_metrics:read" not in user_perms and "*" not in user_perms:
                raise AiGovernancePolicyError(
                    f"Access Denied: Query requests restricted internal business information ('{term}'). Missing 'internal_metrics:read' permission."
                )

        return clean_prompt

    def check_and_record_cost(
        self,
        provider: str,
        model: str,
        feature: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
        user_email: Optional[str] = None,
    ) -> None:
        """Enforces budget controls and logs token expenditure to AiCostLog."""
        # Calculate today's cumulative spend
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_spend = (
            self.db.query(func.coalesce(func.sum(AiCostLog.calculated_cost_usd), 0.0))
            .filter(AiCostLog.created_at >= today_start)
            .scalar()
        )

        if daily_spend + cost_usd > self.DAILY_BUDGET_USD:
            raise AiBudgetExceededError(
                f"Operational AI daily budget limit (${self.DAILY_BUDGET_USD:.2f}) reached. Current: ${daily_spend:.2f} + ${cost_usd:.4f}. Request paused for cost governance."
            )

        # Record cost log
        log_entry = AiCostLog(
            provider_name=provider,
            model_name=model,
            feature_name=feature,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            calculated_cost_usd=cost_usd,
            user_email=user_email,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(log_entry)
        self.db.commit()

    def run_regression_benchmark_suite(
        self,
        model_name: str = "deterministic-evidence-grounded-v5",
        prompt_version: str = "v5.0",
    ) -> Dict[str, Any]:
        """Runs the 6 Core Business Questions and evaluates groundedness, accuracy, and hallucination rate."""
        assistant = AiAssistantService()
        benchmark_results = []
        passed_count = 0
        total_groundedness = 0.0

        for item in EXECUTIVE_CORE_6_QUESTIONS:
            start_t = datetime.now()
            res = assistant.ask(self.db, item["question"])
            latency_ms = round((datetime.now() - start_t).total_seconds() * 1000, 2)

            # Verification criteria
            answer_text = res.get("answer", "")
            sources = res.get("sources", [])
            confidence = res.get("confidence", "MEDIUM")

            # Check for keyword grounding
            has_keywords = any(kw.lower() in answer_text.lower() for kw in item["expected_keywords"])
            has_sources = len(sources) > 0
            is_high_conf = confidence in ("HIGH", "MEDIUM")

            # Calculate individual groundedness
            groundedness = 1.0 if (has_keywords and has_sources and is_high_conf) else 0.8 if has_keywords else 0.5
            total_groundedness += groundedness

            status_str = "PASSED" if groundedness >= 0.75 else "FAILED"
            if status_str == "PASSED":
                passed_count += 1

            benchmark_results.append({
                "id": item["id"],
                "question": item["question"],
                "intent": item["intent"],
                "category": item["category"],
                "status": status_str,
                "groundedness_score": groundedness,
                "confidence": confidence,
                "sources_cited": len(sources),
                "latency_ms": latency_ms,
                "answer_preview": (answer_text[:140] + "...") if len(answer_text) > 140 else answer_text,
            })

        avg_groundedness = round(total_groundedness / len(EXECUTIVE_CORE_6_QUESTIONS), 3)
        accuracy = round(passed_count / len(EXECUTIVE_CORE_6_QUESTIONS), 3)
        hallucination_rate = round(max(0.0, 1.0 - avg_groundedness), 3)

        # Record benchmark run in DB
        run_record = AiEvaluationBenchmarkRun(
            prompt_version=prompt_version,
            model_name=model_name,
            benchmark_suite_name="EXECUTIVE_CORE_6",
            total_questions=len(EXECUTIVE_CORE_6_QUESTIONS),
            passed_questions=passed_count,
            accuracy_score=accuracy,
            groundedness_score=avg_groundedness,
            hallucination_rate=hallucination_rate,
            results_json=json.dumps(benchmark_results),
            executed_at=datetime.now(timezone.utc),
        )
        self.db.add(run_record)
        self.db.commit()
        self.db.refresh(run_record)

        return {
            "run_id": run_record.id,
            "benchmark_suite": "EXECUTIVE_CORE_6",
            "model_name": model_name,
            "prompt_version": prompt_version,
            "total_questions": len(EXECUTIVE_CORE_6_QUESTIONS),
            "passed_questions": passed_count,
            "accuracy_score": accuracy,
            "groundedness_score": avg_groundedness,
            "hallucination_rate": hallucination_rate,
            "evaluated_at": run_record.executed_at.isoformat(),
            "questions": benchmark_results,
        }
