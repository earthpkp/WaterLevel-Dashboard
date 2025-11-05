const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'wateruser',
  password: process.env.DB_PASSWORD || 'waterpass',
  database: process.env.DB_NAME || 'waterlevel_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('✅ MySQL connection pool created successfully');
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to MySQL database');
    connection.release();
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    // Retry after 5 seconds
    setTimeout(initializeDatabase, 5000);
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Get all metadata
app.get('/api/metadata', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM metadata_kolok_waterlevel');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metadata'
    });
  }
});

// Get water level data with pagination
app.get('/api/waterlevel', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    
    let query = 'SELECT * FROM waterlevel_data';
    let countQuery = 'SELECT COUNT(*) as total FROM waterlevel_data';
    const params = [];
    
    if (startDate && endDate) {
      query += ' WHERE date_time BETWEEN ? AND ?';
      countQuery += ' WHERE date_time BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' ORDER BY date_time DESC LIMIT ? OFFSET ?';
    
    const [rows] = await pool.query(query, [...params, limit, offset]);
    const [[{ total }]] = await pool.query(countQuery, params);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching water level data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch water level data'
    });
  }
});

// Get latest water levels
app.get('/api/waterlevel/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM waterlevel_data ORDER BY date_time DESC LIMIT 1'
    );
    res.json({
      success: true,
      data: rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching latest water level:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest water level'
    });
  }
});

// Get statistics for a specific station
app.get('/api/statistics/:station', async (req, res) => {
  try {
    let station = req.params.station.toLowerCase();
    // Remove 'x' or 'x.' or 'x_' prefix if exists
    station = station.replace(/^x[._]?/, '');
    const column = `x_${station.replace('.', '')}`;
    
    const [rows] = await pool.query(`
      SELECT 
        MIN(${column}) as min_level,
        MAX(${column}) as max_level,
        AVG(${column}) as avg_level,
        COUNT(*) as total_records
      FROM waterlevel_data
      WHERE ${column} IS NOT NULL
    `);
    
    res.json({
      success: true,
      station: station,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get data for chart (aggregated by month)
app.get('/api/waterlevel/chart', async (req, res) => {
  try {
    const startDate = req.query.start_date || '2018-01-01';
    const endDate = req.query.end_date || '2025-12-31';
    const aggregation = req.query.aggregation || 'month'; // day, month, year
    
    let dateFormat;
    switch (aggregation) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default: // month
        dateFormat = '%Y-%m';
    }
    
    const [rows] = await pool.query(`
      SELECT 
        DATE_FORMAT(date_time, ?) as period,
        AVG(x_274) as x_274_avg,
        AVG(x_119a) as x_119a_avg,
        AVG(x_119) as x_119_avg,
        MAX(x_274) as x_274_max,
        MAX(x_119a) as x_119a_max,
        MAX(x_119) as x_119_max,
        MIN(x_274) as x_274_min,
        MIN(x_119a) as x_119a_min,
        MIN(x_119) as x_119_min
      FROM waterlevel_data
      WHERE date_time BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period ASC
    `, [dateFormat, startDate, endDate]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

// Get alert status (water level above bank level)
app.get('/api/alerts', async (req, res) => {
  try {
    // Get latest data
    const [latestData] = await pool.query(
      'SELECT * FROM waterlevel_data ORDER BY date_time DESC LIMIT 1'
    );
    
    // Get metadata with bank levels
    const [metadata] = await pool.query('SELECT * FROM metadata_kolok_waterlevel');
    
    const alerts = [];
    const latest = latestData[0];
    
    if (latest) {
      metadata.forEach(station => {
        const columnName = `x_${station.station_id.toLowerCase().replace('.', '')}`;
        const waterLevel = latest[columnName];
        const bankLevel = station.bank_level;
        
        if (waterLevel && waterLevel >= bankLevel * 0.8) { // Alert if >= 80% of bank level
          alerts.push({
            station_id: station.station_id,
            station_name: station.subbasin_name,
            water_level: waterLevel,
            bank_level: bankLevel,
            percentage: ((waterLevel / bankLevel) * 100).toFixed(2),
            severity: waterLevel >= bankLevel ? 'critical' : 'warning',
            date_time: latest.date_time
          });
        }
      });
    }
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});
