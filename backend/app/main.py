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
    try:
        return auth.create_user(db, user)
    except HTTPException:
        # Re-raise FastAPI's HTTPException to return the correct JSON response
        raise
    except Exception as e:
        # Log the error on the server but return a clean message to the client
        print(f"INTERNAL SIGNUP ERROR: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred. Please try again later."
        )

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
    assignment_id: str = Form(None), 
    subject_name: str = Form(None),
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
        similarity_score=similarity,
        subject_name=subject_name
    )

    db.add(new_assignment)
    db.commit()

    return {
        "message": "Handwriting verification complete",
        "similarity_score": similarity,
        "match_type": get_match_type(similarity)
    }

# -----------------------------
# STUDENT: UPLOAD REFERENCE IMAGES
# -----------------------------
@app.post("/upload-reference")
async def upload_reference(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    # Ensure role is student
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload reference images")

    saved_files = []
    folder = os.path.join(TRAIN_DIR, f"student_{current_user.username}")
    
    for file in files:
        file_path = save_upload_file(file, folder)
        
        new_reference = models.Assignment(
            student_username=current_user.username,
            image_path=file_path,
            is_reference=1,
            is_training=True,
            similarity_score=100.0
        )
        db.add(new_reference)
        saved_files.append(file_path)
    
    db.commit()
    
    return {
        "message": f"{len(saved_files)} reference images uploaded successfully",
        "paths": saved_files
    }

# -----------------------------
# TEACHER DASHBOARD
# -----------------------------
@app.get("/teacher/my-subjects")
def get_teacher_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("teacher"))
):
    return [s.name for s in current_user.subjects]

@app.get("/teacher/assignments")
def get_assignments(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("teacher"))
):
    # Get teacher's assigned subjects
    subject_names = [s.name for s in current_user.subjects]
    
    # Join assignments with user data and filter by subject
    query_result = db.query(models.Assignment, models.User).join(
        models.User, models.Assignment.student_username == models.User.username
    ).filter(
        models.Assignment.is_reference == 0,
        models.Assignment.subject_name.in_(subject_names) if subject_names else False
    ).all()

    data_list = []
    for assignment, student in query_result:
        data_list.append({
            "id": assignment.id,
            "student_name": student.name,
            "roll_number": student.roll_number,
            "subject_name": assignment.subject_name,
            "similarity": round(assignment.similarity_score, 2),
            "match_type": get_match_type(assignment.similarity_score),
            "date": assignment.created_at.strftime("%Y-%m-%d %H:%M") if assignment.created_at else "N/A",
            "image_url": f"/{assignment.image_path}",
            "status": assignment.status,
            "feedback": assignment.feedback
        })

    return {"data": data_list}

# -----------------------------
# STUDENT DASHBOARD ENDPOINTS
# -----------------------------
@app.get("/student/my-subjects")
def get_student_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("student"))
):
    # Return all subjects for the student's department
    subjects = db.query(models.Subject).filter(models.Subject.department == current_user.department).all()
    if not subjects:
        # Fallback: if no department match, show all subjects
        subjects = db.query(models.Subject).all()
    return [{"id": s.id, "name": s.name} for s in subjects]

@app.get("/student/my-assignments")
def get_student_assignments(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("student"))
):
    assignments = db.query(models.Assignment).filter(
        models.Assignment.student_username == current_user.username,
        models.Assignment.is_reference == 0
    ).all()
    
    return [
        {
            "id": a.id,
            "subject_name": a.subject_name,
            "similarity": round(a.similarity_score, 2),
            "status": a.status,
            "date": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "N/A",
            "image_url": f"/{a.image_path}"
        }
        for a in assignments
    ]

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
# ADMIN: STUDENT MANAGEMENT
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

@app.delete("/admin/students/{username}")
def delete_student(
    username: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    student = db.query(models.User).filter(models.User.username == username, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete all assignments and references for this student
    db.query(models.Assignment).filter(models.Assignment.student_username == username).delete()
    
    db.delete(student)
    db.commit()
    return {"message": f"Student {username} and all associated data deleted successfully"}

@app.get("/admin/students/{username}/references")
def get_student_references(
    username: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    refs = db.query(models.Assignment).filter(
        models.Assignment.student_username == username,
        models.Assignment.is_reference == 1
    ).order_by(models.Assignment.created_at.asc()).all()
    
    return [
        {"id": r.id, "image_url": f"/{r.image_path}", "created_at": r.created_at}
        for r in refs
    ]

@app.post("/admin/students/{username}/references")
async def add_student_reference(
    username: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    folder = os.path.join(TRAIN_DIR, f"student_{username}")
    file_path = save_upload_file(file, folder)
    
    new_ref = models.Assignment(
        student_username=username,
        image_path=file_path,
        is_reference=1,
        is_training=True,
        similarity_score=100.0
    )
    db.add(new_ref)
    db.commit()
    return {"message": "Reference added", "id": new_ref.id, "image_url": f"/{file_path}"}

@app.put("/admin/students/{username}/references/{ref_id}")
async def update_student_reference(
    username: str,
    ref_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    ref = db.query(models.Assignment).filter(
        models.Assignment.id == ref_id,
        models.Assignment.student_username == username
    ).first()
    
    if not ref:
        raise HTTPException(status_code=404, detail="Reference not found")
        
    # Save new file
    folder = os.path.dirname(ref.image_path)
    file_path = save_upload_file(file, folder)
    
    # Update path
    ref.image_path = file_path
    db.commit()
    
    return {"message": "Reference updated", "id": ref.id, "image_url": f"/{file_path}"}

@app.delete("/admin/students/{username}/references/{ref_id}")
def delete_student_reference(
    username: str,
    ref_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    ref = db.query(models.Assignment).filter(
        models.Assignment.id == ref_id,
        models.Assignment.student_username == username
    ).first()
    
    if not ref:
        raise HTTPException(status_code=404, detail="Reference not found")
        
    db.delete(ref)
    db.commit()
    return {"message": "Reference deleted"}

# -----------------------------
# ADMIN: FACULTY MANAGEMENT
# -----------------------------
@app.get("/admin/teachers")
def get_admin_teachers(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    teachers = db.query(models.User).filter(models.User.role == "teacher").all()
    return [
        {
            "username": t.username,
            "name": t.name,
            "department": t.department,
            "subjects": [s.name for s in t.subjects]
        }
        for t in teachers
    ]

@app.delete("/admin/teachers/{username}")
def delete_teacher(
    username: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    teacher = db.query(models.User).filter(models.User.username == username, models.User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    # Delete all associated subjects
    db.query(models.TeacherSubject).filter(models.TeacherSubject.teacher_username == username).delete()
    
    db.delete(teacher)
    db.commit()
    return {"message": f"Teacher {username} deleted successfully"}

@app.get("/admin/subjects")
def get_subjects(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    subjects = db.query(models.Subject).all()
    return subjects

@app.post("/admin/subjects")
def create_subject(
    subj: schemas.SubjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    db_subj = models.Subject(name=subj.name, department=subj.department)
    db.add(db_subj)
    try:
        db.commit()
        db.refresh(db_subj)
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Subject already exists")
    return db_subj

@app.delete("/admin/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    print(f"DEBUG: Delete subject request for ID: {subject_id}")
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Also delete associations in teacher_subjects
    db.query(models.TeacherSubject).filter(models.TeacherSubject.subject_id == subject_id).delete()
    
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}

@app.post("/admin/teachers/assign-subjects")
def assign_subjects(
    update_data: schemas.TeacherSubjectUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    teacher = db.query(models.User).filter(
        models.User.username == update_data.teacher_username,
        models.User.role == "teacher"
    ).first()
    
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    # Clear existing subjects
    db.query(models.TeacherSubject).filter(
        models.TeacherSubject.teacher_username == teacher.username
    ).delete()
    
    # Assign new subjects
    for sid in update_data.subject_ids:
        new_mapping = models.TeacherSubject(teacher_username=teacher.username, subject_id=sid)
        db.add(new_mapping)
        
    db.commit()
    return {"message": "Subjects assigned successfully"}

# -----------------------------
# ADMIN: UPLOAD TRAINING DATA (Legacy compat)
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