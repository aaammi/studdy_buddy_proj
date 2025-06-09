from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import List, Optional
import json
import openai  

app = FastAPI()

# test
@app.get("/ping")
async def ping():
    return {"message": "pong"}
