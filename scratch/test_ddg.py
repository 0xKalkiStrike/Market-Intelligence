import asyncio
import httpx
import re

async def main():
    client = httpx.AsyncClient(follow_redirects=True)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
    
    records = []
    seen = set()
    for s in ['0', '20', '40', '60', '80']:
        r = await client.post('https://lite.duckduckgo.com/lite/', data={'q': 'Dispensaries Pennsylvania', 's': s}, headers=headers)
        anchors = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r.text, re.DOTALL)
        for href, text in anchors:
            clean_t = re.sub(r'<[^>]+>', '', text).strip()
            if href.startswith('http') and href not in seen and 'duckduckgo' not in href:
                seen.add(href)
                records.append((clean_t, href))
    
    print(f"TOTAL UNIQUE WEB RECORDS HARVESTED: {len(records)}")
    for title, url in records[:10]:
        print(f" - {title[:50]} -> {url}")

if __name__ == "__main__":
    asyncio.run(main())
