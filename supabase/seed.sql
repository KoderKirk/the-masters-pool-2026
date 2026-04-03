-- =============================================
-- MASTERS POOL 2026 — GOLFER SEED DATA
-- Run AFTER schema.sql
-- =============================================
INSERT INTO golfers (name, points) VALUES
  ('Scottie Scheffler', 35), ('Rory McIlroy', 33), ('Jon Rahm', 31),
  ('Collin Morikawa', 30), ('Xander Schauffele', 30), ('Bryson DeChambeau', 28),
  ('Ludvig Aberg', 26), ('Justin Thomas', 25), ('Brooks Koepka', 23),
  ('Hideki Matsuyama', 23), ('Jordan Spieth', 22), ('Viktor Hovland', 21),
  ('Tommy Fleetwood', 21), ('Patrick Cantlay', 21), ('Joaquin Niemann', 21),
  ('Shane Lowry', 20), ('Tyrrell Hatton', 19), ('Russell Henley', 19),
  ('Cameron Smith', 18), ('Min Woo Lee', 18), ('Robert MacIntyre', 18),
  ('Corey Conners', 18), ('Will Zalatoris', 17), ('Sergio Garcia', 17),
  ('Sepp Straka', 16), ('Jason Day', 16), ('Akshay Bhatia', 16),
  ('Wyndham Clark', 16), ('Tony Finau', 16), ('Tom Kim', 15),
  ('Keegan Bradley', 15), ('Sahith Theegala', 15), ('Sam Burns', 14),
  ('Daniel Berger', 13), ('Sungjae Im', 13), ('Aaron Rai', 12),
  ('Davis Thompson', 11), ('Brian Harman', 10), ('Dustin Johnson', 10),
  ('Adam Scott', 10), ('Patrick Reed', 10), ('Justin Rose', 10),
  ('J.J. Spaun', 9), ('Byeong Hun An', 9), ('Matt Fitzpatrick', 9),
  ('Maverick McNealy', 7), ('Billy Horschel', 7), ('Michael Kim', 7),
  ('Denny McCarthy', 7), ('Thomas Detry', 7), ('Cameron Young', 5),
  ('Laurie Canter', 5), ('J.T. Poston', 5), ('Stephan Jaeger', 5),
  ('Nicolai Hojgaard', 5), ('Rasmus Hojgaard', 5), ('Harris English', 5),
  ('Charl Schwartzel', 4), ('Max Greyserman', 4), ('Nick Taylor', 4),
  ('Joe Highsmith', 3), ('Christiaan Bezuidenhout', 3), ('Tom Hoge', 3),
  ('Max Homa', 3), ('Chris Kirk', 2), ('Cam Davis', 2),
  ('Austin Eckroat', 2), ('Nico Echavarria', 2), ('Kevin Yu', 2),
  ('Nick Dunlap', 2), ('Matthieu Pavon', 1), ('Bubba Watson', 1),
  ('Matt McCarty', 1), ('Jhonattan Vegas', 1), ('Lucas Glover', 1),
  ('Adam Schenk', 1), ('Taylor Moore', 1), ('Brian Campbell', 1),
  ('Jose Luis Ballester', 1)
ON CONFLICT (name) DO UPDATE SET points = EXCLUDED.points;
