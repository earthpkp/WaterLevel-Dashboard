-- Script to load data from CSV
USE waterlevel_db;

-- First, let's see current data
SELECT 'Current data count:' as message, COUNT(*) as count FROM waterlevel_data;

-- Note: To load CSV data, you need to:
-- 1. Copy waterlevel_data.csv into MySQL container
-- 2. Use LOAD DATA INFILE command
-- 
-- Or use the MySQL import tool:
-- mysqlimport --local --fields-terminated-by=',' --lines-terminated-by='\n' --ignore-lines=1 waterlevel_db waterlevel_data.csv

-- Alternative: Import via INSERT statements (will be generated)
