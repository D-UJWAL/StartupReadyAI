from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150))
    email = Column(String(150), unique=True, index=True)
    mobile = Column(String(50))
    hashed_password = Column(String(255))
    designation = Column(String(100), nullable=True)
    startup_id = Column(Integer, ForeignKey("startups.id"), nullable=True)

    startup = relationship("Startup", back_populates="founders")

class Startup(Base):
    __tablename__ = "startups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True)
    industry = Column(String(100))
    stage = Column(String(50))
    description = Column(Text, nullable=True)
    registration_step = Column(Integer, default=1)
    registration_data = Column(Text, nullable=True)  # JSON blob
    evaluation_step = Column(Integer, default=1)

    founders = relationship("User", back_populates="startup")
    evaluations = relationship("Evaluation", back_populates="startup")
    documents = relationship("Document", back_populates="startup")

class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startups.id"))
    step = Column(Integer)
    score = Column(Integer, default=0)
    data = Column(Text)  # JSON of actual field values

    startup = relationship("Startup", back_populates="evaluations")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startups.id"))
    original_filename = Column(String(255))
    stored_filename = Column(String(255))
    doc_type = Column(String(100))
    file_url = Column(String(500))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    startup = relationship("Startup", back_populates="documents")
