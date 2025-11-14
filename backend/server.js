const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  }
});

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
    const dataType = req.query.data_type; // 'observe', 'forecast', or undefined for all
    
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
    
    // Build WHERE clause
    let whereClause = 'WHERE date_time BETWEEN ? AND ?';
    const queryParams = [dateFormat, startDate, endDate];
    
    // Add data_type filter if specified
    if (dataType && (dataType === 'observe' || dataType === 'forecast')) {
      whereClause += ' AND data_type = ?';
      queryParams.push(dataType);
    }
    
    const [rows] = await pool.query(`
      SELECT 
        DATE_FORMAT(date_time, ?) as period,
        data_type,
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
      ${whereClause}
      GROUP BY period, data_type
      ORDER BY period ASC, data_type ASC
    `, queryParams);
    
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

// Test endpoint to check external API directly
app.get('/api/test/external-api', async (req, res) => {
  try {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear() + 543;
    const currentDate = `${day}/${month}/${year}`;
    
    const apiUrl = 'https://hyd-app-db.rid.go.th/webservice/getDailyWaterLevelListReportMSL.ashx?option=2';
    
    const payload = new URLSearchParams({
      "DW[UtokID]": "8",
      "DW[TimeCurrent]": currentDate,
      "_search": "false",
      "nd": Date.now().toString(),
      "rows": "1000",
      "page": "1",
      "sidx": "indexcount",
      "sord": "asc"
    });

    console.log('🧪 Testing external API with date:', currentDate);
    console.log('🧪 Payload:', payload.toString());

    const response = await axios.post(apiUrl, payload.toString(), {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    res.json({
      success: true,
      status: response.status,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      hasRows: response.data?.rows ? true : false,
      rowsLength: response.data?.rows?.length || 0,
      firstRecord: response.data?.rows?.[0] || response.data?.[0] || null,
      rawData: response.data
    });

  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      url: 'https://www.rid.go.th/ffwsv2/_6_ReportDataAll/getDailyWaterLevelListReportMSL.ashx?option=2'
    });
  }
});

// Import observe data from external API
app.post('/api/import/observe', async (req, res) => {
  try {
    // รับพารามิเตอร์จาก request
    const { utokID = "8", startDate, endDate } = req.body || {};
    
    // ถ้าไม่ระบุ startDate และ endDate ให้ใช้วันที่เดียว (backward compatible)
    const isSingleDate = !startDate || !endDate;
    
    let datesToImport = [];
    
    if (isSingleDate) {
      // ใช้วันที่ปัจจุบันหรือวันที่ที่ระบุมา
      const singleDate = startDate || (() => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear() + 543;
        return `${day}/${month}/${year}`;
      })();
      datesToImport.push(singleDate);
    } else {
      // สร้างลิสต์วันที่ตามช่วงที่เลือก
      const parseThaiDate = (dateStr) => {
        const parts = dateStr.split('/');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]) - 543; // แปลง พ.ศ. เป็น ค.ศ.
        return new Date(year, month, day);
      };

      const start = parseThaiDate(startDate);
      const end = parseThaiDate(endDate);

      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date range',
          details: 'Start date must be before or equal to end date'
        });
      }

      // สร้างลิสต์วันที่ตั้งแต่ start ถึง end
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const day = String(currentDate.getDate()).padStart(2, '0');
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear() + 543;
        datesToImport.push(`${day}/${month}/${year}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`📡 Importing data for ${datesToImport.length} day(s):`, datesToImport);

    const apiUrl = 'https://hyd-app-db.rid.go.th/webservice/getDailyWaterLevelListReportMSL.ashx?option=2';
    
    let totalImported = 0;
    let totalUpdated = 0;
    let failedDates = [];

    // วนลูปดึงข้อมูลแต่ละวัน
    for (const currentDate of datesToImport) {
      try {
        console.log(`📡 Fetching data for date: ${currentDate}, utokID: ${utokID}`);

        // สร้าง payload แบบ x-www-form-urlencoded
        const payload = new URLSearchParams({
          "DW[UtokID]": utokID,
          "DW[TimeCurrent]": currentDate,
          "_search": "false",
          "nd": Date.now().toString(), // timestamp ป้องกัน cache
          "rows": "1000",
          "page": "1",
          "sidx": "indexcount",
          "sord": "asc"
        });

        const response = await axios.post(apiUrl, payload.toString(), {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        console.log(`📊 Response received for ${currentDate}`);

        // ตรวจสอบรูปแบบข้อมูลที่ได้รับ
        let records = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            records = response.data;
          } else if (response.data.rows && Array.isArray(response.data.rows)) {
            records = response.data.rows;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            records = response.data.data;
          }
        }

        console.log(`📊 Received ${records.length} records from API for ${currentDate}`);

        if (records.length === 0) {
          console.log(`⚠️ No data found for ${currentDate}`);
          failedDates.push({ date: currentDate, error: 'No data available' });
          continue; // Skip to next date
        }

        // Filter data for our 3 stations using stationcode
        const stationCodes = ['X.274', 'X.119A', 'X.119'];
        const filteredData = records.filter(item => {
          const stationCode = item.stationcode || item.stationCode || item.station_code;
          return stationCodes.includes(stationCode);
        });

        console.log(`🎯 Filtered to ${filteredData.length} records for our stations`);

        if (filteredData.length === 0) {
          console.log(`⚠️ No data found for the specified stations for ${currentDate}`);
          failedDates.push({ date: currentDate, error: 'No station data available' });
          continue; // Skip to next date
        }

        // ใช้วันที่ที่ระบุใน request เป็นวันที่บันทึก
        let recordDate = currentDate;
        
        // แปลงวันที่จากรูปแบบ DD/MM/YYYY (พ.ศ.) เป็น YYYY-MM-DD (ค.ศ.)
        if (typeof recordDate === 'string' && recordDate.includes('/')) {
          const parts = recordDate.split('/');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parseInt(parts[2]);
            // ถ้าเป็นปีพ.ศ. ให้แปลงเป็น ค.ศ.
            if (year > 2500) {
              year = year - 543;
            }
            recordDate = `${year}-${month}-${day} 00:00:00`;
          }
        }

            // Group data by station for this date
        const stationData = {
          date_time: recordDate,
          x_274: null,
          x_119a: null,
          x_119: null
        };

        filteredData.forEach(item => {
          const stationCode = item.stationcode || item.stationCode || item.station_code;
          
          // ดึงค่า waterlevelvalueQ1 และแยกตัวเลขออกมา (รูปแบบ: "3.06|-| ")
          let waterLevelStr = item.waterlevelvalueQ1 || item.waterlevelvalueq1 || '';
          
          // แยกเอาแค่ตัวเลขส่วนแรก (ก่อน |)
          if (waterLevelStr && typeof waterLevelStr === 'string') {
            const parts = waterLevelStr.split('|');
            waterLevelStr = parts[0].trim();
          }
          
          const waterLevel = parseFloat(waterLevelStr);

          // ถ้าได้ค่าที่ valid ให้บันทึก
          if (!isNaN(waterLevel) && waterLevel > 0) {
            if (stationCode === 'X.274') {
              stationData.x_274 = waterLevel;
            } else if (stationCode === 'X.119A') {
              stationData.x_119a = waterLevel;
            } else if (stationCode === 'X.119') {
              stationData.x_119 = waterLevel;
            }
          }
        });

        console.log('📊 Processed station data:', stationData);

        // ตรวจสอบว่ามีข้อมูลที่ valid อย่างน้อย 1 สถานี
        const hasValidData = stationData.x_274 !== null || 
                            stationData.x_119a !== null || 
                            stationData.x_119 !== null;

        if (!hasValidData) {
          console.log(`⚠️ No valid water level data for ${currentDate}, skipping database insert`);
          failedDates.push({ date: currentDate, error: 'No valid water level values' });
          continue; // Skip to next date
        }

        // Insert or update data for this date
        try {
          // Check if record exists
          const [existing] = await pool.query(
            'SELECT id FROM waterlevel_data WHERE date_time = ? AND data_type = ?',
            [stationData.date_time, 'observe']
          );

          if (existing.length > 0) {
            // Update existing record
            await pool.query(
              `UPDATE waterlevel_data 
               SET x_274 = COALESCE(?, x_274), 
                   x_119a = COALESCE(?, x_119a), 
                   x_119 = COALESCE(?, x_119)
               WHERE date_time = ? AND data_type = ?`,
              [stationData.x_274, stationData.x_119a, stationData.x_119, stationData.date_time, 'observe']
            );
            totalUpdated++;
            console.log(`✅ Updated data for ${currentDate}`);
          } else {
            // Insert new record
            await pool.query(
              `INSERT INTO waterlevel_data (date_time, x_274, x_119a, x_119, data_type) 
               VALUES (?, ?, ?, ?, ?)`,
              [stationData.date_time, stationData.x_274, stationData.x_119a, stationData.x_119, 'observe']
            );
            totalImported++;
            console.log(`✅ Imported data for ${currentDate}`);
          }
        } catch (dbError) {
          console.error(`❌ Database error for ${currentDate}:`, dbError.message);
          failedDates.push({ date: currentDate, error: dbError.message });
        }

      } catch (apiError) {
        console.error(`❌ API error for ${currentDate}:`, apiError.message);
        failedDates.push({ date: currentDate, error: apiError.message });
      }
      
      // รอสักครู่ก่อนเรียก API ครั้งถัดไป (ป้องกัน rate limit)
      if (datesToImport.indexOf(currentDate) < datesToImport.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // รอ 1 วินาที
      }
    }

    console.log(`✅ Import completed: ${totalImported} new, ${totalUpdated} updated, ${failedDates.length} failed`);

    res.json({
      success: true,
      message: 'Data imported successfully',
      imported: totalImported,
      updated: totalUpdated,
      failed: failedDates.length,
      total: totalImported + totalUpdated,
      failedDates: failedDates.length > 0 ? failedDates : undefined,
      dateRange: datesToImport.length > 1 ? {
        start: datesToImport[0],
        end: datesToImport[datesToImport.length - 1],
        totalDays: datesToImport.length
      } : undefined
    });

  } catch (error) {
    console.error('❌ Error importing data:', error);
    
    // ให้รายละเอียดที่มากขึ้นถ้าเป็น HTTP error
    let errorMessage = 'Failed to import data from external API';
    let errorDetails = error.message;
    let statusCode = 500; // Default to 500 for server errors
    
    if (error.response) {
      // External API error - use 502 Bad Gateway instead of passing through the external status
      statusCode = 502; // Bad Gateway - indicates external service failed
      errorMessage = `External API returned ${error.response.status} error`;
      errorDetails = error.response.data || error.message;
      
      // ถ้าเป็น 404 อาจหมายถึง API endpoint เปลี่ยนแปลง
      if (error.response.status === 404) {
        errorMessage = 'External API endpoint not found';
        errorDetails = 'The RID API endpoint may be unavailable. ' + 
                      'URL: https://hyd-app-db.rid.go.th/webservice/getDailyWaterLevelListReportMSL.ashx?option=2';
      }
    } else if (error.code === 'ECONNREFUSED') {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Cannot connect to external API';
      errorDetails = 'The external API service is not reachable';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'External API request timed out';
      errorDetails = 'The external API took too long to respond';
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails)
    });
  }
});

// Import forecast data from CSV file
app.post('/api/import/forecast/csv', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        details: 'Please select a CSV file to upload'
      });
    }

    filePath = req.file.path;
    console.log(`📁 Processing forecast CSV file: ${req.file.originalname}`);

    // Read and parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('📋 CSV Headers:', header);

    // Expected format: date_time,x_274,x_119a,x_119
    // or: date,x_274,x_119a,x_119
    const dateIndex = header.findIndex(h => h === 'date_time' || h === 'date');
    const x274Index = header.findIndex(h => h === 'x_274' || h === 'x.274');
    const x119aIndex = header.findIndex(h => h === 'x_119a' || h === 'x.119a');
    const x119Index = header.findIndex(h => h === 'x_119' || h === 'x.119');

    if (dateIndex === -1) {
      throw new Error('CSV must have a "date_time" or "date" column');
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      
      if (values.length < header.length) {
        console.log(`⚠️ Skipping line ${i + 1}: insufficient columns`);
        skippedCount++;
        continue;
      }

      const dateTimeStr = values[dateIndex];
      const x_274 = x274Index !== -1 && values[x274Index] ? parseFloat(values[x274Index]) : null;
      const x_119a = x119aIndex !== -1 && values[x119aIndex] ? parseFloat(values[x119aIndex]) : null;
      const x_119 = x119Index !== -1 && values[x119Index] ? parseFloat(values[x119Index]) : null;

      // Parse date (support multiple formats)
      let dateTime;
      try {
        // Try parsing common formats
        if (dateTimeStr.includes('/')) {
          // DD/MM/YYYY or YYYY/MM/DD
          const parts = dateTimeStr.split(/[\/\s]/);
          if (parts[0].length === 4) {
            // YYYY/MM/DD
            dateTime = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
          } else {
            // DD/MM/YYYY
            dateTime = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
          }
        } else if (dateTimeStr.includes('-')) {
          // YYYY-MM-DD format
          dateTime = new Date(dateTimeStr);
        } else {
          throw new Error('Invalid date format');
        }

        // Convert to MySQL format
        const year = dateTime.getFullYear();
        const month = String(dateTime.getMonth() + 1).padStart(2, '0');
        const day = String(dateTime.getDate()).padStart(2, '0');
        const mysqlDate = `${year}-${month}-${day} 00:00:00`;

        // Check if record exists
        const [existing] = await pool.query(
          'SELECT id FROM waterlevel_data WHERE date_time = ? AND data_type = ?',
          [mysqlDate, 'forecast']
        );

        if (existing.length > 0) {
          // Update existing record
          await pool.query(
            `UPDATE waterlevel_data 
             SET x_274 = COALESCE(?, x_274), 
                 x_119a = COALESCE(?, x_119a), 
                 x_119 = COALESCE(?, x_119)
             WHERE date_time = ? AND data_type = ?`,
            [x_274, x_119a, x_119, mysqlDate, 'forecast']
          );
          updatedCount++;
        } else {
          // Insert new record
          await pool.query(
            `INSERT INTO waterlevel_data (date_time, x_274, x_119a, x_119, data_type) 
             VALUES (?, ?, ?, ?, ?)`,
            [mysqlDate, x_274, x_119a, x_119, 'forecast']
          );
          importedCount++;
        }

      } catch (dateError) {
        console.log(`⚠️ Skipping line ${i + 1}: ${dateError.message} (${dateTimeStr})`);
        skippedCount++;
        continue;
      }
    }

    console.log(`✅ Import completed: ${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);

    res.json({
      success: true,
      message: 'Forecast data imported successfully from CSV',
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: importedCount + updatedCount
    });

  } catch (error) {
    console.error('❌ Error importing CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import CSV file',
      details: error.message
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

// Delete all forecast data
app.delete('/api/waterlevel/forecast', async (req, res) => {
  try {
    console.log('🗑️ Deleting all forecast data...');

    const [result] = await pool.query(
      'DELETE FROM waterlevel_data WHERE data_type = ?',
      ['forecast']
    );

    console.log(`✅ Deleted ${result.affectedRows} forecast records`);

    res.json({
      success: true,
      message: 'Forecast data deleted successfully',
      deleted: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Error deleting forecast data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete forecast data',
      details: error.message
    });
  }
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});
