import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Clearing all tasks...")
    conn.execute(text("DELETE FROM tasks"))
    
    print("Clearing all non-reference assignments...")
    # Keep reference images (is_reference=1) for students, but delete submissions
    conn.execute(text("DELETE FROM assignments WHERE is_reference = 0"))
    
    conn.commit()
    print("Database cleared successfully!")

# Clean up physical files in uploads directory
uploads_dir = "uploads"
if os.path.exists(uploads_dir):
    print(f"Cleaning up files in {uploads_dir}...")
    for filename in os.listdir(uploads_dir):
        file_path = os.path.join(uploads_dir, filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
                print(f"Deleted: {filename}")
        except Exception as e:
            print(f"Error deleting {file_path}: {e}")

print("Clean-up complete!")
