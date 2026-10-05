"""
==============================================================================
 COMPETITOR REVIEW ENRICHMENT (real Google Maps ratings & review counts)
==============================================================================
OpenStreetMap and the NPI Registry (this app's live data sources) don't carry
review/rating data -- there's no such concept in either dataset. To let users
actually compare competitors on reviews, this pulls the real rating and
review count from Google Maps for each competitor, the same technique
Automation/lead_scraper.py already uses for its Google Maps mode (a small
headless Chrome session + a JS snippet reading the rendered listing page).

Design:
  - One shared headless Chrome instance per collection run (reused across all
    competitors in that run), started lazily on first use and closed by the
    caller when the run finishes.
  - Every failure mode (Chrome/driver missing, page timeout, listing not
    found) degrades to {"rating": None, "review_count": None} -- this NEVER
    fabricates a placeholder value. A competitor simply shows "no review
    data yet" rather than a fake number.
  - If Chrome fails to start at all, enrichment disables itself for the rest
    of the run instead of retrying (and failing slowly) for every entity.
==============================================================================
"""

import os
import re
import shutil
import time
from typing import Optional, TypedDict


class ReviewData(TypedDict):
    rating: Optional[float]
    review_count: Optional[int]
    source_url: Optional[str]


_EMPTY: ReviewData = {"rating": None, "review_count": None, "source_url": None}


def _find_chrome() -> str:
    candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        shutil.which("google-chrome") or "",
        shutil.which("google-chrome-stable") or "",
        shutil.which("chrome") or "",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return ""


class ReviewEnricher:
    """Call get_rating() as many times as needed within one collection run,
    then always call close() when done (even on error paths)."""

    def __init__(self, timeout_sec: float = 3.0):
        self.timeout_sec = timeout_sec
        self._driver = None
        self._disabled = False
        self._start_attempted = False

    def _ensure_driver(self):
        if self._driver is not None or self._disabled:
            return self._driver
        if os.getenv("TESTING") or os.getenv("SKIP_LIVE_LOOKUPS"):
            self._disabled = True
            return None
        self._start_attempted = True
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            from selenium.webdriver.chrome.service import Service

            chrome_bin = _find_chrome()
            if not chrome_bin:
                print("[review_enrichment] Chrome not found -- skipping review enrichment for this run.")
                self._disabled = True
                return None

            opts = Options()
            opts.binary_location = chrome_bin
            opts.add_argument("--headless=new")
            opts.add_argument("--disable-gpu")
            opts.add_argument("--no-sandbox")
            opts.add_argument("--disable-dev-shm-usage")
            opts.add_argument("--window-size=1280,900")
            opts.add_argument(
                "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
            opts.page_load_strategy = "eager"
            opts.add_experimental_option("useAutomationExtension", False)

            try:
                driver = webdriver.Chrome(options=opts, service=Service())
            except Exception:
                driver = webdriver.Chrome(options=opts)
            driver.set_page_load_timeout(self.timeout_sec)
            driver.set_script_timeout(self.timeout_sec)
            self._driver = driver
            return driver
        except Exception as e:
            print(f"[review_enrichment] Could not start Chrome for review lookups: {type(e).__name__}: {e}")
            self._disabled = True
            return None

    def get_rating(self, name: str, city: Optional[str] = "", state: Optional[str] = "") -> ReviewData:
        """Looks up `name` on Google Maps and returns its rating/review count.
        Returns {"rating": None, "review_count": None, "source_url": None}
        on any failure -- never a fabricated value."""
        if not name:
            return dict(_EMPTY)

        driver = self._ensure_driver()
        if driver is None:
            return dict(_EMPTY)

        try:
            from urllib.parse import quote
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC

            query = " ".join(p for p in [name, city, state] if p)
            url = f"https://www.google.com/maps/search/{quote(query)}?hl=en"
            try:
                driver.get(url)
            except Exception:
                try:
                    driver.execute_script("window.stop();")
                except Exception:
                    pass

            try:
                WebDriverWait(driver, self.timeout_sec).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "h1"))
                )
            except Exception:
                return dict(_EMPTY)

            # A search often lands on a results *feed* (several candidates)
            # rather than a single business page -- the rating/review widgets
            # only render on the single-listing page, so open the first
            # feed result when we're not already on one.
            if "/maps/place/" not in driver.current_url:
                try:
                    links = driver.find_elements(By.CSS_SELECTOR, "a.hfpxzc")
                except Exception:
                    links = []
                if links:
                    href = links[0].get_attribute("href")
                    if href:
                        driver.get(href)
                        try:
                            WebDriverWait(driver, self.timeout_sec).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, "h1"))
                            )
                        except Exception:
                            return dict(_EMPTY)
                else:
                    # No results at all for this query.
                    return dict(_EMPTY)

            js = """
            let main = document.querySelector("div[role='main']");
            if (main) main.scrollTop = 300;
            let d = {};
            let ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
            d.rating = ratingEl ? ratingEl.innerText : "";
            // Google's markup for the review-count badge changes often, so
            // try a few known shapes rather than one brittle selector.
            let reviewEl = document.querySelector('div.F7nice span[aria-label*="review" i]')
                || document.querySelector('div.F7nice button[aria-label*="review" i]')
                || document.querySelector('[aria-label*="review" i][aria-label*="star" i]');
            d.reviews_label = reviewEl ? (reviewEl.getAttribute("aria-label") || "") : "";
            let fuc = document.querySelector('div.F7nice');
            d.f7nice_text = fuc ? fuc.innerText : "";
            return d;
            """
            time.sleep(1.0)
            raw = driver.execute_script(js) or {}

            rating_raw = (raw.get("rating") or "").strip().replace(",", ".")
            rating = None
            m = re.search(r"[\d.]+", rating_raw)
            if m:
                try:
                    rating = round(float(m.group(0)), 1)
                    if not (0 <= rating <= 5):
                        rating = None
                except ValueError:
                    rating = None

            review_count = None
            # Strategy 1: a labeled review-count element ("4.3 stars 363 Reviews").
            reviews_label = raw.get("reviews_label") or ""
            m2 = re.search(r"([\d,]+)\s*review", reviews_label, re.I)
            if m2:
                review_count = int(m2.group(1).replace(",", ""))
            # Strategy 2: parenthesized count in the widget's own text, e.g. "4.3(1,234)".
            if review_count is None:
                f7_text = raw.get("f7nice_text") or ""
                m3 = re.search(r"\(([\d,]+)\)", f7_text)
                if m3:
                    review_count = int(m3.group(1).replace(",", ""))

            if rating is None and review_count is None:
                return dict(_EMPTY)

            return {"rating": rating, "review_count": review_count, "source_url": driver.current_url}
        except Exception as e:
            print(f"[review_enrichment] Lookup failed for {name!r}: {type(e).__name__}: {e}")
            return dict(_EMPTY)

    def close(self):
        if self._driver is not None:
            try:
                self._driver.quit()
            except Exception:
                pass
            self._driver = None
