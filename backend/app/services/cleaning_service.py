import re
from typing import Any, Dict


class CleaningService:
    """Service for cleaning and normalizing raw string attributes."""

    @staticmethod
    def clean_phone(phone: str | None) -> str | None:
        if not phone:
            return None
        digits = re.sub(r"\D", "", phone)
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits.startswith("1"):
            return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        return phone.strip()

    @staticmethod
    def clean_email(email: str | None) -> str | None:
        if not email:
            return None
        cleaned = email.strip().lower()
        if "@" in cleaned and "." in cleaned:
            return cleaned
        return None

    @staticmethod
    def clean_website(url: str | None) -> str | None:
        if not url:
            return None
        cleaned = url.strip()
        if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            cleaned = "https://" + cleaned
        return cleaned

    @staticmethod
    def clean_text(text: str | None) -> str | None:
        if not text:
            return None
        return " ".join(text.strip().split())

    def clean_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Clean all fields in a normalized payload dictionary."""
        cleaned = payload.copy()
        if "name" in cleaned:
            cleaned["name"] = self.clean_text(cleaned["name"]) or "Unknown Entity"

        if "contact" in cleaned and isinstance(cleaned["contact"], dict):
            cleaned["contact"]["phone"] = self.clean_phone(cleaned["contact"].get("phone"))
            cleaned["contact"]["email"] = self.clean_email(cleaned["contact"].get("email"))
            cleaned["contact"]["website"] = self.clean_website(cleaned["contact"].get("website"))

        if "location" in cleaned and isinstance(cleaned["location"], dict):
            cleaned["location"]["address"] = self.clean_text(cleaned["location"].get("address"))
            cleaned["location"]["city"] = self.clean_text(cleaned["location"].get("city"))
            if cleaned["location"].get("state"):
                cleaned["location"]["state"] = cleaned["location"]["state"].strip().upper()

        return cleaned
