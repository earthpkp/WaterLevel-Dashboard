import React from 'react';
import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';

// Custom Tooltip - show station names with (พยากรณ์) for forecast
const CustomTooltip = ({ active, payload, label, metadata }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const isConnectionPoint = dataPoint?._isConnectionPoint;

    // Helper function to get station name from dataKey
    const getStationNameFromDataKey = (dataKey) => {
      // Extract station ID from dataKey (e.g., "X.274_obs" -> "X.274")
      const stationId = dataKey.replace('_obs', '').replace('_fc', '');
      const station = metadata.find(s => s.station_id === stationId);
      return station?.station_name || stationId;
    };

    // Helper function to check if dataKey is forecast
    const isForecast = (dataKey) => dataKey.endsWith('_fc');

    return (
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
        {payload.map((entry, index) => {
          // At connection point: hide Forecast
          if (isConnectionPoint && isForecast(entry.dataKey)) {
            return null;
          }
          
          const stationName = getStationNameFromDataKey(entry.dataKey);
          const label = isForecast(entry.dataKey) ? `${stationName} (พยากรณ์)` : stationName;
          
          return (
            <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
              {label}: {entry.value?.toFixed(2)} ม.
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

// Custom Legend - show only station names (no duplicates) with interactive toggle
const CustomLegend = ({ payload, colors, getStationName, allStations, hiddenStations, onToggleStation }) => {
  // Filter out forecast entries and duplicates
  const uniqueStations = {};
  payload.forEach(entry => {
    const dataKey = entry.dataKey;
    if (dataKey && dataKey.endsWith('_obs')) {
      const stationId = dataKey.replace('_obs', '');
      if (!uniqueStations[stationId]) {
        uniqueStations[stationId] = {
          stationId,
          color: colors[stationId] || entry.color
        };
      }
    }
  });

  // Use allStations to show all available stations, not just visible ones
  const stationsToShow = allStations || Object.keys(uniqueStations).map(id => uniqueStations[id].stationId);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      flexWrap: 'wrap', 
      gap: '20px',
      paddingTop: '10px'
    }}>
      {stationsToShow.map((stationId) => {
        const isHidden = hiddenStations.has(stationId);
        const color = colors[stationId];
        
        return (
          <div 
            key={stationId} 
            onClick={() => onToggleStation(stationId)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              opacity: isHidden ? 0.4 : 1,
              transition: 'opacity 0.2s',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: isHidden ? '#f5f5f5' : 'transparent'
            }}
            title={isHidden ? 'คลิกเพื่อแสดง' : 'คลิกเพื่อซ่อน'}
          >
            <div style={{ 
              width: '30px', 
              height: '4px', 
              backgroundColor: color,
              borderRadius: '2px'
            }} />
            <span style={{ 
              fontSize: '14px', 
              color: isHidden ? '#999' : '#333',
              fontWeight: isHidden ? '400' : '500',
              textDecoration: isHidden ? 'line-through' : 'none'
            }}>
              {getStationName(stationId)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const WaterLevelChart = ({ data, dateRange, setDateRange, metadata, selectedStations }) => {
  // Track the last observe period for the separator line
  const [lastObservePeriodState, setLastObservePeriodState] = React.useState(null);
  // Track brush range for statistics - initially show all data
  const [brushRange, setBrushRange] = React.useState(null);
  // Store formatted data to avoid recalculation
  const [chartData, setChartData] = React.useState([]);
  // Track hidden stations (for legend toggle) - use Set for better performance
  const [hiddenStations, setHiddenStations] = React.useState(new Set());

  // Toggle station visibility
  const handleToggleStation = (stationId) => {
    setHiddenStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationId)) {
        newSet.delete(stationId);
      } else {
        newSet.add(stationId);
      }
      return newSet;
    });
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleBrushChange = (brushData) => {
    if (brushData) {
      setBrushRange(brushData);
    }
  };

  const setQuickRange = (days) => {
    // Use current date as end date
    const now = new Date();
    const end = new Date();
    const start = new Date();

    if (days === 'all') {
      // Show all available data from earliest to today
      setDateRange({ start: '2025-10-24', end: '', aggregation: 'day' });
    } else {
      // Calculate start date by subtracting days from today
      start.setDate(now.getDate() - days);
      const aggregation = 'day';  // Always use day for this dataset
      setDateRange({
        start: start.toISOString().split('T')[0],
        end: '', // Leave end date empty to show all data from start date onwards
        aggregation
      });
    }
  };

  const formatData = () => {
    // Get current date in Thailand timezone (GMT+7)
    const now = new Date();
    
    // Method 1: Use Intl.DateTimeFormat for accurate timezone conversion
    const thailandDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const currentDate = thailandDateStr; // Already in YYYY-MM-DD format

    // Group data by period and separate observe/forecast based on date
    const groupedData = {};
    let lastObserveData = null;
    let lastObservePeriod = null;

    data.forEach(item => {
      const period = item.period;
      if (!groupedData[period]) {
        groupedData[period] = { period };
      }

      // Use data_type from database if available, otherwise fall back to date comparison
      const isObserve = item.data_type === 'observe' || 
                        (item.data_type === 'forecast' ? false : period <= currentDate);
      
      // Check if this is a future date (for forecast data) - include current date
      const isFutureDate = period >= currentDate;

      if (isObserve) {
        // Observe data (solid line with gradient) - for past and present
        groupedData[period]['X.274_obs'] = parseFloat(item.x_274_avg);
        groupedData[period]['X.119A_obs'] = parseFloat(item.x_119a_avg);
        groupedData[period]['X.119_obs'] = parseFloat(item.x_119_avg);
        groupedData[period]['X.5C_obs'] = parseFloat(item.x_5c_avg);
        groupedData[period]['X.37A_obs'] = parseFloat(item.x_37a_avg);
        groupedData[period]['X.217_obs'] = parseFloat(item.x_217_avg);
        // Keep track of last observe data and period
        lastObserveData = {
          'X.274': parseFloat(item.x_274_avg),
          'X.119A': parseFloat(item.x_119a_avg),
          'X.119': parseFloat(item.x_119_avg),
          'X.5C': parseFloat(item.x_5c_avg),
          'X.37A': parseFloat(item.x_37a_avg),
          'X.217': parseFloat(item.x_217_avg)
        };
        lastObservePeriod = period;
      } else if (isFutureDate) {
        // Forecast data (dashed line) - only for future dates
        groupedData[period]['X.274_fc'] = parseFloat(item.x_274_avg);
        groupedData[period]['X.119A_fc'] = parseFloat(item.x_119a_avg);
        groupedData[period]['X.119_fc'] = parseFloat(item.x_119_avg);
        groupedData[period]['X.5C_fc'] = parseFloat(item.x_5c_avg);
        groupedData[period]['X.37A_fc'] = parseFloat(item.x_37a_avg);
        groupedData[period]['X.217_fc'] = parseFloat(item.x_217_avg);
      }
      // else: ignore forecast data for past dates
    });

    // Strategy: Create smooth connection between Observe and Forecast lines
    // Add forecast values to the last observe date to create connection
    if (lastObserveData && lastObservePeriod) {
      // Find the next date after lastObservePeriod (first forecast date)
      const dates = Object.keys(groupedData).sort();
      const lastObserveIndex = dates.indexOf(lastObservePeriod);
      const nextDate = dates[lastObserveIndex + 1];
      
      // If there's a next date with forecast data, connect the lines
      if (nextDate && groupedData[nextDate]) {
        // Add forecast line starting point at last observe date
        // This creates a smooth connection between observe (solid) and forecast (dashed)
        if (groupedData[lastObservePeriod]) {
          groupedData[lastObservePeriod]['X.274_fc'] = groupedData[lastObservePeriod]['X.274_obs'];
          groupedData[lastObservePeriod]['X.119A_fc'] = groupedData[lastObservePeriod]['X.119A_obs'];
          groupedData[lastObservePeriod]['X.119_fc'] = groupedData[lastObservePeriod]['X.119_obs'];
          groupedData[lastObservePeriod]['X.5C_fc'] = groupedData[lastObservePeriod]['X.5C_obs'];
          groupedData[lastObservePeriod]['X.37A_fc'] = groupedData[lastObservePeriod]['X.37A_obs'];
          groupedData[lastObservePeriod]['X.217_fc'] = groupedData[lastObservePeriod]['X.217_obs'];
          groupedData[lastObservePeriod]['_isConnectionPoint'] = true;
        }
      }
    }


    // Update state with last observe period (for reference, but not used for separator line anymore)
    if (lastObservePeriod && lastObservePeriod !== lastObservePeriodState) {
      setLastObservePeriodState(lastObservePeriod);
    }

    const finalData = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
    
    return finalData;
  };

  // Update chart data when data or dateRange changes
  React.useEffect(() => {
    const formattedData = formatData();
    setChartData(formattedData);
  }, [data, dateRange, selectedStations]);

  // Get all available stations (base set)
  const getAllStations = () => {
    if (!selectedStations || selectedStations.length === 0) {
      return ['X.274', 'X.119A', 'X.119', 'X.5C', 'X.37A', 'X.217'];
    }
    return selectedStations;
  };

  // Filter stations to display - exclude hidden stations
  const allStations = getAllStations();
  const visibleStations = allStations.filter(id => !hiddenStations.has(id));
  const colors = {
    'X.274': '#8884d8',
    'X.119A': '#82ca9d',
    'X.119': '#ffc658',
    'X.5C': '#ff6b6b',
    'X.37A': '#4ecdc4',
    'X.217': '#a29bfe'
  };

  // Get station name from station_id
  const getStationName = (stationId) => {
    const station = metadata.find(s => s.station_id === stationId);
    return station?.station_name || stationId;
  };

  // Calculate Y-axis domain to include all flood stage lines
  const getYAxisDomain = () => {
    const visibleMetadata = metadata.filter(station => 
      visibleStations.includes(station.station_id)
    );
    
    if (visibleMetadata.length === 0) {
      return [0, 'auto'];
    }

    const maxBankLevel = Math.max(
      ...visibleMetadata.map(station => parseFloat(station.bank_level))
    );
    
    const topPadding = maxBankLevel * 0.1; // Add 10% padding above highest bank level
    return [0, Math.ceil(maxBankLevel + topPadding)];
  };

  // Calculate statistics for visible range (based on Brush)
  const calculateStatistics = () => {
    // Use chartData from state instead of calling formatData()
    if (chartData.length === 0) return {};
    
    // Get data slice based on brush range
    let dataSlice;
    if (brushRange && brushRange.startIndex !== undefined && brushRange.endIndex !== undefined) {
      dataSlice = chartData.slice(brushRange.startIndex, brushRange.endIndex + 1);
    } else {
      // Show all data if no brush range selected
      dataSlice = chartData;
    }

    const stats = {};
    
    visibleStations.forEach(stationId => {
      const observeKey = `${stationId}_obs`;
      const forecastKey = `${stationId}_fc`;
      
      // Collect all values (both observe and forecast)
      const values = dataSlice
        .map(item => {
          const obsValue = item[observeKey];
          const fcValue = item[forecastKey];
          return [obsValue, fcValue];
        })
        .flat()
        .filter(val => val !== null && val !== undefined && !isNaN(val));

      if (values.length > 0) {
        stats[stationId] = {
          max: Math.max(...values),
          min: Math.min(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          count: values.length
        };
      }
    });

    return stats;
  };

  const statistics = calculateStatistics();

  return (
    <div className="chart-wrapper">
      <h2 style={{ color: '#667eea', marginBottom: '10px' }}>
        📊 กราฟระดับน้ำ (Observe + Forecast)
      </h2>
     

      <div style={{ marginBottom: '20px', marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button className="btn btn-small" onClick={() => setQuickRange(1)}>1 วัน</button>
          <button className="btn btn-small" onClick={() => setQuickRange(7)}>7 วัน</button>
          <button className="btn btn-small" onClick={() => setQuickRange(30)}>30 วัน</button>
          <button className="btn btn-small" onClick={() => setQuickRange(90)}>90 วัน</button>
          <button className="btn btn-small" onClick={() => setQuickRange(365)}>1 ปี</button>
          <button className="btn btn-small" onClick={() => setQuickRange('all')}>ทั้งหมด</button>
        </div>

        <div className="controls">
          <label>
            วันที่เริ่มต้น:
            <input
              type="date"
              name="start"
              value={dateRange.start}
              onChange={handleDateChange}
            />
          </label>
          <label>
            วันที่สิ้นสุด:
            <input
              type="date"
              name="end"
              value={dateRange.end}
              onChange={handleDateChange}
            />
          </label>
          <label>
            แสดงข้อมูล:
            <select
              value={dateRange.aggregation || 'month'}
              onChange={(e) => setDateRange(prev => ({ ...prev, aggregation: e.target.value }))}
            >
              <option value="day">รายวัน</option>
              <option value="month">รายเดือน</option>
              <option value="year">รายปี</option>
            </select>
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={600}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 65, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorX274" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorX119A" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorX119" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorX5C" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorX37A" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorX217" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a29bfe" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#a29bfe" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: 'ระดับน้ำ (เมตร)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
            domain={getYAxisDomain()}
          />
          <Tooltip content={<CustomTooltip metadata={metadata} />} />
          <Legend
            content={<CustomLegend 
              colors={colors} 
              getStationName={getStationName} 
              allStations={allStations}
              hiddenStations={hiddenStations}
              onToggleStation={handleToggleStation}
            />}
          />

          {/* Flood Stage Lines (Bank Levels) - Only for visible stations */}
          {metadata
            .filter(station => visibleStations.includes(station.station_id))
            .map((station) => {
              // Use same colors as the observe lines
              const color = colors[station.station_id] || '#999999';
              return (
                <ReferenceLine
                  key={`bank-${station.id}`}
                  y={parseFloat(station.bank_level)}
                  stroke={color}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: ` ${parseFloat(station.bank_level).toFixed(1)} ม.`,
                    position: 'right',
                    fill: color,
                    fontSize: 11,
                    fontWeight: 'bold'
                  }}
                />
              );
            })}

          {/* Vertical line to separate Observe and Forecast data */}
          {(() => {
            // Get current Thailand date and time for separator line
            const now = new Date();
            const thailandDateStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Bangkok',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(now);
            
            const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
            const thaiDateStr = thailandTime.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const thaiTimeStr = thailandTime.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit'
            });
            
            return (
              <ReferenceLine
                x={thailandDateStr}
                stroke="#ff6b6b"
                strokeWidth={3}
                strokeDasharray="3 3"
                label={{
                  value: `Observe | Forecast `,
                  position: 'top',
                  fill: '#ff6b6b',
                  fontSize: 12,
                  fontWeight: 'bold',
                  offset: 10
                }}
              />
            );
          })()}

          {/* Area Charts - Observe data (solid with gradient) */}
          {visibleStations.includes('X.274') && (
            <>
              <Area
                type="monotone"
                dataKey="X.274_obs"
                stroke={colors['X.274']}
                strokeWidth={3}
                fill="url(#colorX274)"
                name={getStationName('X.274')}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.274_fc"
                stroke={colors['X.274']}
                strokeWidth={3}
                strokeDasharray="5 5"
                connectNulls={true}
                dot={false}
                legendType="none"
              />
            </>
          )}
          {visibleStations.includes('X.119A') && (
            <>
              <Area
                type="monotone"
                dataKey="X.119A_obs"
                stroke={colors['X.119A']}
                strokeWidth={3}
                fill="url(#colorX119A)"
                name={getStationName('X.119A')}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.119A_fc"
                stroke={colors['X.119A']}
                strokeWidth={3}
                strokeDasharray="5 5"
                connectNulls={true}
                dot={false}
                legendType="none"
              />
            </>
          )}
          {visibleStations.includes('X.119') && (
            <>
              {/* Observe: Area with gradient fill */}
              <Area
                type="monotone"
                dataKey="X.119_obs"
                stroke={colors['X.119']}
                strokeWidth={3}
                fill="url(#colorX119)"
                name={getStationName('X.119')}
                connectNulls={true}
                dot={false}
              />
              {/* Forecast: Dashed line only, no fill */}
              <Line
                type="monotone"
                dataKey="X.119_fc"
                stroke={colors['X.119']}
                strokeWidth={3}
                strokeDasharray="5 5"
                connectNulls={true}
                dot={false}
                legendType="none"
              />
            </>
          )}

          {/* New Stations */}
          {visibleStations.includes('X.5C') && (
            <>
              <Area
                type="monotone"
                dataKey="X.5C_obs"
                stroke={colors['X.5C']}
                strokeWidth={3}
                fill="url(#colorX5C)"
                name={getStationName('X.5C')}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.5C_fc"
                stroke={colors['X.5C']}
                strokeWidth={3}
                strokeDasharray="5 5"
                connectNulls={true}
                dot={false}
                legendType="none"
              />
            </>
          )}
          {visibleStations.includes('X.37A') && (
            <>
              <Area
                type="monotone"
                dataKey="X.37A_obs"
                stroke={colors['X.37A']}
                strokeWidth={3}
                fill="url(#colorX37A)"
                name={getStationName('X.37A')}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.37A_fc"
                stroke={colors['X.37A']}
                strokeWidth={3}
                strokeDasharray="5 5"
                connectNulls={true}
                dot={false}
                legendType="none"
              />
            </>
          )}
          {visibleStations.includes('X.217') && (
            <>
              <Area
                type="monotone"
                dataKey="X.217_obs"
                stroke={colors['X.217']}
                strokeWidth={3}
                fill="url(#colorX217)"
                name={getStationName('X.217')}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.217_fc"
                stroke={colors['X.217']}
                strokeWidth={3}
                strokeDasharray="5 5"
                connectNulls={true}
                dot={false}
                legendType="none"
              />
            </>
          )}

          {/* Brush for zoom and pan */}
          <Brush
            dataKey="period"
            height={30}
            stroke="#667eea"
            fill="#f0f0f0"
            travellerWidth={10}
            onChange={handleBrushChange}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics Panel - Based on Brush Range */}
      {Object.keys(statistics).length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          background: '#ffffff', 
          /* borderRadius: '10px',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)' */
        }}>
          <h3 style={{ 
            marginBottom: '15px', 
            color: '#667eea', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '1.2em'
          }}>
            📊 สถิติระดับน้ำ (ช่วงที่เลือก)
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '15px' 
          }}>
            {Object.entries(statistics).map(([stationId, stats]) => (
              <div 
                key={stationId}
                style={{ 
                  background: '#f8f9fa', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: `2px solid ${colors[stationId] || '#ccc'}`
                }}
              >
                <h4 style={{ 
                  color: colors[stationId] || '#333', 
                  marginBottom: '12px',
                  fontSize: '1.1em',
                  fontWeight: 'bold'
                }}>
                  {getStationName(stationId)}
                </h4>
                <div style={{ fontSize: '0.95em', lineHeight: '2', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>สูงสุด:</span>
                    <strong style={{ color: '#d32f2f' }}>{stats.max.toFixed(2)} ม.</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>ต่ำสุด:</span>
                    <strong style={{ color: '#1976d2' }}>{stats.min.toFixed(2)} ม.</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>ค่าเฉลี่ย:</span>
                    <strong style={{ color: '#388e3c' }}>{stats.avg.toFixed(2)} ม.</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

     
    </div>
  );
};

export default WaterLevelChart;
