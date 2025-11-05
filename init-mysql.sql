-- MySQL compatible initialization script
USE waterlevel_db;

-- Table: metadata_kolok_waterlevel
CREATE TABLE IF NOT EXISTS metadata_kolok_waterlevel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  station_id VARCHAR(50),
  lat DECIMAL(10, 6),
  lon DECIMAL(10, 6),
  bank_level DECIMAL(10, 2),
  subbasin_name VARCHAR(100),
  INDEX idx_station_id (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO metadata_kolok_waterlevel (station_id, lat, lon, bank_level, subbasin_name) VALUES
('X.274', 5.839205, 101.892307, 23.5, 'kolok'),
('X.119A', 6.023349, 101.975655, 9.3, 'kolok'),
('X.119', 6.074279, 102.040062, 7.0, 'kolok');

-- Table: waterlevel_data
CREATE TABLE IF NOT EXISTS waterlevel_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date_time DATETIME,
  x_274 DECIMAL(10, 2),
  x_119a DECIMAL(10, 2),
  x_119 DECIMAL(10, 2),
  INDEX idx_date_time (date_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: The full data from kolok_waterlevel.sql will be loaded via the initialization process
-- This is a sample of the data structure
INSERT INTO waterlevel_data (date_time, x_274, x_119a, x_119) VALUES
('2018-01-01 00:00:00', 19.85, 7.76, 4.89),
('2018-01-02 00:00:00', 20.7, 7.62, 4.96),
('2018-01-03 00:00:00', 20.51, 7.78, 5.02),
('2018-01-04 00:00:00', 21.51, 7.86, 5.02),
('2018-01-05 00:00:00', 20.18, 8.27, 5.12);
