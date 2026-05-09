import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Checking for task_name column in assignments...")
    try:
        conn.execute(text("ALTER TABLE assignments ADD COLUMN task_name VARCHAR"))
        conn.commit()
        print("Successfully added task_name to assignments.")
    except Exception as e:
        print(f"Failed or already exists: {e}")
        conn.rollback()

    print("Checking if tasks table exists...")
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                description TEXT,
                due_date VARCHAR,
                subject_name VARCHAR,
                teacher_username VARCHAR REFERENCES users(username)
            )
        """))
        conn.commit()
        print("Successfully ensured tasks table exists.")
    except Exception as e:
        print(f"Failed: {e}")
        conn.rollback()
