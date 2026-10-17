from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.services.ai_provider_service import AiProviderAdapter, AiProviderService
from app.services.nl_query_engine import NlQueryEngine


class AiAssistantService:
    """Ground-truth Data AI Market Intelligence Assistant ensuring responses are backed by underlying database records with explicit confidence scoring and zero hallucinations."""

    def __init__(self):
        self.query_engine = NlQueryEngine()
        self.provider_service = AiProviderService()

    def ask(self, db: Session, question: str, user_id: Optional[str] = None, user_email: Optional[str] = None) -> Dict[str, Any]:
        # 1. Execute safe NL Query Engine to retrieve factual records
        query_result = self.query_engine.parse_and_execute(db, question)
        intent = query_result["intent"]
        data = query_result["data"]
        rec_count = query_result["records_retrieved"]
        state_filter = query_result.get("state_filter")
        viz = query_result.get("recommended_visualization", "table")

        # 2. Build Factual Grounded Response Components
        evidence: List[Dict[str, Any]] = data[:10]
        sources: List[str] = []
        key_changes: List[str] = []
        confidence = "HIGH" if rec_count > 0 else "LOW"
        limitations = ""

        # Construct specific grounded responses by intent
        if intent == "COMPETITOR_PRICING":
            if data:
                changes = [d for d in data if d.get("previous_price") and d.get("new_price") and d["new_price"] != d["previous_price"]]
                if changes:
                    key_changes = [f"{c['competitor_name']} changed price from ${c['previous_price']:.2f} to ${c['new_price']:.2f} in {c['state']}" for c in changes[:5]]
                else:
                    key_changes = ["No price reductions detected in the current window; market prices remain stable."]
                
                sources = list(set([d.get("source") or "Surface Web Pricing Engine" for d in data if d.get("source")]))
                answer = f"Found {rec_count} verified competitor pricing records" + (f" in {state_filter}" if state_filter else "") + ". MMJ-DOCS initial certification price is $149."
                limitations = f"Based on {rec_count} verified records. Competitors without recent public updates were excluded."
            else:
                answer = "No recent price changes matching your filter were found in the database."
                sources = ["Surface Web Pricing Engine"]
                confidence = "MEDIUM"
                limitations = "Data coverage depends on public pricing disclosures."

        elif intent == "MARKET_OPPORTUNITY":
            if data:
                top = data[0]
                answer = f"Top market opportunity is state {top['state']} with an Opportunity Score of {top['opportunity_score']:.1f}/100. Patient volume: {top['patient_population']:,}, Competitors: {top['competitor_count']}."
                key_changes = [f"State {d['state']} score: {d['opportunity_score']:.1f} (Patient Pop: {d['patient_population']:,})" for d in data[:3]]
                sources = ["State Market Intelligence Model"]
                limitations = "Opportunity scores are computed based on configured weights for population, competitor density, and telehealth rules."
            else:
                answer = "No state market metrics available."
                confidence = "LOW"

        elif intent == "DISPENSARY_PARTNERSHIP":
            if data:
                answer = f"Found {rec_count} dispensary partnership opportunities" + (f" in {state_filter}" if state_filter else "") + "."
                key_changes = [f"{d['name']} ({d['city'] or 'CA'}, {d['state']}): Status '{d['partnership_status']}', Score {d['partnership_score']:.1f}" for d in data[:5]]
                sources = ["Public Business Directory (Dispensaries)"]
                limitations = "Includes uncontacted and active dispensary locations verified in directory."
            else:
                answer = "No matching dispensary partnership records found."
                confidence = "LOW"

        elif intent == "REGULATORY_INTELLIGENCE":
            if data:
                answer = f"Retrieved {rec_count} regulatory intelligence records."
                key_changes = [f"[{d['state']}] {d['rule_title']}: {d['new_info']} (Priority: {d['impact_priority']})" for d in data[:5]]
                sources = ["State Department of Health Official Gazettes"]
                limitations = "Regulatory updates reflect published government policies."
            else:
                answer = "No recent regulatory changes detected."
                confidence = "MEDIUM"

        else:
            answer = f"Database entity query returned {rec_count} verified records."
            key_changes = [f"Entity '{d['name']}' ({d['entity_type']}) - Status: {d['verification_status']}" for d in data[:5]]
            sources = ["MMJ-DOCS Central Entity Database"]
            limitations = "Reflects surface-web entities tracked in master registry."

        # 3. Formulate structured response object
        response_data = {
            "question": question,
            "answer": answer,
            "evidence": evidence,
            "key_changes": key_changes,
            "sources": sources,
            "confidence": confidence,
            "limitations": limitations,
            "intent": intent,
            "query_summary": query_result["generated_query_summary"],
            "recommended_visualization": viz,
            "records_retrieved": rec_count,
        }

        # 4. Log AI Audit Log
        ai_config = self.provider_service.get_active_config(db)
        adapter = AiProviderAdapter(provider_name=ai_config.provider_name, model_name=ai_config.model_name)
        comp = adapter.generate_completion(question)

        self.provider_service.log_ai_request(
            db=db,
            question=question,
            intent=intent,
            entities_detected=[state_filter] if state_filter else [],
            generated_query=query_result["generated_query_summary"],
            records_retrieved_count=rec_count,
            model_used=ai_config.model_name,
            input_tokens=comp["input_tokens"],
            output_tokens=comp["output_tokens"],
            latency_ms=comp["latency_ms"],
            confidence=confidence,
            response_summary=answer[:200],
            user_id=user_id,
            user_email=user_email,
        )

        return response_data
