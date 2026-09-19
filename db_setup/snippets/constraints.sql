USE TourDB;
GO

CREATE UNIQUE INDEX UX_TourImg_Banner
    ON TourImg(tourID)
    WHERE label = 'banner';

CREATE UNIQUE INDEX UX_Booking_ActivePerUser
    ON Booking(tourID, userID)
    WHERE status = 'accepted';

CREATE TRIGGER TRG_Booking_CheckCapacity
ON Booking
AFTER INSERT, UPDATE
AS BEGIN
  SET NOCOUNT ON;
  IF EXISTS (
    SELECT * FROM (
        SELECT tourID, SUM(num_people) AS total_people
        FROM Booking
        WHERE status = 'accepted'
        AND tourID IN (SELECT tourID FROM INSERTED)
        GROUP BY tourID
    ) AS NewTourReg
    JOIN Tour
    ON Tour.tourID = NewTourReg.tourID
    WHERE NewTourReg.total_people > Tour.capacity
  )
    BEGIN
      ROLLBACK;
      THROW 50001, 'Booking exceeds the tour capacity', 1;
    END
END;

-- would it be more conventional if I did this for filtering?
/*
...
AND tourID IN (
    SELECT tourID FROM INSERTED
    UNION
    SELECT tourID FROM DELETED
)
*/