import os
import requests
from dotenv import load_dotenv

load_dotenv()
# I'll just check if the database query returns anything for CS
from sqlalchemy import create_engine, text
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    print("Checking subjects for department 'CS'...")
    res = conn.execute(text("SELECT name FROM subjects WHERE department = 'CS'"))
    rows = res.fetchall()
    print(f"Direct match: {rows}")
    
    if not rows:
        print("Fallback to all subjects...")
        res = conn.execute(text("SELECT name FROM subjects"))
        rows = res.fetchall()
        print(f"Fallback: {rows}")

    subject_names = [r[0] for r in rows]
    print(f"\nChecking tasks for subjects: {subject_names}")
    res = conn.execute(text("SELECT name, subject_name FROM tasks WHERE subject_name IN :subs"), {"subs": tuple(subject_names)})
    print(f"Tasks: {res.fetchall()}")
