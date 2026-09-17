from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    mobile: Optional[str] = None
    startup_id: Optional[int] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class StartupCreate(BaseModel):
    name: str
    industry: str
    stage: str
    registration_step: Optional[int] = 1
    registration_data: Optional[str] = None
    evaluation_step: Optional[int] = 1

class StartupResponse(BaseModel):
    id: int
    name: str
    industry: str
    stage: str
    registration_step: Optional[int] = 1
    registration_data: Optional[str] = None
    evaluation_step: Optional[int] = 1
    class Config:
        from_attributes = True

class StartupUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    stage: Optional[str] = None
    registration_step: Optional[int] = None
    registration_data: Optional[str] = None
    evaluation_step: Optional[int] = None

class EvaluationCreate(BaseModel):
    step: int
    score: int
    data: str

class EvaluationResponse(BaseModel):
    id: int
    step: int
    score: int
    data: str
    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    startup_id: int
    original_filename: str
    stored_filename: str
    doc_type: str
    file_url: str
    uploaded_at: Optional[datetime] = None
    class Config:
        from_attributes = True
