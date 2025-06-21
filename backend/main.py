import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, Depends, Security
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from database import (
    init_db, register_user, verify_user, verify_admin, update_score, 
    get_inactive_users, save_syllabus, get_syllabus, get_hint
)
from models import (
    UserRegister, UserLogin, AdminLogin, UserUpdateScore, InactiveUser, 
    Syllabus, CodeSubmission
)

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

# JWT setup
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Security(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# OpenRouter setup
def get_api_key():
    key = os.getenv('OPENROUTER_API_KEY')
    if not key:
        raise RuntimeError('OPENROUTER_API_KEY environment variable not set')
    return key

API_URL = 'https://openrouter.ai/api/v1/chat/completions'

def call_openrouter(prompt: str, timeout: int = 30) -> dict:
    headers = {
        'Authorization': f"Bearer {get_api_key()}",
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        'messages': [{'role': 'user', 'content': prompt}]
    }
    response = requests.post(API_URL, json=payload, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()

@app.on_event("startup")
def startup():
    init_db()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/register", status_code=201)
async def register(user: UserRegister):
    try:
        register_user(user.email, user.login, user.password)
        return {"message": "User registered successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(user: UserLogin):
    try:
        user_data = verify_user(user.email, user.password)
        token = create_access_token(data={"sub": str(user_data["user_id"])})
        return {"message": "Login successful", "user_id": user_data["user_id"], "access_token": token}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/admin-login")
async def admin_login(admin: AdminLogin):
    try:
        if verify_admin(admin.password):
            token = create_access_token(data={"sub": "admin"})
            return {"message": "Admin login successful", "access_token": token}
        raise ValueError("Invalid admin password")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/update-score")
async def update_user_score(data: UserUpdateScore, current_user: dict = Depends(get_current_user)):
    update_score(data.user_id, data.points)
    return {"message": "Score updated successfully"}

@app.get("/inactive-users", response_model=list[InactiveUser])
async def get_inactive(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_id") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = get_inactive_users()
    return [{"user_id": user[1], "email": user[0], "login": user[2]} for user in users]

@app.get("/get_syllabus")
async def get_syllabus_endpoint():
    topics = get_syllabus()
    return {"topics": topics}

@app.post("/save_syllabus")
async def save_syllabus_endpoint(syllabus: Syllabus, current_user: dict = Depends(get_current_user)):
    if current_user.get("user_id") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    save_syllabus(syllabus.topics)
    return {"message": "Syllabus saved successfully"}

@app.get("/generate_task")
async def generate_task(topic: str, difficulty: str, current_user: dict = Depends(get_current_user)):
    prompt = (
        f"Create one Python programming task on '{topic}' with '{difficulty}' difficulty. "
        "Respond with only the task description. Include a sample input and expected output to illustrate the task."
    )
    try:
        result = call_openrouter(prompt)
        task = result['choices'][0]['message']['content'].strip()
        return {"message": task}
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        raise HTTPException(status_code=500, detail=str(http_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/submit_code")
async def submit_code(submission: CodeSubmission, current_user: dict = Depends(get_current_user)):
    prompt = (
        f"Task topic: {submission.topic}\nDifficulty: {submission.difficulty}\n"
        f"User code:\n```python\n{submission.code}\n```\n"
        "Evaluate the code for correctness. Return a JSON object with 'correct': boolean and 'feedback': string."
    )
    try:
        result = call_openrouter(prompt)
        evaluation = result['choices'][0]['message']['content'].strip()
        import json
        eval_json = json.loads(evaluation) 
        if eval_json.get("correct"):
            update_score(int(current_user["user_id"]), 10)
        return {"message": eval_json}
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        raise HTTPException(status_code=500, detail=str(http_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_hint")
async def get_hint(topic: str, difficulty: str, current_user: dict = Depends(get_current_user)):
    prompt = (
        f"Provide a hint for a Python programming task on '{topic}' with '{difficulty}' difficulty. "
        "Keep the hint concise and helpful without revealing the full solution."
    )
    try:
        result = call_openrouter(prompt)
        hint = result['choices'][0]['message']['content'].strip()
        return {"message": hint}
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        raise HTTPException(status_code=500, detail=str(http_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
