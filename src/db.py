from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    create_engine,
    func,
)
from sqlalchemy.dialects.mssql import (
    DATETIME2,
    DECIMAL,
    INTEGER,
    NVARCHAR,
    VARCHAR,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
)
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv
import os

# TODO: should we also add the UNIQUE INDEX to each table?


def _buildURL():
    DB_URL = os.getenv("DB_URL")
    if not DB_URL:
        raise ValueError("database url is not set")
    return DB_URL


class Base(DeclarativeBase):
    pass


class Tour(Base):
    __tablename__ = "Tour"

    tourID: Mapped[int] = mapped_column(
        INTEGER,
        primary_key=True,
    )

    tour_name: Mapped[str] = mapped_column(
        NVARCHAR(50),
        nullable=False,
    )

    source: Mapped[str] = mapped_column(
        NVARCHAR(50),
        nullable=False,
    )

    destination: Mapped[str] = mapped_column(
        NVARCHAR(50),
        nullable=False,
    )

    start_time: Mapped[datetime] = mapped_column(
        DATETIME2,
        nullable=False,
    )

    day_length: Mapped[int] = mapped_column(
        INTEGER,
        nullable=False,
    )

    capacity: Mapped[int] = mapped_column(
        INTEGER,
        nullable=False,
    )

    price: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        VARCHAR(10),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        NVARCHAR(255),
        nullable=True,
    )

    images: Mapped[list["TourImg"]] = relationship(
        "TourImg",
        back_populates="tour",
        passive_deletes=True,
    )

    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="tour",
    )

    support_threads: Mapped[list["SupportThread"]] = relationship(
        "SupportThread",
        back_populates="tour",
    )

    __table_args__ = (
        CheckConstraint("capacity > 0"),
        CheckConstraint("price > 0"),
        CheckConstraint("day_length > 0"),
        CheckConstraint(
            "status IN ('canceled', 'passed', 'pending')"
        ),
    )


class TourImg(Base):
    __tablename__ = "TourImg"

    imageID: Mapped[int] = mapped_column(
        INTEGER,
        primary_key=True,
    )

    tourID: Mapped[int] = mapped_column(
        INTEGER,
        ForeignKey(
            "Tour.tourID",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    path: Mapped[str] = mapped_column(
        NVARCHAR(255),
        nullable=False,
    )

    label: Mapped[str] = mapped_column(
        VARCHAR(9),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        NVARCHAR(255),
        nullable=True,
    )

    tour: Mapped["Tour"] = relationship(
        "Tour",
        back_populates="images",
    )

    __table_args__ = (
        CheckConstraint(
            "label IN ('banner', 'secondary', 'ext')"
        ),
    )


class AppUser(Base):
    __tablename__ = "AppUser"

    userID: Mapped[int] = mapped_column(
        INTEGER,
        primary_key=True,
    )

    username: Mapped[str] = mapped_column(
        VARCHAR(50),
        nullable=False,
        unique=True,
    )

    password: Mapped[str] = mapped_column(
        NVARCHAR(255),
        nullable=False,
    )

    email: Mapped[str | None] = mapped_column(
        VARCHAR(254),
        nullable=True,
    )

    number: Mapped[str] = mapped_column(
        VARCHAR(11),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        VARCHAR(7),
        nullable=False,
    )

    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="user",
    )

    threads_created: Mapped[list["SupportThread"]] = relationship(
        "SupportThread",
        back_populates="creator",
        foreign_keys=lambda: [SupportThread.created_by],
    )

    threads_assigned: Mapped[list["SupportThread"]] = relationship(
        "SupportThread",
        back_populates="assigned_manager_user",
        foreign_keys=lambda: [SupportThread.assigned_manager],
        # passive_deletes=True # maybe the DBMS will handle it better here?
    )

    messages_sent: Mapped[list["SupportMessage"]] = relationship(
        "SupportMessage",
        back_populates="sender_user",
    )

    __table_args__ = (
        CheckConstraint(
            "number LIKE '09%' AND LEN(number) = 11"
        ),
        CheckConstraint(
            "role IN ('booker', 'manager')"
        ),
    )


class Booking(Base):
    __tablename__ = "Booking"

    bookingID: Mapped[int] = mapped_column(
        INTEGER,
        primary_key=True,
    )

    tourID: Mapped[int] = mapped_column(
        INTEGER,
        ForeignKey(
            "Tour.tourID",
            onupdate="CASCADE",
            ondelete="NO ACTION",
        ),
        nullable=False,
    )

    userID: Mapped[int] = mapped_column(
        INTEGER,
        ForeignKey(
            "AppUser.userID",
            onupdate="NO ACTION",
            ondelete="NO ACTION",
        ),
        nullable=False,
    )

    booking_date: Mapped[datetime] = mapped_column(
        DATETIME2,
        nullable=False,
        server_default=func.SYSDATETIME(),
    )

    status: Mapped[str] = mapped_column(
        VARCHAR(8),
        nullable=False,
    )

    num_people: Mapped[int] = mapped_column(
        INTEGER,
        nullable=False,
    )

    tour: Mapped["Tour"] = relationship(
        "Tour",
        back_populates="bookings",
    )

    user: Mapped["AppUser"] = relationship(
        "AppUser",
        back_populates="bookings",
    )

    __table_args__ = (
        CheckConstraint("num_people > 0"),
        CheckConstraint(
            "status IN ('accepted', 'failed', 'canceled')"
        ),
        {"implicit_returning": False}
    )


class SupportThread(Base):
    __tablename__ = "SupportThread"

    threadID: Mapped[int] = mapped_column(
        INTEGER,
        primary_key=True,
    )

    created_by: Mapped[int] = mapped_column(
        INTEGER,
        ForeignKey(
            "AppUser.userID",
            onupdate="NO ACTION",
            ondelete="NO ACTION",
        ),
        nullable=False,
    )

    tourID: Mapped[int | None] = mapped_column(
        INTEGER,
        ForeignKey(
            "Tour.tourID",
            onupdate="CASCADE",
            ondelete="NO ACTION",
        ),
        nullable=True,
    )

    assigned_manager: Mapped[int | None] = mapped_column(
        INTEGER,
        ForeignKey(
            "AppUser.userID",
            onupdate="NO ACTION",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        VARCHAR(6),
        nullable=False,
        server_default="open",
    )

    created_at: Mapped[datetime] = mapped_column(
        DATETIME2,
        nullable=False,
        server_default=func.SYSDATETIME(),
    )

    creator: Mapped["AppUser"] = relationship(
        "AppUser",
        back_populates="threads_created",
        foreign_keys=[created_by],
    )

    tour: Mapped["Tour | None"] = relationship(
        "Tour",
        back_populates="support_threads",
    )

    assigned_manager_user: Mapped["AppUser | None"] = relationship(
        "AppUser",
        back_populates="threads_assigned",
        foreign_keys=[assigned_manager],
    )

    messages: Mapped[list["SupportMessage"]] = relationship(
        "SupportMessage",
        back_populates="thread",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'closed')"
        ),
    )


class SupportMessage(Base):
    __tablename__ = "SupportMessage"

    messageID: Mapped[int] = mapped_column(
        INTEGER,
        primary_key=True,
    )

    threadID: Mapped[int] = mapped_column(
        INTEGER,
        ForeignKey(
            "SupportThread.threadID",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    sender: Mapped[int] = mapped_column(
        INTEGER,
        ForeignKey(
            "AppUser.userID",
            onupdate="NO ACTION",
            ondelete="NO ACTION",
        ),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        NVARCHAR(None),
        nullable=False,
    )

    sent_at: Mapped[datetime] = mapped_column(
        DATETIME2,
        nullable=False,
        server_default=func.SYSDATETIME(),
    )

    thread: Mapped["SupportThread"] = relationship(
        "SupportThread",
        back_populates="messages",
    )

    sender_user: Mapped["AppUser"] = relationship(
        "AppUser",
        back_populates="messages_sent",
    )


load_dotenv()
ENGINE = create_engine(_buildURL())


def getSession():
    with Session(ENGINE) as session:
        yield session
