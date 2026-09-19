from fastapi import FastAPI, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pwdlib import PasswordHash
from datetime import datetime, timezone, timedelta
from pathlib import Path
from db import *
import jwt
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"]
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="user/auth")
phash = PasswordHash.recommended()

WEB_DIR = Path(__file__).resolve().parent / "web"
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = os.getenv("JWT_ALG")


app.mount(
    "/static",
    StaticFiles(directory=WEB_DIR / "static"),
    name="static"
)

def createToken(username):
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


@app.get("/")
def homePage():
    return FileResponse(WEB_DIR / "pages" / "auth.html")

@app.get("/auth")
def loginPage():
    return FileResponse(WEB_DIR / "pages" / "auth.html")

@app.post("/api/signup", status_code=201)
def signupAppUser(
    details: dict = Body(),
    session: Session = Depends(getSession)
):
    username = details["username"].strip()
    raw_password = details["password"].strip()
    email = details.get("email").strip()
    number = details["number"].strip()
    role = details.get("role", "booker").strip()
    # TODO: this is a security risk as creating an admin role ('manager') is accessible to anyone
    new_user = AppUser(
        username=username,
        password=phash.hash(raw_password),
        email=email,
        number=number,
        role=role
    )
    try:
        session.add(new_user)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="integrity issue")
    return {"username": new_user.username}
