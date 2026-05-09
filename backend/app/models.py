from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    username = Column(String, primary_key=True, index=True)
    name = Column(String)
    password = Column(String, unique=True, nullable=False)
    role = Column(String)

    roll_number = Column(String)
    department = Column(String)
    year = Column(String)

    # Relationship to Assignment model
    assignments = relationship("Assignment", back_populates="student")
    # Subjects assigned to this teacher
    subjects = relationship("Subject", secondary="teacher_subjects", back_populates="teachers")


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    department = Column(String)
    
    teachers = relationship("User", secondary="teacher_subjects", back_populates="subjects")


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"
    id = Column(Integer, primary_key=True, index=True)
    teacher_username = Column(String, ForeignKey("users.username"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    student_username = Column(String, ForeignKey("users.username"))
    image_path = Column(String)
    is_reference = Column(Integer, default=0)
    is_training = Column(Boolean, default=False)
    
    # Link assignment to a specific subject and task
    subject_name = Column(String, nullable=True)
    task_name = Column(String, nullable=True)

    # Assignment metadata
    status = Column(String, default="pending")
    similarity_score = Column(Float, default=0.0)
    feedback = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to the User model
    student = relationship("User", back_populates="assignments")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    due_date = Column(String)
    subject_name = Column(String)
    teacher_username = Column(String, ForeignKey("users.username"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))