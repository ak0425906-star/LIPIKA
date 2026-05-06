import os
import sys
import json
from sqlalchemy.orm import Session

# Ensure app is in Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app import models

def get_database_summary():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        subjects = db.query(models.Subject).all()
        assignments = db.query(models.Assignment).all()
        teacher_subjects = db.query(models.TeacherSubject).all()

        data = {
            "users": [
                {
                    "username": u.username,
                    "name": u.name,
                    "role": u.role,
                    "roll_number": u.roll_number,
                    "department": u.department,
                    "year": u.year
                } for u in users
            ],
            "subjects": [
                {
                    "id": s.id,
                    "name": s.name,
                    "department": s.department
                } for s in subjects
            ],
            "assignments": [
                {
                    "id": a.id,
                    "student_username": a.student_username,
                    "image_path": a.image_path,
                    "is_reference": a.is_reference,
                    "is_training": a.is_training,
                    "subject_name": a.subject_name,
                    "status": a.status,
                    "similarity_score": a.similarity_score,
                    "created_at": str(a.created_at)
                } for a in assignments
            ],
            "teacher_subjects": [
                {
                    "teacher_username": ts.teacher_username,
                    "subject_id": ts.subject_id
                } for ts in teacher_subjects
            ]
        }
        print(json.dumps(data, indent=2))
    finally:
        db.close()

if __name__ == "__main__":
    get_database_summary()
