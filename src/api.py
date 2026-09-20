from fastapi import FastAPI, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
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
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")
phash = PasswordHash.recommended()

WEB_DIR = Path(__file__).resolve().parent / "web"
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = os.getenv("JWT_ALG")


app.mount(
    "/static",
    StaticFiles(directory=WEB_DIR / "static"),
    name="static"
)


def getCurrentUser(
        token: str = Depends(oauth2_scheme),
        session: Session = Depends(getSession)
):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="empty username")
        username = username.strip()
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid token")
    stmt = select(AppUser).where(AppUser.username == username)
    current_user = session.execute(stmt).scalar_one_or_none()
    print(current_user)
    if not current_user:
        raise HTTPException(status_code=401, detail="user no longer exists")
    return current_user

def createToken(username, role, minutes=30):
    payload = {
        "sub": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


@app.get("/")
def rootPage():
    return FileResponse(WEB_DIR / "pages" / "auth.html")

@app.get("/auth")
def loginPage():
    return FileResponse(WEB_DIR / "pages" / "auth.html")

@app.get("/booker-home")
def bookerHomePage():
    return FileResponse(WEB_DIR / "pages" / "booker-home.html")

@app.post("/api/login")
def loginAppUser(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(getSession)
):
    username = form_data.username.strip()
    raw_password = form_data.password.strip()
    stmt = select(AppUser).where(AppUser.username == username)
    user_record = session.execute(stmt).scalar_one_or_none()
    if not user_record:
        raise HTTPException(status_code=401, detail="the username is wrong")
    if not phash.verify(raw_password, user_record.password):
        raise HTTPException(status_code=401, detail="the password is wrong")
    token = createToken(user_record.username, user_record.role)
    return {"access_token": token, "token_type": "bearer"}

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
