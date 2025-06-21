from pydantic import BaseModel, EmailStr
from typing import List

class Syllabus(BaseModel):
    topics: List[str]

class CodeSubmission(BaseModel):
    topic: str
    difficulty: str
    code: str

class UserRegister(BaseModel):
    email: EmailStr
    login: str
    password: str

class UserUpdateScore(BaseModel):
    user_id: int
    points: int

class InactiveUser(BaseModel):
    user_id: int
    email: EmailStr
    login: str
