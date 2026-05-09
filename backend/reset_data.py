import os
import shutil
from sqlalchemy import create_engine, MetaData, Table, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

# Connect to the database
engine = create_engine(DATABASE_URL)

def reset_database():
    print("Resetting database tables...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Delete user-generated content first (foreign keys)
            conn.execute(text("DELETE FROM assignments"))
            conn.execute(text("DELETE FROM tasks"))
            conn.execute(text("DELETE FROM teacher_subjects"))
            conn.execute(text("DELETE FROM subjects"))
            
            # Delete all users EXCEPT admins
            conn.execute(text("DELETE FROM users WHERE role != 'admin'"))
            
            trans.commit()
            print("Database tables cleared successfully (Admins preserved).")
        except Exception as e:
            trans.rollback()
            print(f"Error resetting database: {e}")

def clear_folders():
    folders = ["backend/uploads", "backend/training_data"]
    print(f"Clearing files in {folders}...")
    
    for folder in folders:
        if not os.path.exists(folder):
            continue
            
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                print(f"Deleted: {file_path}")
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')

if __name__ == "__main__":
    reset_database()
    clear_folders()
    print("\nSystem Reset Complete. LIPIKA is now clean.")
