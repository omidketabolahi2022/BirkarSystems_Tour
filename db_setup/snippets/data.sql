USE TourDB;
GO

-- the app users are created through the application's own signup page due to hashing enforcement

-- generate sample tours

INSERT INTO Tour (tour_name, source, destination, start_time, day_length, capacity, price, status, description)
VALUES
    ('Istanbul Highlights', 'Tehran', 'Istanbul', '2026-10-12T08:00:00', 5, 20, 450.00, 'pending',
        'A guided tour through Istanbul''s historic sites, bazaars, and Bosphorus views.'),

    ('Shiraz Heritage Tour', 'Tehran', 'Shiraz', '2026-11-02T09:30:00', 3, 25, 180.00, 'pending',
        'Visit Persepolis, Eram Garden, and the tomb of Hafez in the city of poets.'),

    ('Caspian Coast Getaway', 'Tehran', 'Rasht', '2026-10-20T07:00:00', 2, 30, 95.00, 'pending',
        'A short trip to the Caspian coast, including local seafood and forest walks.'),

    ('Tabriz Bazaar Tour', 'Tehran', 'Tabriz', '2026-12-05T08:00:00', 4, 15, 210.00, 'pending', NULL),

    ('Isfahan Grand Tour', 'Tehran', 'Isfahan', '2026-11-15T08:00:00', 6, 18, 320.00, 'pending',
        'Naqsh-e Jahan Square, the historic bridges, and traditional handicraft workshops.'),

    ('Kish Island Escape', 'Shiraz', 'Kish Island', '2026-08-10T10:00:00', 4, 40, 260.00, 'passed', NULL),

    ('Mashhad Pilgrimage Tour', 'Tehran', 'Mashhad', '2026-09-01T06:00:00', 3, 50, 150.00, 'passed',
        'A visit to the Imam Reza shrine and surrounding cultural sites.'),

    ('Yazd Desert Adventure', 'Tehran', 'Yazd', '2026-09-25T08:00:00', 3, 12, 200.00, 'canceled',
        'Desert safari and a walking tour of Yazd''s historic windcatcher architecture.');

-- generate user booking

INSERT INTO Booking (tourID, userID, booking_date, status, num_people)
VALUES
    -- BookerOmid (userID = 2)
    (1, 2, '2026-09-01T10:00:00', 'accepted', 2),
    (2, 2, '2026-08-15T14:30:00', 'canceled', 1),
    (3, 2, '2026-09-10T09:15:00', 'accepted', 1),
    (4, 2, '2026-07-20T11:00:00', 'failed',   4),

    -- NewBooker1 (userID = 3)
    (5, 3, '2026-09-05T16:00:00', 'accepted', 3),
    (6, 3, '2026-07-25T12:00:00', 'accepted', 2),
    (2, 3, '2026-09-12T18:20:00', 'failed',   1),

    -- NewBooker2 (userID = 5)
    (7, 5, '2026-08-10T08:45:00', 'accepted', 5),
    (1, 5, '2026-09-08T13:10:00', 'canceled', 2),
    (8, 5, '2026-09-14T17:00:00', 'failed',   2),
    (5, 5, '2026-09-16T10:30:00', 'accepted', 1),

    -- SatUser1 (userID = 7)
    (3, 7, '2026-09-18T09:00:00', 'accepted', 4),
    (4, 7, '2026-09-11T15:40:00', 'accepted', 2),
    (6, 7, '2026-07-30T12:00:00', 'canceled', 3);
