import os
import sys

# Ensure app is in Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models, auth, schemas

def create_initial_admin():
    # Ensure tables exist
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            print("Creating initial admin user...")
            admin_data = schemas.UserCreate(
                username="admin",
                name="System Administrator",
                password="adminMIC",
                role="admin",
                roll_number="ADMIN001",
                department="Computer Science"
            )
            auth.create_user(db, admin_data)
            print("Admin user created successfully.")
        else:
            print("Admin user already exists.")
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_admin()
