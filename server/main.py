from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/send_message")
async def send_message(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message", "")
        
        
        # Пока просто возвращаем статический ответ
        bot_response = "Example task: Write a function that finds the factorial of a number."
        
        return JSONResponse({"response": bot_response})
    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
