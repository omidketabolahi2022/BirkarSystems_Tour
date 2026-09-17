USE TourDB;
GO

-- TODO: consider changing the 'ON UPDATE CASCADE' on 'tourID' to 'NO ACTION' since an 'IDENTITY' column
-- cannot be updated, having it on 'CASCADE' causes inconsistency with the rest of the code

CREATE TABLE Tour(
    tourID INT IDENTITY(1, 1) PRIMARY KEY,
    tour_name NVARCHAR(50) NOT NULL,
    source NVARCHAR(50) NOT NULL,
    destination NVARCHAR(50) NOT NULL,
    start_time DATETIME2 NOT NULL,
    day_length INT NOT NULL,
    capacity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(10) NOT NULL,
    description NVARCHAR(255),

    CHECK (capacity > 0),
    CHECK (price > 0),
    CHECK (day_length > 0),
    CHECK (status IN ('canceled', 'passed', 'pending'))

);

CREATE TABLE TourImg(
    imageID INT IDENTITY(1, 1) PRIMARY KEY,
    tourID INT NOT NULL,
    path NVARCHAR(255) NOT NULL,
    label VARCHAR(9) NOT NULL,
    description NVARCHAR(255),

    FOREIGN KEY (tourID) REFERENCES Tour(tourID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CHECK (label IN ('banner', 'secondary', 'ext'))
);

CREATE TABLE AppUser(
    userID INT IDENTITY(1, 1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    email VARCHAR(254) UNIQUE,
    number VARCHAR(11) NOT NULL,
    role VARCHAR(7) NOT NULL,

    CHECK (number LIKE '09%' AND LEN(number) = 11),
    CHECK (role IN ('booker', 'manager'))
);

CREATE TABLE Booking(
    bookingID INT IDENTITY(1, 1) PRIMARY KEY,
    tourID INT NOT NULL,
    userID INT NOT NULL,
    booking_date DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    status VARCHAR(8) NOT NULL,
    num_people INT NOT NULL,

    FOREIGN KEY (tourID) REFERENCES Tour(tourID)
        ON UPDATE CASCADE
        ON DELETE NO ACTION,
    FOREIGN KEY (userID) REFERENCES AppUser(userID)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CHECK (num_people > 0),
    CHECK (status IN ('accepted', 'failed', 'canceled'))

);

CREATE TABLE SupportThread(
    threadID INT IDENTITY(1, 1) PRIMARY KEY,
    created_by INT NOT NULL,
    tourID INT,
    assigned_manager INT,
    status VARCHAR(6) NOT NULL DEFAULT 'open',
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    FOREIGN KEY (created_by) REFERENCES AppUser(userID)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    FOREIGN KEY (tourID) REFERENCES Tour(tourID)
        ON UPDATE CASCADE
        ON DELETE NO ACTION,
    FOREIGN KEY (assigned_manager) REFERENCES AppUser(userID)
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    
    CHECK (status IN ('open', 'closed'))
);

CREATE TABLE SupportMessage(
    messageID INT IDENTITY(1, 1) PRIMARY KEY,
    threadID INT NOT NULL,
    sender INT NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    sent_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    FOREIGN KEY (threadID) REFERENCES SupportThread(threadID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (sender) REFERENCES AppUser(userID)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);
