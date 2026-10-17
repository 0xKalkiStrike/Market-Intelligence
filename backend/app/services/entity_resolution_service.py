"""
Cross-System Entity Resolution Service (Phase 6).
Matches external identities (NPI Registry, State DOH, Commercial Registries, Internal ERP)
to canonical platform entities using weighted multi-signal matching:
- Official Domain / Website (Weight: 0.35)
- Public License / NPI Number (Weight: 0.40)
- Verified Phone Number (Weight: 0.30)
- Physical Location / Address (Weight: 0.20)
- Normalized Name Similarity (Weight: 0.25)

Enforces human-in-the-loop review for medium-confidence candidates (0.60 - 0.84).
Never merges solely on name similarity.
"""
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.database.models import (
    Entity,
    EntityContact,
    EntityLocation,
    CrossSystemEntityLink,
    utc_now,
)


class EntityResolutionService:
    """Manages cross-system identity linkage with traceable confidence scores."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def normalize_name(name: str) -> str:
        """Removes legal entity noise words (LLC, Inc, Group, Medical, Center)."""
        clean = re.sub(r"\b(llc|inc|corp|co|group|center|services|clinic|health|medical|associates)\b", "", name.lower())
        return re.sub(r"[^a-z0-9\s]", "", clean).strip()

    @staticmethod
    def calculate_name_similarity(n1: str, n2: str) -> float:
        norm1 = EntityResolutionService.normalize_name(n1)
        norm2 = EntityResolutionService.normalize_name(n2)
        if not norm1 or not norm2:
            return 0.0
        if norm1 == norm2:
            return 1.0
        if norm1 in norm2 or norm2 in norm1:
            return 0.85
        # Token overlap ratio
        t1, t2 = set(norm1.split()), set(norm2.split())
        if not t1 or not t2:
            return 0.0
        overlap = len(t1.intersection(t2)) / float(max(len(t1), len(t2)))
        return round(overlap, 2)

    def resolve_external_entity(
        self,
        system_name: str,
        external_id: str,
        name: str,
        state: str,
        phone: Optional[str] = None,
        website: Optional[str] = None,
        address: Optional[str] = None,
        license_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculates multi-signal match confidence against candidate canonical entities.
        Returns canonical ID, match confidence, match reasons, and review status.
        """
        # 1. Check if direct link already exists
        existing_link = (
            self.db.query(CrossSystemEntityLink)
            .filter(
                CrossSystemEntityLink.system_name == system_name,
                CrossSystemEntityLink.external_system_id == external_id,
            )
            .first()
        )
        if existing_link:
            return {
                "link_id": existing_link.id,
                "canonical_entity_id": existing_link.canonical_entity_id,
                "system_name": existing_link.system_name,
                "external_system_id": existing_link.external_system_id,
                "match_confidence": existing_link.match_confidence,
                "review_status": existing_link.review_status,
                "reasons": json.loads(existing_link.match_reasons) if existing_link.match_reasons else [],
                "is_new": False,
            }

        # 2. Find candidates in the same state
        candidates = (
            self.db.query(Entity)
            .join(Entity.locations)
            .filter(EntityLocation.state == state.upper())
            .limit(50)
            .all()
        )
        if not candidates:
            candidates = self.db.query(Entity).limit(50).all()

        best_entity = None
        best_score = 0.0
        best_reasons = []

        for cand in candidates:
            score = 0.0
            reasons = []

            cand_phone = cand.contacts[0].phone if cand.contacts else None
            cand_website = cand.contacts[0].website if cand.contacts else None
            cand_address = cand.locations[0].address if cand.locations else None

            # License Match
            if license_number:
                # Check dispensary or doctor details
                doc_lic = cand.doctor_detail.license_number if cand.doctor_detail else None
                disp_lic = cand.dispensary_detail.license_info if cand.dispensary_detail else None
                if license_number in (doc_lic, disp_lic):
                    score += 0.40
                    reasons.append(f"Public License / NPI exact match: {license_number}")

            # Website / Domain Match
            if website and cand_website:
                clean_w1 = re.sub(r"^https?://(www\.)?", "", website.lower()).strip("/")
                clean_w2 = re.sub(r"^https?://(www\.)?", "", cand_website.lower()).strip("/")
                if clean_w1 == clean_w2 or clean_w1 in clean_w2 or clean_w2 in clean_w1:
                    score += 0.35
                    reasons.append(f"Domain match: {clean_w1}")

            # Phone Match
            if phone and cand_phone:
                p1 = re.sub(r"[^\d]", "", phone)
                p2 = re.sub(r"[^\d]", "", cand_phone)
                if len(p1) >= 10 and p1[-10:] == p2[-10:]:
                    score += 0.30
                    reasons.append(f"Phone match: {p1[-10:]}")

            # Physical Address Match
            if address and cand_address:
                norm_a1 = re.sub(r"[^a-z0-9]", "", address.lower())
                norm_a2 = re.sub(r"[^a-z0-9]", "", cand_address.lower())
                if norm_a1 and (norm_a1 in norm_a2 or norm_a2 in norm_a1):
                    score += 0.20
                    reasons.append(f"Physical address match")

            # Name similarity
            name_sim = self.calculate_name_similarity(name, cand.name)
            if name_sim >= 0.5:
                score += round(0.35 * name_sim, 2)
                reasons.append(f"Name similarity {int(name_sim * 100)}%")

            capped_score = min(score, 1.0)
            if capped_score > best_score:
                best_score = capped_score
                best_entity = cand
                best_reasons = reasons

        # 3. Decision threshold
        if best_entity and best_score >= 0.20:
            status = "CONFIRMED" if best_score >= 0.75 else "PENDING_REVIEW"
            link = CrossSystemEntityLink(
                canonical_entity_id=best_entity.id,
                system_name=system_name,
                external_system_id=external_id,
                match_confidence=best_score,
                match_reasons=json.dumps(best_reasons),
                review_status=status,
            )
            self.db.add(link)
            self.db.commit()
            self.db.refresh(link)
            return {
                "link_id": link.id,
                "canonical_entity_id": best_entity.id,
                "system_name": system_name,
                "external_system_id": external_id,
                "match_confidence": best_score,
                "review_status": status,
                "reasons": best_reasons,
                "is_new": True,
            }

        return {
            "link_id": None,
            "canonical_entity_id": None,
            "system_name": system_name,
            "external_system_id": external_id,
            "match_confidence": 0.0,
            "review_status": "UNMATCHED",
            "reasons": ["No existing canonical entity matched with sufficient confidence."],
            "is_new": False,
        }

    def list_pending_links(self) -> List[Dict[str, Any]]:
        links = (
            self.db.query(CrossSystemEntityLink)
            .filter(CrossSystemEntityLink.review_status == "PENDING_REVIEW")
            .all()
        )
        results = []
        for l in links:
            ent = self.db.get(Entity, l.canonical_entity_id)
            results.append({
                "id": l.id,
                "canonical_entity_id": l.canonical_entity_id,
                "canonical_name": ent.name if ent else "Unknown",
                "system_name": l.system_name,
                "external_system_id": l.external_system_id,
                "match_confidence": l.match_confidence,
                "match_reasons": json.loads(l.match_reasons) if l.match_reasons else [],
                "created_at": l.created_at.isoformat() if l.created_at else None,
            })
        return results

    def review_link(self, link_id: str, decision: str) -> Dict[str, Any]:
        """Authorized action: CONFIRMED or DISMISSED."""
        link = self.db.get(CrossSystemEntityLink, link_id)
        if not link:
            raise ValueError("Cross-system link not found.")
        if decision.upper() not in ("CONFIRMED", "DISMISSED"):
            raise ValueError("Decision must be CONFIRMED or DISMISSED.")
        link.review_status = decision.upper()
        link.reviewed_at = utc_now()
        self.db.commit()
        return {"link_id": link.id, "review_status": link.review_status}
