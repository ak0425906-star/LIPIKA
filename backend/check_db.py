import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("--- Users ---")
    res = conn.execute(text("SELECT username, role FROM users"))
    for row in res:
        print(row)
    
    print("\n--- Subjects ---")
    res = conn.execute(text("SELECT name FROM subjects"))
    for row in res:
        print(row)

    print("\n--- Teacher-Subjects ---")
    res = conn.execute(text("SELECT teacher_username, subject_id FROM teacher_subjects"))
    for row in res:
        print(row)
