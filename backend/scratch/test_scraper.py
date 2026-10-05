import httpx
import re
from urllib.parse import unquote, urlparse

client = httpx.Client(headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

category = "Dispensary"
location = "Pennsylvania"

queries = [
    f"{category} {location}",
    f"{category} {location} directory",
    f"{category} {location} listings",
    f"top {category} in {location}",
    f"best {category} in {location}",
    f"{category} services near {location}",
]

seen_domains = set()
entities = []

for q in queries:
    for offset in (0, 30, 60):
        try:
            r = client.post("https://html.duckduckgo.com/html/", data={"q": q, "s": str(offset)}, timeout=5.0)
            if r.status_code == 200:
                html = r.text
                matches = re.findall(
                    r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>.*?(?:<a[^>]+class="result__snippet"[^>]*>(.*?)</a>|<td[^>]+class="result__snippet"[^>]*>(.*?)</td>|)',
                    html,
                    re.DOTALL
                )
                for href, raw_title, snip1, snip2 in matches:
                    title = re.sub(r'<[^>]+>', '', raw_title).strip()
                    snippet = re.sub(r'<[^>]+>', '', snip1 or snip2 or "").strip()
                    target_url = href
                    if "uddg=" in href:
                        target_url = unquote(href.split("uddg=")[1].split("&")[0])
                    elif href.startswith("//"):
                        target_url = "https:" + href
                    if not target_url.startswith("http"):
                        continue
                    domain = urlparse(target_url).netloc.lower().replace("www.", "")
                    if not domain or domain in seen_domains:
                        continue
                    seen_domains.add(domain)
                    name = title.split("-")[0].split("|")[0].split(":")[0].strip()
                    name = re.sub(r'^\d+[\s\.\)]+', '', name).strip()
                    if len(name) >= 2:
                        entities.append({"name": name, "url": target_url, "snippet": snippet[:60]})
        except Exception as e:
            pass

print(f"Total Unique Entities Scraped: {len(entities)}")
for e in entities[:10]:
    print(" -", e["name"], "(", e["url"], ")")
