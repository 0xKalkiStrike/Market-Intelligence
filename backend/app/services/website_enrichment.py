"""
==============================================================================
 PUBLIC WEBSITE ENRICHMENT (social profiles, emails, phones)
==============================================================================
For an entity's own public website, fetch the homepage (and one contact page
if linked) and extract:

  - Social media profile links (Facebook, Instagram, LinkedIn, X/Twitter,
    YouTube, TikTok) -- the public profile URLs the business itself publishes
  - Public email addresses (mailto links / visible addresses)
  - Public phone numbers (tel links)

Only publicly served HTML is read. No logins, no bypasses. Every failure
returns empty values -- nothing is ever fabricated.
==============================================================================
"""

import json
import re
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

SOCIAL_PATTERNS = {
    "facebook": re.compile(r"https?://(?:www\.|m\.)?facebook\.com/(?!sharer|share|plugins|tr\b|dialog)[A-Za-z0-9._\-/]+", re.I),
    "instagram": re.compile(r"https?://(?:www\.)?instagram\.com/(?!p/|reel/|explore/|sharer)[A-Za-z0-9._\-]+/?", re.I),
    "linkedin": re.compile(r"https?://(?:[a-z]{2,3}\.)?linkedin\.com/(?:company|in)/[A-Za-z0-9._\-%]+/?", re.I),
    "twitter": re.compile(r"https?://(?:www\.)?(?:twitter|x)\.com/(?!intent|share|home)[A-Za-z0-9_]+/?", re.I),
    "youtube": re.compile(r"https?://(?:www\.)?youtube\.com/(?:@|channel/|c/|user/)[A-Za-z0-9._\-]+/?", re.I),
    "tiktok": re.compile(r"https?://(?:www\.)?tiktok\.com/@[A-Za-z0-9._\-]+/?", re.I),
}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
MAILTO_RE = re.compile(r"mailto:([^\"'?<>\s]+)", re.I)
TEL_RE = re.compile(r"tel:([+\d()\s.\-]{7,20})", re.I)
CONTACT_HREF_RE = re.compile(r"href=[\"']([^\"']*(?:contact|about)[^\"']*)[\"']", re.I)
JUNK_EMAIL = re.compile(r"\.(png|jpg|jpeg|gif|svg|webp|css|js)$|example\.|sentry|wixpress|domain\.", re.I)


def _fetch_html(client: httpx.Client, url: str) -> str:
    try:
        r = client.get(url, timeout=8.0, follow_redirects=True)
        if r.status_code == 200 and "html" in r.headers.get("content-type", "").lower():
            return r.text[:800_000]
    except Exception:
        pass
    return ""


def enrich_website(website: Optional[str]) -> Dict:
    """Returns {"social_links": {...}, "emails": [...], "phones": [...], "pages_checked": n}.
    Empty structures when the site is missing or unreachable."""
    result = {"social_links": {}, "emails": [], "phones": [], "pages_checked": 0}
    if not website:
        return result
    url = website if website.startswith("http") else f"https://{website}"
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return result
    except Exception:
        return result

    with httpx.Client(headers={"User-Agent": USER_AGENT, "Accept": "text/html"}) as client:
        pages = [url]
        home = _fetch_html(client, url)
        if home:
            result["pages_checked"] += 1
            contact_links = []
            for href in CONTACT_HREF_RE.findall(home):
                full = urljoin(url, href)
                if urlparse(full).netloc == parsed.netloc and full not in contact_links:
                    contact_links.append(full)
            if contact_links:
                pages.append(contact_links[0])
        html_all = home or ""
        for page in pages[1:]:
            h = _fetch_html(client, page)
            if h:
                result["pages_checked"] += 1
                html_all += "\n" + h

    if not html_all:
        return result

    for network, rx in SOCIAL_PATTERNS.items():
        m = rx.search(html_all)
        if m:
            result["social_links"][network] = m.group(0).rstrip("/\"'")

    emails: List[str] = []
    for e in MAILTO_RE.findall(html_all) + EMAIL_RE.findall(html_all):
        e = e.strip().strip(".").lower()
        if EMAIL_RE.fullmatch(e) and not JUNK_EMAIL.search(e) and e not in emails:
            emails.append(e)
    result["emails"] = emails[:5]

    phones: List[str] = []
    for t in TEL_RE.findall(html_all):
        t = t.strip()
        if t and t not in phones:
            phones.append(t)
    result["phones"] = phones[:5]
    return result


def social_links_json(social: Dict[str, str]) -> Optional[str]:
    return json.dumps(social, ensure_ascii=False) if social else None
