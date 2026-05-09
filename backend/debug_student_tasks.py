import os
import requests
from dotenv import load_dotenv

load_dotenv()
# I'll just check the DB query for tasks for test1
from sqlalchemy import create_engine, text
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    print("Checking tasks for test1...")
    # Get subjects
    res = conn.execute(text("SELECT name FROM subjects"))
    subjects = [r[0] for r in res.fetchall()]
    print(f"Subjects: {subjects}")
    
    # Get tasks
    res = conn.execute(text("SELECT id, name, subject_name FROM tasks WHERE subject_name IN :subs"), {"subs": tuple(subjects)})
    tasks = res.fetchall()
    print(f"Tasks: {tasks}")
