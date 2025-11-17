-- MySQL compatible initialization script
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE waterlevel_db;

-- Table: metadata_kolok_waterlevel
-- Data source: data/metadata_wl_station.csv
CREATE TABLE IF NOT EXISTS metadata_kolok_waterlevel (
  id INT AUTO_INCREMENT PRIMARY KEY,
  station_id VARCHAR(50) NOT NULL UNIQUE,
  lat DECIMAL(10, 6),
  lon DECIMAL(10, 6),
  station_name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  bank_level DECIMAL(10, 2),
  INDEX idx_station_id (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE metadata_kolok_waterlevel;

-- Insert metadata for all 6 stations from data/metadata_wl_station.csv
INSERT INTO metadata_kolok_waterlevel (station_id, lat, lon, station_name, bank_level) VALUES
('X.274', 5.839205, 101.892307, 'บ้านบูเก๊ะตา', 23.5),
('X.119A', 6.023349, 101.975655, 'บริเวณสะพานลันตู', 9.3),
('X.119', 6.074279, 102.040062, 'บ้านมูโน๊ะ', 7.0),
('X.5C', 9.113215, 99.223678, 'บ้านท่าข้าม', 2.5),
('X.37A', 8.570979, 99.253867, 'บ้านย่านดินแดง', 11.7),
('X.217', 8.84753, 99.198863, 'บ้านเคียนซา', 6.0);

-- Table: waterlevel_data with data_type field
-- Supports all 6 stations plus TPI003
-- Data sources: data/obs_wl_20251117.csv (observe), data/wl_fcst_20251117.csv (forecast)
CREATE TABLE IF NOT EXISTS waterlevel_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date_time DATETIME NOT NULL,
  tpi003_wl DECIMAL(10, 2),
  x_274 DECIMAL(10, 2),
  x_119a DECIMAL(10, 2),
  x_119 DECIMAL(10, 2),
  x_5c DECIMAL(10, 2),
  x_37a DECIMAL(10, 2),
  x_217 DECIMAL(10, 2),
  data_type ENUM('observe', 'forecast') DEFAULT 'observe',
  INDEX idx_date_time (date_time),
  INDEX idx_data_type (data_type),
  UNIQUE KEY unique_datetime_type (date_time, data_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

TRUNCATE TABLE waterlevel_data;

-- Sample Observe data from data/obs_wl_20251117.csv (11-17 Nov 2025)
INSERT INTO waterlevel_data (date_time, tpi003_wl, x_274, x_119a, x_119, x_5c, x_37a, x_217, data_type) VALUES
('2025-11-11 00:00:00', NULL, 18.31, 5.04, 3.06, 0.44, 7.30, 2.24, 'observe'),
('2025-11-12 00:00:00', 1.07, 18.93, 4.78, 2.80, 0.46, 7.22, 2.17, 'observe'),
('2025-11-13 00:00:00', 0.95, 18.42, 4.91, 2.82, 0.41, 7.11, 2.06, 'observe'),
('2025-11-14 00:00:00', 0.92, 18.23, 4.65, 2.61, 0.52, 7.06, 1.95, 'observe'),
('2025-11-15 00:00:00', 1.02, 18.21, 4.52, 2.46, 0.83, 7.10, 1.90, 'observe'),
('2025-11-16 00:00:00', 0.98, 18.31, 4.42, 2.42, 0.79, 7.22, 1.83, 'observe'),
('2025-11-17 00:00:00', 0.84, 18.62, 5.00, 2.67, 0.75, 7.05, 1.72, 'observe'),

-- Sample Forecast data from data/wl_fcst_20251117.csv (18-25 Nov 2025)
('2025-11-18 00:00:00', NULL, 18.62, 5.06, 2.98, 0.73, 6.83, 1.51, 'forecast'),
('2025-11-19 00:00:00', NULL, 20.59, 6.36, 3.51, 0.88, 6.60, 1.40, 'forecast'),
('2025-11-20 00:00:00', NULL, 20.19, 7.83, 4.69, 1.19, 7.22, 1.59, 'forecast'),
('2025-11-21 00:00:00', NULL, 21.81, 8.89, 5.43, 1.44, 8.02, 1.95, 'forecast'),
('2025-11-22 00:00:00', NULL, 21.13, 9.30, 6.09, 1.63, 9.14, 2.48, 'forecast'),
('2025-11-23 00:00:00', NULL, 24.33, 9.61, 6.36, 1.66, 9.31, 2.64, 'forecast'),
('2025-11-24 00:00:00', NULL, 24.77, 10.23, 6.72, 1.46, 9.25, 2.72, 'forecast'),
('2025-11-25 00:00:00', NULL, 24.70, 10.59, 7.15, 1.24, 9.57, 2.61, 'forecast');
