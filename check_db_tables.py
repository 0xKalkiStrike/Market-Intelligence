import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'market_intelligence.db')
if not os.path.exists(db_path):
    db_path = 'c:/hacker/Market-Intelligence/backend/market_intelligence.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
tables = [t[0] for t in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print(f"Total tables: {len(tables)}")
for t in sorted(tables):
    count = cursor.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    print(f"{t}: {count}")
conn.close()
