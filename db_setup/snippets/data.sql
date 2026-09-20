USE TourDB;
GO

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

-- end
