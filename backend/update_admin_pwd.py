import os
import sys

# Ensure app is in Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app import models, auth

def update_admin_password():
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if admin:
            print("Updating admin password...")
            # Use the same hashing logic as in auth.create_user
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin.password = pwd_context.hash("adminMIC")
            db.commit()
            print("Admin password updated successfully.")
        else:
            print("Admin user not found.")
    finally:
        db.close()

if __name__ == "__main__":
    update_admin_password()
