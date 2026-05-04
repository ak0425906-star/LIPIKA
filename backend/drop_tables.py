import os
import sys

# Ensure app is in Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from app import models

def drop_all_tables():
    print("Dropping all tables...")
    models.Base.metadata.drop_all(bind=engine)
    print("Tables dropped successfully.")

if __name__ == "__main__":
    drop_all_tables()
