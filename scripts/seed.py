"""
Seed script: creates a demo org, user, and uploads sample CSV data.
Run: python scripts/seed.py
Requires: SYNC_DATABASE_URL in env or .env file
"""
import os
import sys
import uuid
import json
from datetime import date, timedelta
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../backend/.env"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from passlib.context import CryptContext

DATABASE_URL = os.environ.get("SYNC_DATABASE_URL", "postgresql://postgres:changeme@localhost:5432/bi_saas")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

engine = create_engine(DATABASE_URL)

DEMO_ORG_ID = str(uuid.uuid4())
DEMO_USER_ID = str(uuid.uuid4())
DEMO_DATASET_ID = str(uuid.uuid4())

def generate_sales_data() -> list[dict]:
    """Generate 365 days of synthetic sales data."""
    rows = []
    base_revenue = 10000
    products = ["Widget A", "Widget B", "Service Pro", "Enterprise Plan", "Starter Kit"]
    regions = ["North", "South", "East", "West"]
    for i in range(365):
        day = date(2024, 1, 1) + timedelta(days=i)
        seasonal = 1 + 0.3 * (i % 90) / 90
        noise = random.uniform(0.8, 1.2)
        rows.append({
            "date": str(day),
            "revenue": round(base_revenue * seasonal * noise, 2),
            "units_sold": random.randint(50, 200),
            "product": random.choice(products),
            "region": random.choice(regions),
            "customer_count": random.randint(10, 80),
            "refunds": random.randint(0, 5),
        })
    return rows

def seed():
    with Session(engine) as session:
        # Check if already seeded
        existing = session.execute(text("SELECT id FROM organizations WHERE slug = 'demo-company'")).fetchone()
        if existing:
            print("Demo data already exists. Skipping.")
            return

        # Organization
        session.execute(text("""
            INSERT INTO organizations (id, name, slug, plan, is_active, created_at, updated_at)
            VALUES (:id, :name, :slug, :plan, true, now(), now())
        """), {"id": DEMO_ORG_ID, "name": "Demo Company", "slug": "demo-company", "plan": "pro"})

        # User
        session.execute(text("""
            INSERT INTO users (id, email, hashed_password, full_name, is_active, is_superadmin, email_verified, created_at, updated_at)
            VALUES (:id, :email, :hashed_password, :full_name, true, false, true, now(), now())
        """), {
            "id": DEMO_USER_ID,
            "email": "demo@example.com",
            "hashed_password": pwd_context.hash("Demo1234"),
            "full_name": "Demo User",
        })

        # Membership
        session.execute(text("""
            INSERT INTO memberships (id, user_id, organization_id, role, created_at, updated_at)
            VALUES (:id, :user_id, :org_id, 'admin', now(), now())
        """), {"id": str(uuid.uuid4()), "user_id": DEMO_USER_ID, "org_id": DEMO_ORG_ID})

        # Dataset
        schema = {
            "columns": [
                {"name": "date", "dtype": "datetime", "nullable": False, "sample_values": ["2024-01-01"], "is_numeric": False},
                {"name": "revenue", "dtype": "numeric", "nullable": False, "sample_values": [10000], "is_numeric": True},
                {"name": "units_sold", "dtype": "numeric", "nullable": False, "sample_values": [100], "is_numeric": True},
                {"name": "product", "dtype": "string", "nullable": False, "sample_values": ["Widget A"], "is_numeric": False},
                {"name": "region", "dtype": "string", "nullable": False, "sample_values": ["North"], "is_numeric": False},
                {"name": "customer_count", "dtype": "numeric", "nullable": False, "sample_values": [40], "is_numeric": True},
                {"name": "refunds", "dtype": "numeric", "nullable": False, "sample_values": [2], "is_numeric": True},
            ]
        }

        rows = generate_sales_data()
        session.execute(text("""
            INSERT INTO datasets (id, organization_id, uploaded_by, name, description, file_type, file_size_bytes, row_count, column_count, schema_definition, status, statistics, created_at, updated_at)
            VALUES (:id, :org_id, :user_id, :name, :desc, 'csv', 65536, :row_count, 7, :schema, 'ready', '{}', now(), now())
        """), {
            "id": DEMO_DATASET_ID,
            "org_id": DEMO_ORG_ID,
            "user_id": DEMO_USER_ID,
            "name": "Sales Data 2024",
            "desc": "Demo sales dataset with revenue, units, and regional breakdown",
            "row_count": len(rows),
            "schema": json.dumps(schema),
        })

        # Insert rows in batches
        batch = [{"id": str(uuid.uuid4()), "dataset_id": DEMO_DATASET_ID, "row_index": i, "data": json.dumps(r)} for i, r in enumerate(rows)]
        for chunk in [batch[i:i+200] for i in range(0, len(batch), 200)]:
            session.execute(text("""
                INSERT INTO dataset_rows (id, dataset_id, row_index, data)
                VALUES (:id, :dataset_id, :row_index, CAST(:data AS jsonb))
            """), chunk)

        session.commit()
        print("✓ Seeded demo data")
        print(f"  Email:    demo@example.com")
        print(f"  Password: Demo1234")
        print(f"  Org:      Demo Company (slug: demo-company)")

if __name__ == "__main__":
    seed()
