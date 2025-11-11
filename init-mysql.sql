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

TRUNCATE TABLE metadata_kolok_waterlevel;

INSERT INTO metadata_kolok_waterlevel (station_id, lat, lon, bank_level, subbasin_name) VALUES
('X.274', 5.839205, 101.892307, 23.5, 'kolok'),
('X.119A', 6.023349, 101.975655, 9.3, 'kolok'),
('X.119', 6.074279, 102.040062, 7.0, 'kolok');

-- Table: waterlevel_data with data_type field
CREATE TABLE IF NOT EXISTS waterlevel_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date_time DATETIME,
  x_274 DECIMAL(10, 2),
  x_119a DECIMAL(10, 2),
  x_119 DECIMAL(10, 2),
  data_type ENUM('observe', 'forecast') DEFAULT 'observe',
  INDEX idx_date_time (date_time),
  INDEX idx_data_type (data_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

TRUNCATE TABLE waterlevel_data;

-- Import Observe data (24 Oct - 6 Nov 2025)
INSERT INTO waterlevel_data (date_time, x_274, x_119a, x_119, data_type) VALUES
('2025-10-24 00:00:00', 18.43, 4.57, 2.73, 'observe'),
('2025-10-25 00:00:00', 18.51, 5.00, 2.87, 'observe'),
('2025-10-26 00:00:00', 18.33, 5.25, 2.95, 'observe'),
('2025-10-27 00:00:00', 18.17, 5.09, 2.95, 'observe'),
('2025-10-28 00:00:00', 18.17, 4.76, 2.80, 'observe'),
('2025-10-29 00:00:00', 18.35, 4.46, 2.55, 'observe'),
('2025-10-30 00:00:00', 18.54, 4.55, 2.61, 'observe'),
('2025-10-31 00:00:00', 18.32, 5.71, 3.53, 'observe'),
('2025-11-01 00:00:00', 18.97, 5.69, 3.65, 'observe'),
('2025-11-02 00:00:00', 18.97, 5.68, 3.73, 'observe'),
('2025-11-03 00:00:00', 19.37, 5.39, 3.57, 'observe'),
('2025-11-04 00:00:00', 18.97, 5.21, 3.41, 'observe'),
('2025-11-05 00:00:00', 18.84, 5.07, 3.27, 'observe'),
('2025-11-06 00:00:00', 18.75, 4.95, 3.16, 'observe'),

-- Import Forecast data (7 Nov - 16 Nov 2025)
('2025-11-07 00:00:00', 18.56, 4.89, 3.17, 'forecast'),
('2025-11-08 00:00:00', 18.46, 4.57, 2.77, 'forecast'),
('2025-11-09 00:00:00', 18.38, 4.33, 2.49, 'forecast'),
('2025-11-10 00:00:00', 18.35, 4.16, 2.24, 'forecast'),
('2025-11-11 00:00:00', 18.33, 4.03, 2.03, 'forecast'),
('2025-11-12 00:00:00', 18.32, 3.93, 1.86, 'forecast'),
('2025-11-13 00:00:00', 18.30, 3.85, 1.76, 'forecast'),
('2025-11-14 00:00:00', 18.36, 3.97, 1.87, 'forecast'),
('2025-11-15 00:00:00', 18.32, 4.20, 2.09, 'forecast'),
('2025-11-16 00:00:00', 18.24, 4.37, 2.25, 'forecast');
