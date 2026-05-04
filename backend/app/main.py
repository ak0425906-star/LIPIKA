import os
import shutil
import uuid
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from gradio_client import Client, handle_file

# Load environment variables
load_dotenv()

# Internal project imports
from .database import engine, SessionLocal
from . import models, schemas, auth
from .dependencies import require_role

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lipika Backend API")

# -----------------------------
# CORS SETTINGS (The Connection Bridge)
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Lovable and local testing
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# STATIC FILES SETUP
# -----------------------------
# Creating folders if they don't exist
UPLOAD_DIR = "uploads"
TRAIN_DIR = "training_data"

for folder in [UPLOAD_DIR, TRAIN_DIR]:
    if not os.path.exists(folder):
        os.makedirs(folder)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/training_data", StaticFiles(directory=TRAIN_DIR), name="training_data")

# -----------------------------
# DATABASE SESSION
# -----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------------------
# AUTHENTICATION
# -----------------------------
@app.get("/")
def read_root():
    return {"message": "Lipika Backend is active and running", "status": "online"}

@app.post("/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    print("Executing new signup logic without email...")
    try:
        return auth.create_user(db, user)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        raise HTTPException(status_code=400, detail=str(tb))

@app.post("/login")
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    # We now pass user_data.role here
    user = auth.authenticate_user(
        db, 
        user_data.username, 
        user_data.password, 
        user_data.role
    )
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Invalid credentials or incorrect role selected"
        )
    
    token = auth.create_access_token(data={"sub": str(user.username)})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "roll_number": user.roll_number,
            "department": user.department,
            "year": user.year
        }
    }

# -----------------------------
# UTILITIES
# -----------------------------
def get_match_type(score: float):
    if score >= 85: # Tightened thresholds for better accuracy
        return "Strong Match"
    elif score >= 60:
        return "Moderate Match"
    return "Weak Match"

def save_upload_file(upload_file: UploadFile, destination_folder: str) -> str:
    # Ensure the destination folder exists
    if not os.path.exists(destination_folder):
        os.makedirs(destination_folder)
    unique_filename = f"{uuid.uuid4()}_{upload_file.filename}"
    file_path = os.path.join(destination_folder, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return file_path

# -----------------------------
# STUDENT: UPLOAD ASSIGNMENT
# -----------------------------
@app.post("/upload-assignment")
async def upload_assignment(
    file: UploadFile = File(...),
    assignment_id: str = Form(None), # Added as optional for Lovable compatibility
    db: Session = Depends(get_db),
    current_user = Depends(require_role("student"))
):
    file_path = save_upload_file(file, UPLOAD_DIR)

    # Check for existing reference
    reference = db.query(models.Assignment).filter(
        models.Assignment.student_username == current_user.username,
        models.Assignment.is_reference == 1
    ).first()

    # If first time, this becomes the master reference
    if reference is None:
        new_assignment = models.Assignment(
            student_username=current_user.username,
            image_path=file_path,
            is_reference=1,
            is_training=True,
            similarity_score=100.0
        )
        db.add(new_assignment)
        db.commit()
        return {
            "message": "First submission: Reference handwriting saved.",
            "similarity_score": 100.0,
            "match_type": "Reference"
        }

    # Compare against reference using Hugging Face
    try:
        client = Client("thanoxz/ml-api")
        result = client.predict(
            handle_file(reference.image_path),
            handle_file(file_path),
            api_name="/compare_handwriting"
        )
        similarity = float(result) if not isinstance(result, list) else float(result[0])
    except Exception as e:
        print(f"ML API Error: {e}")
        similarity = 0.0

    new_assignment = models.Assignment(
        student_username=current_user.username,
        image_path=file_path,
        is_reference=0,
        is_training=False,
        similarity_score=similarity
    )

    db.add(new_assignment)
    db.commit()

    return {
        "message": "Handwriting verification complete",
        "similarity_score": similarity,
        "match_type": get_match_type(similarity)
    }

# -----------------------------
# TEACHER DASHBOARD
# -----------------------------
@app.get("/teacher/assignments")
def get_assignments(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("teacher"))
):
    # Join assignments with user data to show names in the dashboard
    query_result = db.query(models.Assignment, models.User).join(
        models.User, models.Assignment.student_username == models.User.username
    ).filter(models.Assignment.is_reference == 0).all()

    data_list = []
    for assignment, student in query_result:
        data_list.append({
            "id": assignment.id,
            "student_name": student.name,
            "roll_number": student.roll_number,
            "similarity": round(assignment.similarity_score, 2),
            "match_type": get_match_type(assignment.similarity_score),
            "date": assignment.created_at.strftime("%Y-%m-%d %H:%M") if assignment.created_at else "N/A",
            "image_url": f"/{assignment.image_path}"
        })

    return {"data": data_list}

# -----------------------------
# TEACHER: REVIEW ASSIGNMENT
# -----------------------------
@app.put("/teacher/assignments/{assignment_id}/review")
def review_assignment(
    assignment_id: int,
    review_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("teacher"))
):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Update the fields based on what the teacher sent
    if "status" in review_data:
        assignment.status = review_data["status"]
    
    if "feedback" in review_data:
        assignment.feedback = review_data["feedback"]
    
    # Save changes to DB
    db.commit()
    db.refresh(assignment)
    
    return {
        "status": "success", 
        "message": f"Assignment {assignment_id} is now {assignment.status}"
    }

# -----------------------------
# ADMIN: GET ALL STUDENTS
# -----------------------------
@app.get("/admin/students")
def get_admin_students(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    students = db.query(models.User).filter(models.User.role == "student").all()
    return [
        {
            "username": s.username,
            "name": s.name,
            "roll_number": s.roll_number,
            "department": s.department,
            "year": s.year
        }
        for s in students
    ]

# -----------------------------
# ADMIN: UPLOAD TRAINING DATA
# -----------------------------
@app.post("/admin/upload-training-by-roll/{roll_number}")
def upload_training_by_roll(
    roll_number: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    student = db.query(models.User).filter(
        models.User.roll_number == roll_number,
        models.User.role == "student"
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student roll number not found")

    folder = os.path.join(TRAIN_DIR, f"student_{student.username}")
    file_path = save_upload_file(file, folder)

    new_training = models.Assignment(
        student_username=student.username,
        image_path=file_path,
        is_reference=0,
        is_training=True,
        similarity_score=100.0
    )
    
    db.add(new_training)
    db.commit()

    return {"message": f"Training data added for {student.name}", "path": file_path}