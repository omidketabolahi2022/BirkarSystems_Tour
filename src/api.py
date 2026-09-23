from fastapi import FastAPI, Body, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func
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


# MPA functions

@app.get("/")
def rootPage():
    return FileResponse(WEB_DIR / "pages" / "auth.html")

@app.get("/auth")
def loginPage():
    return FileResponse(WEB_DIR / "pages" / "auth.html")

@app.get("/booker-home")
def bookerHomePage():
    return FileResponse(WEB_DIR / "pages" / "booker-home.html")

# -------------------
# OPEN APIs (no authentication)

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
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user_record.role
    }

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

@app.get("/api/tours")
def getAllTours(
    # current_user: AppUser = Depends(getCurrentUser),
    # TODO: should I make tour fetching protected?
    session: Session = Depends(getSession)
):
    tours_list = session.execute(select(Tour)).scalars().all()
    return {"tours": tours_list}


@app.get("/api/tours/available")
def getAvailableTours(
    # current_user: AppUser = Depends(getCurrentUser),
    session: Session = Depends(getSession)
):
    stmt = select(Tour).where(
        Tour.status == "pending",
        Tour.start_time > func.SYSDATETIME()
    )
    tours_list = session.execute(stmt).scalars().all()
    return {"tours": tours_list}

# ---------------------
# PROTECTED APIs


@app.get("/api/me")
def getMe(current_user: AppUser = Depends(getCurrentUser)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "number": current_user.number
    }

class UserUpdate(BaseModel):
    email: str | None = None
    number: str | None = None

@app.patch("/api/me")
def updateMe(
    updates: UserUpdate,
    current_user: AppUser = Depends(getCurrentUser),
    session: Session = Depends(getSession)
):
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    session.add(current_user)
    session.commit()
    return {
        "username": current_user.username,
        "email": current_user.email,
        "number": current_user.number
    }

@app.get("/api/me/bookings")
def getMyBookings(
    has_status: set[str] | None = Query(default=None),
    current_user: AppUser = Depends(getCurrentUser),
    session: Session = Depends(getSession)
):
    stmt = (
        select(Booking)
        .where(Booking.userID == current_user.userID)
        .options(joinedload(Booking.tour))
    )
    if has_status:
        stmt = stmt.where(Booking.status.in_(has_status))
    bookings_list = session.execute(stmt).scalars().all()
    bookings_list = [
        {
            "bookingID": b.bookingID,
            "tourID": b.tourID,
            "userID": b.userID,
            "booking_date": b.booking_date,
            "status": b.status,
            "num_people": b.num_people,
            "tour_name": b.tour.tour_name
        } for b in bookings_list
    ]
    return {"bookings": bookings_list}

@app.post("/api/me/bookings")
def createBooking(
    details: dict = Body(),
    current_user: AppUser = Depends(getCurrentUser),
    session: Session = Depends(getSession)
):
    tourID = details["tourID"]
    userID = current_user.userID
    status = "accepted"
    num_people = details["num_people"]
    booking_record = Booking(
        tourID=tourID,
        userID=userID,
        # booking date will be provided by the DBMS itself
        status=status,
        num_people=num_people
    )
    try:
        session.add(booking_record)
        session.commit()
        session.refresh(booking_record)
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="integrity issue")
    return {
        "bookingID": booking_record.bookingID,
        "tourID": booking_record.tourID,
        "tour_name": booking_record.tour.tour_name,
        "userID": booking_record.userID,
        "booking_date": booking_record.booking_date,
        "status": booking_record.status,
        "num_people": booking_record.num_people
    }

class BookingUpdate(BaseModel):
    status: str | None = None
    num_people: int | None = None

@app.patch("/api/me/bookings/{bookingID}")
def updateBooking(
    bookingID: int,
    updates: BookingUpdate,
    current_user: AppUser = Depends(getCurrentUser),
    session: Session = Depends(getSession)
):
    print(f"Received: {bookingID}")
    booking_record = session.get(Booking, bookingID)
    if not booking_record:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking_record.userID != current_user.userID:
        raise HTTPException(status_code=403, detail="The booking does not belong to you")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(booking_record, field, value)
    session.commit()
    return {
        "bookingID": booking_record.bookingID,
        "tourID": booking_record.tourID,
        "userID": booking_record.userID,
        "booking_date": booking_record.booking_date,
        "status": booking_record.status,
        "num_people": booking_record.num_people
    }
