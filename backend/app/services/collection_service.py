import os
import json
from uuid import uuid4
from datetime import datetime, timezone
from typing import Any, List
from sqlalchemy.orm import Session

from app.collectors.business_directory.collector import BusinessDirectoryCollector
from app.collectors.government.collector import GovernmentRegistryCollector
from app.collectors.provider_directory.collector import ProviderDirectoryCollector
from app.collectors.website.collector import WebsiteCollector
from app.collectors.generic.collector import GenericSurfaceWebCollector
from app.database.models import (
    CollectionRun,
    CompetitorDetail,
    DispensaryDetail,
    DoctorDetail,
    Entity,
    EntityContact,
    EntityLocation,
    EntityService,
    EntitySourceLink,
    RawRecord,
)
from app.services.cleaning_service import CleaningService
from app.services.deduplication_service import DeduplicationService
from app.services.verification_service import VerificationService
from app.services.review_enrichment import ReviewEnricher
from app.services.website_enrichment import enrich_website, social_links_json

# Cap how many competitors get a live Google Maps rating/review lookup per
# collection run -- each lookup opens a real page, so this keeps a single
# run's latency bounded even when many competitors are found.
MAX_REVIEW_ENRICHMENTS_PER_RUN = 0


class CollectionService:
    """Service orchestrating collectors, raw storage, cleaning, normalization, deduplication, and verification."""

    def __init__(self):
        self.cleaner = CleaningService()
        self.deduper = DeduplicationService()
        self.verifier = VerificationService()

    def get_collector(self, source_name: str):
        s_lower = source_name.lower()
        if "two-step" in s_lower or "multi-source" in s_lower or "universal" in s_lower:
            return GenericSurfaceWebCollector()
        elif "website" in s_lower or "corporate" in s_lower or "competitor" in s_lower:
            return WebsiteCollector()
        elif "provider" in s_lower or "doctor" in s_lower or "healthcare" in s_lower:
            return ProviderDirectoryCollector()
        elif "business" in s_lower or "dispensary" in s_lower or "clinic" in s_lower:
            return BusinessDirectoryCollector()
        elif "government" in s_lower or "state public" in s_lower:
            return GovernmentRegistryCollector()
        return GenericSurfaceWebCollector()


    def execute_collection_run(
        self,
        db: Session,
        source_name: str,
        entity_type: str = "ALL",
        location: str = "",
        query: str = "",
        max_records: int = 0,
        is_demo: bool = False,
        batch_size: int = 500,
        existing_run_id: str = None,
    ) -> CollectionRun:
        collector = self.get_collector(source_name)
        actual_source_name = collector.source_name
        review_enricher = ReviewEnricher()

        run_id = existing_run_id or uuid4().hex
        run = db.get(CollectionRun, run_id) if existing_run_id else None
        if not run:
            run = CollectionRun(
                id=run_id,
                source_name=actual_source_name,
                entity_type=entity_type,
                location_filter=location or None,
                status="RUNNING",
                started_at=datetime.now(timezone.utc),
            )
            db.add(run)
            db.commit()
        else:
            run.status = "RUNNING"
            db.commit()

        try:
            # 1. Collect raw records from target collectors/APIs
            raw_records = collector.return_records(query=query, location=location, max_records=max_records)
            
            run = db.get(CollectionRun, run_id) or run
            run.records_collected = len(raw_records)
            db.commit()

            valid_count = 0
            duplicates_count = 0
            needs_review_count = 0
            reviews_enriched_count = 0
            websites_enriched_count = 0
            MAX_WEBSITE_ENRICHMENTS_PER_RUN = 10

            # Pre-allocated batch containers for high-throughput streaming
            batch_objects: List[Any] = []

            for raw_item in raw_records:
                raw_id = uuid4().hex
                entity_id = uuid4().hex

                # 2. Store Raw Record in batch
                raw_db = RawRecord(
                    id=raw_id,
                    run_id=run_id,
                    source_name=actual_source_name,
                    raw_payload=json.dumps(raw_item),
                )
                batch_objects.append(raw_db)

                # 3. Clean payload
                cleaned = self.cleaner.clean_payload(raw_item)
                target_type = cleaned.get("entity_type", "OTHER")

                # Extract public metrics: revenue, rating, review_count, reviews_source_url, employee_count
                est_rev = cleaned.get("estimated_revenue")
                rating_val = cleaned.get("rating")
                rev_cnt = cleaned.get("review_count")
                rev_url = cleaned.get("reviews_source_url")
                emp_cnt = cleaned.get("employee_count")

                # 4. Create Master Entity & child details (in memory with preassigned UUID)
                entity = Entity(
                    id=entity_id,
                    name=cleaned.get("name", "Unknown Entity"),
                    entity_type=target_type,
                    verification_status="UNVERIFIED",
                    freshness_status="FRESH",
                    estimated_revenue=est_rev,
                    rating=rating_val,
                    review_count=rev_cnt,
                    reviews_source_url=rev_url,
                    employee_count=emp_cnt,
                    is_demo=is_demo,
                )

                # Location
                loc_data = cleaned.get("location", {})
                if loc_data and (loc_data.get("city") or loc_data.get("address")):
                    loc = EntityLocation(
                        entity_id=entity_id,
                        address=loc_data.get("address"),
                        city=loc_data.get("city"),
                        state=loc_data.get("state"),
                        zip_code=loc_data.get("zip_code"),
                        country=loc_data.get("country", "USA"),
                    )
                    entity.locations.append(loc)

                # Contact
                con_data = cleaned.get("contact", {})
                if con_data and (con_data.get("phone") or con_data.get("email") or con_data.get("website")):
                    con = EntityContact(
                        entity_id=entity_id,
                        phone=con_data.get("phone"),
                        email=con_data.get("email"),
                        website=con_data.get("website"),
                    )
                    skip_live = bool(os.getenv("TESTING") or os.getenv("SKIP_LIVE_LOOKUPS") or is_demo)
                    if con.website and websites_enriched_count < MAX_WEBSITE_ENRICHMENTS_PER_RUN and not skip_live:
                        web = enrich_website(con.website)
                        websites_enriched_count += 1
                        con.social_links = social_links_json(web["social_links"])
                        if not con.email and web["emails"]:
                            con.email = web["emails"][0]
                        if not con.phone and web["phones"]:
                            con.phone = web["phones"][0]
                    entity.contacts.append(con)

                # Enrich reviews via Google Maps if not present yet
                skip_live = bool(os.getenv("TESTING") or os.getenv("SKIP_LIVE_LOOKUPS") or is_demo)
                if (entity.rating is None or entity.review_count is None) and reviews_enriched_count < MAX_REVIEW_ENRICHMENTS_PER_RUN and not skip_live:
                    r_data = review_enricher.get_rating(
                        entity.name, loc_data.get("city"), loc_data.get("state")
                    )
                    if r_data["rating"] is not None:
                        entity.rating = r_data["rating"]
                        entity.review_count = r_data["review_count"]
                        entity.reviews_source_url = r_data["source_url"]
                        reviews_enriched_count += 1

                # Entity Details & Services
                services_str = ""
                if target_type == "DOCTOR":
                    d_data = cleaned.get("doctor_detail", {})
                    services_str = d_data.get("services", "")
                    doc_detail = DoctorDetail(
                        entity_id=entity_id,
                        title=d_data.get("title"),
                        specialty=d_data.get("specialty"),
                        organization=d_data.get("organization"),
                        clinic_name=d_data.get("clinic_name"),
                        license_number=d_data.get("license_number"),
                        services=services_str,
                        estimated_revenue=entity.estimated_revenue,
                        rating=entity.rating,
                        review_count=entity.review_count,
                    )
                    entity.doctor_detail = doc_detail
                elif target_type in ("DISPENSARY", "CLINIC"):
                    disp_data = cleaned.get("dispensary_detail", {})
                    services_str = disp_data.get("services", "")
                    disp_detail = DispensaryDetail(
                        entity_id=entity_id,
                        business_type=disp_data.get("business_type"),
                        operating_hours=disp_data.get("operating_hours"),
                        services=services_str,
                        license_info=disp_data.get("license_info"),
                        products_offered=disp_data.get("products_offered"),
                        estimated_revenue=entity.estimated_revenue,
                        rating=entity.rating,
                        review_count=entity.review_count,
                    )
                    entity.dispensary_detail = disp_detail
                elif target_type == "COMPETITOR":
                    comp_data = cleaned.get("competitor_detail", {})
                    services_str = comp_data.get("products_services", "")
                    comp_detail = CompetitorDetail(
                        entity_id=entity_id,
                        business_type=comp_data.get("business_type"),
                        locations_summary=comp_data.get("locations_summary"),
                        pricing_info=comp_data.get("pricing_info"),
                        business_description=comp_data.get("business_description"),
                        products_services=services_str,
                        estimated_revenue=entity.estimated_revenue,
                        employee_count=entity.employee_count,
                        rating=entity.rating,
                        review_count=entity.review_count,
                        reviews_source_url=entity.reviews_source_url,
                    )
                    entity.competitor_detail = comp_detail

                if services_str:
                    svc_list = [s.strip() for s in services_str.split(",") if s.strip()]
                    for s_item in svc_list:
                        entity.services.append(EntityService(
                            entity_id=entity_id,
                            service_name=s_item,
                            service_category=target_type,
                        ))

                # Source link
                link = EntitySourceLink(
                    entity_id=entity_id,
                    source_name=actual_source_name,
                    source_url=cleaned.get("source_url", collector.base_url),
                    raw_record_id=raw_id,
                )
                entity.source_links.append(link)

                # 5. In-Memory Verification Evaluation
                v_status, quality_score, evidence = VerificationService.evaluate_entity(entity)
                entity.verification_status = v_status
                entity.data_quality_score = quality_score

                from app.database.models import VerificationResult
                v_res = VerificationResult(
                    entity_id=entity_id,
                    status=v_status,
                    confidence_score=quality_score,
                    evidence=evidence,
                )
                batch_objects.append(entity)
                batch_objects.append(v_res)

                valid_count += 1
                if v_status == "NEEDS_REVIEW":
                    needs_review_count += 1

                # Dynamically update run progress
                run.records_valid = valid_count
                run.duplicates_detected = duplicates_count
                run.needs_review = needs_review_count

                # Flush batch every batch_size items for streaming high volume persistence
                if len(batch_objects) >= batch_size:
                    db.add_all(batch_objects)
                    db.commit()
                    batch_objects.clear()

            # Flush remaining batch objects
            if batch_objects:
                db.add_all(batch_objects)
                db.commit()
                batch_objects.clear()

            # Step 2: Automated Competitor Scraping & Discovery for target market
            if not skip_live:
                try:
                    import leads
                    clean_q = (query or entity_type or "").replace("competitors", "").replace("competitor", "").strip()
                    comp_query = f"{clean_q} Competitor".strip()
                    comp_records = leads.fetch_live_market_records(
                        category=comp_query,
                        location=location or "USA",
                        max_records=10,
                    )
                    comp_entities = []
                    for c_raw in comp_records:
                        c_clean = self.cleaner.clean_payload(c_raw)
                        c_id = uuid4().hex
                        c_name = c_clean.get("name")
                        if not c_name:
                            continue
                        
                        c_entity = Entity(
                            id=c_id,
                            name=c_name,
                            entity_type="COMPETITOR",
                            verification_status="UNVERIFIED",
                            freshness_status="FRESH",
                            # Only real, sourced values. Missing data stays NULL
                            # ("not publicly disclosed") -- never a placeholder.
                            estimated_revenue=c_clean.get("estimated_revenue") or None,
                            rating=c_clean.get("rating"),
                            review_count=c_clean.get("review_count"),
                            reviews_source_url=c_clean.get("reviews_source_url"),
                            employee_count=c_clean.get("employee_count") or None,
                            is_demo=is_demo,
                            data_quality_score=0.0,
                        )
                        # Support both nested location dict and top-level address/city/state
                        loc_addr = c_clean.get("address") or (c_clean.get("location", {}).get("address") if isinstance(c_clean.get("location"), dict) else None)
                        loc_city = c_clean.get("city") or (c_clean.get("location", {}).get("city") if isinstance(c_clean.get("location"), dict) else None) or location
                        loc_state = c_clean.get("state") or (c_clean.get("location", {}).get("state") if isinstance(c_clean.get("location"), dict) else None)
                        loc_zip = c_clean.get("zip_code") or (c_clean.get("location", {}).get("zip_code") if isinstance(c_clean.get("location"), dict) else None)

                        if loc_addr or loc_city:
                            c_entity.locations.append(EntityLocation(
                                entity_id=c_id,
                                address=loc_addr,
                                city=loc_city,
                                state=loc_state,
                                zip_code=loc_zip,
                                country="USA",
                            ))

                        # Support both nested contact dict and top-level phone/website/email
                        con_phone = c_clean.get("phone") or (c_clean.get("contact", {}).get("phone") if isinstance(c_clean.get("contact"), dict) else None)
                        con_email = c_clean.get("email") or (c_clean.get("contact", {}).get("email") if isinstance(c_clean.get("contact"), dict) else None)
                        con_web = c_clean.get("website") or (c_clean.get("contact", {}).get("website") if isinstance(c_clean.get("contact"), dict) else None)

                        if con_phone or con_email or con_web:
                            c_entity.contacts.append(EntityContact(
                                entity_id=c_id,
                                phone=con_phone,
                                email=con_email,
                                website=con_web,
                            ))

                        # Source link
                        src_name = c_clean.get("source_name") or "OpenStreetMap / Community Business Registry"
                        src_url = c_clean.get("source_url") or "https://www.openstreetmap.org"
                        c_entity.source_links.append(EntitySourceLink(
                            entity_id=c_id,
                            source_name=src_name,
                            source_url=src_url,
                        ))

                        # Services
                        prods = c_clean.get("products_services") or f"{clean_q} Commercial Offerings"
                        if prods:
                            for p_item in [p.strip() for p in prods.split(",") if p.strip()]:
                                c_entity.services.append(EntityService(
                                    entity_id=c_id,
                                    service_name=p_item,
                                    service_category="COMPETITOR",
                                ))

                        c_detail = CompetitorDetail(
                            entity_id=c_id,
                            business_type=c_clean.get("business_type") or "Market Competitor",
                            business_description=c_clean.get("business_description") or f"Direct competitor in {location}.",
                            products_services=prods,
                            estimated_revenue=c_entity.estimated_revenue,
                            employee_count=c_entity.employee_count,
                            rating=c_entity.rating,
                            review_count=c_entity.review_count,
                            reviews_source_url=c_entity.reviews_source_url,
                        )
                        c_entity.competitor_detail = c_detail

                        # Evaluate quality and verification status
                        v_st, v_sc, v_ev = VerificationService.evaluate_entity(c_entity)
                        c_entity.verification_status = v_st
                        c_entity.data_quality_score = v_sc
                        db.add(VerificationResult(
                            entity_id=c_id,
                            status=v_st,
                            confidence_score=v_sc,
                            evidence=v_ev,
                        ))

                        comp_entities.append(c_entity)
                    
                    if comp_entities:
                        db.add_all(comp_entities)
                        db.commit()
                except Exception as c_err:
                    print(f"[!] Competitor discovery sweep note: {c_err}")

            # Finalize run metadata
            run_obj = db.query(CollectionRun).filter(CollectionRun.id == run_id).first() or run
            run_obj.records_valid = valid_count
            run_obj.duplicates_detected = duplicates_count
            run_obj.needs_review = needs_review_count
            run_obj.status = "COMPLETED"
            run_obj.completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(run_obj)
            return run_obj


        except Exception as e:
            import traceback
            print(f"[!] Collection run exception: {type(e).__name__}: {e}")
            traceback.print_exc()
            db.rollback()
            try:
                run_id = getattr(run, "id", None)
                if run_id:
                    run_failed = db.query(CollectionRun).filter(CollectionRun.id == run_id).first()
                    if run_failed:
                        run_failed.status = "FAILED"
                        run_failed.errors_count = 1
                        run_failed.completed_at = datetime.now(timezone.utc)
                        db.commit()
            except Exception as err:
                print(f"[!] Secondary error handling note: {err}")
                db.rollback()

        finally:
            review_enricher.close()

        res_run = db.query(CollectionRun).filter(CollectionRun.id == run_id).first() if run_id else run
        if res_run:
            try:
                db.refresh(res_run)
            except Exception:
                pass
        return res_run or run

