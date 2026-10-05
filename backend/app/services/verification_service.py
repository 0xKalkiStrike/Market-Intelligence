from sqlalchemy.orm import Session
from app.database.models import Entity, VerificationResult


class VerificationService:
    """Service to evaluate data completeness and calculate entity verification status & quality metrics."""

    @staticmethod
    def evaluate_entity(entity: Entity) -> tuple[str, float, str]:
        """
        Returns (verification_status, quality_score, evidence_text)
        """
        score = 0.0
        evidence_items = []

        # Check basic identity
        if entity.name:
            score += 25
            evidence_items.append("Valid entity name present (+25%)")

        # Check location
        loc = entity.locations[0] if entity.locations else None
        if loc and loc.address and loc.city and loc.state:
            score += 25
            evidence_items.append(f"Complete address ({loc.city}, {loc.state}) (+25%)")
        elif loc and (loc.city or loc.state):
            score += 15
            evidence_items.append("Partial location details (+15%)")

        # Check contact info
        con = entity.contacts[0] if entity.contacts else None
        if con and con.phone:
            score += 20
            evidence_items.append(f"Phone contact ({con.phone}) (+20%)")
        if con and con.website:
            score += 15
            evidence_items.append(f"Website verified ({con.website}) (+15%)")
        if con and con.email:
            score += 10
            evidence_items.append("Public email contact (+10%)")

        # Check multi-source evidence
        source_count = len(entity.source_links) if entity.source_links else 1
        if source_count > 1:
            score += 10
            evidence_items.append(f"Cross-verified across {source_count} sources (+10%)")

        # Determine verification status based on completeness & evidence
        if score >= 80:
            status = "VERIFIED"
        elif score >= 50:
            status = "PARTIALLY_VERIFIED"
        elif score >= 30:
            status = "NEEDS_REVIEW"
        else:
            status = "UNVERIFIED"

        quality_ratio = min(score / 100.0, 1.0)
        evidence_str = "\n".join(evidence_items)
        return status, quality_ratio, evidence_str

    def run_verification(self, db: Session, entity_id: str, auto_commit: bool = True) -> VerificationResult:
        entity = db.get(Entity, entity_id)
        if not entity:
            entity = db.query(Entity).filter(Entity.id == entity_id).first()
        if not entity:
            raise ValueError(f"Entity {entity_id} not found")

        status, quality_score, evidence = self.evaluate_entity(entity)

        entity.verification_status = status
        entity.data_quality_score = quality_score

        res = VerificationResult(
            entity_id=entity.id,
            status=status,
            confidence_score=quality_score,
            evidence=evidence,
        )
        db.add(res)
        if auto_commit:
            db.commit()
            db.refresh(entity)
        else:
            db.flush()
        return res
