from pydantic import BaseModel, ConfigDict
from typing import Optional


# -----------------------------
# USER SCHEMAS
# -----------------------------

class UserCreate(BaseModel):
    name: str
    username: str      # This can be their email or a unique ID
    roll_number: str
    password: str
    department: str    # Department
    role: str          # 'student', 'teacher', or 'admin'
    year: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str
    role: str          # Added as per your plan


class UserOut(BaseModel):
    name: str
    username: str
    role: str
    roll_number: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None

    # Modern Pydantic v2 way to handle SQLAlchemy models
    model_config = ConfigDict(from_attributes=True)


class SubjectBase(BaseModel):
    name: str
    department: str

class SubjectCreate(SubjectBase):
    pass

class SubjectOut(SubjectBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TeacherSubjectUpdate(BaseModel):
    teacher_username: str
    subject_ids: list[int]