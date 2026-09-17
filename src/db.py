from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session
from dotenv import load_dotenv
import os


def _buildURL():
    DB_URL = os.getenv("DB_URL")
    if not DB_URL:
        raise ValueError("database url is not set")
    return DB_URL


class Base(DeclarativeBase):
    pass

class Tour(Base):
    __tablename__ = "Tour"


class TourImg(Base):
    __tablename__ = "TourImg"


class AppUser(Base):
    __tablename__ = "AppUser"


class Booking(Base):
    __tablename__ = "Booking"


class SupportThread(Base):
    __tablename__ = "SupportThread"


class SupportMessage(Base):
    __tablename__ = "SupportMessage"


load_dotenv()
ENGINE = create_engine(_buildURL())


def getSession():
    session = Session(ENGINE)
    try:
        yield session
    finally:
        session.close()
