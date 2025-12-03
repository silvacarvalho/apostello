from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('SELECT * FROM alembic_version'))
    rows = list(result)
    print(f"Total rows: {len(rows)}")
    for row in rows:
        print(row)