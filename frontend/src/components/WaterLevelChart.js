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

// Custom Tooltip - hide forecast at connection point (day 12)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const isConnectionPoint = dataPoint?._isConnectionPoint;

    return (
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
        {payload.map((entry, index) => {
          // At connection point (day 12): hide Forecast
          if (isConnectionPoint && entry.name.includes('Forecast')) {
            return null;
          }
          return (
            <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
              {entry.name}: {entry.value?.toFixed(2)} ม.
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

const WaterLevelChart = ({ data, dateRange, setDateRange, metadata, selectedStations }) => {
  // Track the last observe period for the separator line
  const [lastObservePeriodState, setLastObservePeriodState] = React.useState(null);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const setQuickRange = (days) => {
    const end = new Date('2025-11-16');  // Latest forecast data
    const start = new Date('2025-11-16');

    if (days === 'all') {
      setDateRange({ start: '2025-10-24', end: '2025-11-16', aggregation: 'day' });
    } else {
      start.setDate(end.getDate() - days);
      const aggregation = 'day';  // Always use day for this dataset
      setDateRange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
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

    console.log('📅 Current Thailand Date:', currentDate);
    console.log('🕐 Browser Local Time:', now.toLocaleString());
    console.log('🇹🇭 Thailand Time:', now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }));

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
        // Keep track of last observe data and period
        lastObserveData = {
          'X.274': parseFloat(item.x_274_avg),
          'X.119A': parseFloat(item.x_119a_avg),
          'X.119': parseFloat(item.x_119_avg)
        };
        lastObservePeriod = period;
      } else if (isFutureDate) {
        // Forecast data (dashed line) - only for future dates
        groupedData[period]['X.274_fc'] = parseFloat(item.x_274_avg);
        groupedData[period]['X.119A_fc'] = parseFloat(item.x_119a_avg);
        groupedData[period]['X.119_fc'] = parseFloat(item.x_119_avg);
      }
      // else: ignore forecast data for past dates
    });

    console.log('🎯 Last Observe Period:', lastObservePeriod);

    // Strategy: Create smooth connection between Observe and Forecast lines
    // Add BOTH observe data to forecast line AND forecast data to connection point
    if (lastObserveData && lastObservePeriod && currentDate && groupedData[currentDate]) {
      const firstForecast = {
        'X.274': groupedData[currentDate]['X.274_fc'],
        'X.119A': groupedData[currentDate]['X.119A_fc'],
        'X.119': groupedData[currentDate]['X.119_fc']
      };
      
      // Step 1: Add forecast at last observe date (day 12) - this shows start of dashed line
      if (groupedData[lastObservePeriod] && firstForecast['X.274']) {
        groupedData[lastObservePeriod]['X.274_fc'] = groupedData[lastObservePeriod]['X.274_obs'];
        groupedData[lastObservePeriod]['X.119A_fc'] = groupedData[lastObservePeriod]['X.119A_obs'];
        groupedData[lastObservePeriod]['X.119_fc'] = groupedData[lastObservePeriod]['X.119_obs'];
        groupedData[lastObservePeriod]['_isConnectionPoint'] = true;
      }
    }


    // Update state with last observe period (for reference, but not used for separator line anymore)
    if (lastObservePeriod && lastObservePeriod !== lastObservePeriodState) {
      setLastObservePeriodState(lastObservePeriod);
    }

    const finalData = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
    
    // Debug: Log connection points
    console.log('📊 Chart Data:');
    finalData.forEach(item => {
      if (item.period >= '2025-11-11' && item.period <= '2025-11-14') {
        console.log(`  ${item.period}:`, {
          obs: item['X.119_obs']?.toFixed(2) || 'null',
          fc: item['X.119_fc']?.toFixed(2) || 'null',
          line: item['X.119_line']?.toFixed(2) || 'null'
        });
      }
    });
    
    return finalData;
  };

  // Filter stations to display
  const getVisibleStations = () => {
    if (!selectedStations || selectedStations.length === 0) {
      return ['X.274', 'X.119A', 'X.119'];
    }
    return selectedStations;
  };

  const visibleStations = getVisibleStations();
  const colors = {
    'X.274': '#8884d8',
    'X.119A': '#82ca9d',
    'X.119': '#ffc658'
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

  return (
    <div className="chart-wrapper">
      <h2 style={{ color: '#667eea', marginBottom: '10px' }}>
        📊 กราฟระดับน้ำ (Observe + Forecast)
        {selectedStations && selectedStations.length > 0 && (
          <span style={{ fontSize: '0.8em', marginLeft: '10px', color: '#82ca9d' }}>
            (แสดง {selectedStations.length} สถานี: {selectedStations.join(', ')})
          </span>
        )}
      </h2>
      <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '15px', fontStyle: 'italic' }}>
        🕐 เส้นแบ่ง Observe | Forecast อ้างอิงเวลาปัจจุบันของประเทศไทย (GMT+7)
      </p>

      <div style={{ marginBottom: '20px' }}>
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
        <ComposedChart data={formatData()} margin={{ top: 20, right: 65, left: 20, bottom: 20 }}>
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
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
                  value: `Observe | Forecast (${thaiDateStr} ${thaiTimeStr})`,
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
                name="X.274 (Observe)"
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.274_fc"
                stroke={colors['X.274']}
                strokeWidth={3}
                strokeDasharray="5 5"
                name="X.274 (Forecast)"
                connectNulls={true}
                dot={false}
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
                name="X.119A (Observe)"
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="X.119A_fc"
                stroke={colors['X.119A']}
                strokeWidth={3}
                strokeDasharray="5 5"
                name="X.119A (Forecast)"
                connectNulls={true}
                dot={false}
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
                name="X.119 (Observe)"
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
                name="X.119 (Forecast)"
                connectNulls={true}
                dot={false}
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
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '10px' }}>
        <h3 style={{ marginBottom: '10px', color: '#667eea' }}>📌 คำอธิบาย:</h3>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div>
            <strong>Observe:</strong> เส้นทึบ + พื้นที่แรเงา (ข้อมูลที่ผ่านมาและวันนี้)
          </div>
          <div>
            <strong>Forecast:</strong> เส้นประ (ข้อมูลคาดการณ์ในอนาคต)
          </div>
        </div>
        <h3 style={{ marginBottom: '10px', color: '#667eea' }}>ข้อมูลระดับตลิ่ง:</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {metadata.map(station => (
            <div key={station.id}>
              <strong>{station.station_id}:</strong> {parseFloat(station.bank_level).toFixed(2)} ม.
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WaterLevelChart;
