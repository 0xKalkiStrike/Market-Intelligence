import urllib.request
import re

url = "https://market-intelligence-frontend-1l3f.onrender.com/login"
req = urllib.request.urlopen(url)
html = req.read().decode("utf-8")

scripts = re.findall(r'/_next/static/chunks/[^"\']+\.js', html)
print(f"Found {len(scripts)} chunk scripts in page")

found_target = False
for s in scripts:
    s_url = f"https://market-intelligence-frontend-1l3f.onrender.com{s}"
    try:
        content = urllib.request.urlopen(s_url).read().decode("utf-8", errors="ignore")
        if "market-intelligence-backend-2afj.onrender.com" in content:
            print(f"SUCCESS: Found public backend URL in {s}")
            found_target = True
            break
        elif "market-intelligence-backend-2afj" in content:
            print(f"OLD: Found internal backend URL without .onrender.com in {s}")
    except Exception as e:
        print(f"Error reading {s}: {e}")

if not found_target:
    print("New build has not finished deploying yet or is in progress.")
