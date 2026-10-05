from typing import Any, Dict, List, Tuple
from sqlalchemy.orm import Session
from app.database.models import Entity, EntityContact, EntityLocation, DuplicateCandidate


class DeduplicationService:
    """Service to detect potential duplicate entities across multiple sources."""

    @staticmethod
    def calculate_similarity(e1_name: str, e2_name: str) -> float:
        n1 = e1_name.lower().replace("llc", "").replace("inc", "").replace("center", "").strip()
        n2 = e2_name.lower().replace("llc", "").replace("inc", "").replace("center", "").strip()
        if n1 == n2:
            return 1.0
        if n1 in n2 or n2 in n1:
            return 0.85
        return 0.0

    def find_duplicates_for_entity(self, db: Session, entity_id: str) -> List[Tuple[Entity, float, str]]:
        target = db.get(Entity, entity_id)
        if not target:
            target = db.query(Entity).filter(Entity.id == entity_id).first()
        if not target:
            return []

        target_phone = target.contacts[0].phone if target.contacts else None
        target_website = target.contacts[0].website if target.contacts else None
        target_city = target.locations[0].city if target.locations else None

        from sqlalchemy import or_
        filters = []
        if target.name and len(target.name.strip()) >= 3:
            clean_name = target.name.lower().replace("llc", "").replace("inc", "").strip()
            first_word = clean_name.split()[0] if clean_name else ""
            if len(first_word) >= 3:
                filters.append(Entity.name.ilike(f"%{first_word}%"))

        if target_phone:
            filters.append(Entity.id.in_(
                db.query(EntityContact.entity_id).filter(EntityContact.phone == target_phone)
            ))
        if target_website:
            filters.append(Entity.id.in_(
                db.query(EntityContact.entity_id).filter(EntityContact.website == target_website)
            ))

        if not filters:
            return []

        candidates = (
            db.query(Entity)
            .filter(Entity.id != entity_id)
            .filter(or_(*filters))
            .limit(50)
            .all()
        )
        matches = []

        for cand in candidates:
            score = 0.0
            reasons = []

            # Name matching
            name_score = self.calculate_similarity(target.name, cand.name)
            if name_score > 0.8:
                score += 0.5
                reasons.append(f"Name match ({int(name_score * 100)}%)")

            # Contact matching
            cand_phone = cand.contacts[0].phone if cand.contacts else None
            cand_website = cand.contacts[0].website if cand.contacts else None
            cand_city = cand.locations[0].city if cand.locations else None

            if target_phone and cand_phone and target_phone == cand_phone:
                score += 0.4
                reasons.append("Phone match")

            if target_website and cand_website and target_website == cand_website:
                score += 0.4
                reasons.append("Website match")

            if target_city and cand_city and target_city.lower() == cand_city.lower():
                score += 0.1
                reasons.append("City match")

            if score >= 0.7:
                matches.append((cand, min(score, 1.0), ", ".join(reasons)))

        return matches

    def check_and_record_duplicates(self, db: Session, entity_id: str, auto_commit: bool = True) -> int:
        duplicates = self.find_duplicates_for_entity(db, entity_id)
        for cand, score, reasons in duplicates:
            # Avoid duplicate duplicate records
            existing = (
                db.query(DuplicateCandidate)
                .filter(
                    ((DuplicateCandidate.entity_id_1 == entity_id) & (DuplicateCandidate.entity_id_2 == cand.id))
                    | ((DuplicateCandidate.entity_id_1 == cand.id) & (DuplicateCandidate.entity_id_2 == entity_id))
                )
                .first()
            )
            if not existing:
                dup = DuplicateCandidate(
                    entity_id_1=entity_id,
                    entity_id_2=cand.id,
                    match_score=score,
                    match_reasons=reasons,
                    status="PENDING",
                )
                db.add(dup)
        if auto_commit:
            db.commit()
        return len(duplicates)
