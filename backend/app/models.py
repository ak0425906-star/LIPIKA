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


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    student_username = Column(String, ForeignKey("users.username"))
    image_path = Column(String)
    is_reference = Column(Integer, default=0)
    is_training = Column(Boolean, default=False)

    # Assignment metadata
    status = Column(String, default="pending")
    similarity_score = Column(Float, default=0.0)
    feedback = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to the User model
    student = relationship("User", back_populates="assignments")