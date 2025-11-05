import React from 'react';
import {
  Area,
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

const WaterLevelChart = ({ data, dateRange, setDateRange, metadata, selectedStations }) => {
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();

    if (days === 'all') {
      setDateRange({ start: '2018-01-01', end: '2025-12-31', aggregation: 'month' });
    } else {
      start.setDate(end.getDate() - days);
      const aggregation = days <= 7 ? 'day' : days <= 90 ? 'day' : 'month';
      setDateRange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        aggregation
      });
    }
  };

  const formatData = () => {
    return data.map(item => ({
      period: item.period,
      'X.274': parseFloat(item.x_274_avg),
      'X.119A': parseFloat(item.x_119a_avg),
      'X.119': parseFloat(item.x_119_avg)
    }));
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

  return (
    <div className="chart-wrapper">
      <h2 style={{ color: '#667eea', marginBottom: '20px' }}>
        📊 กราฟแสดงระดับน้ำตามช่วงเวลา
        {selectedStations && selectedStations.length > 0 && (
          <span style={{ fontSize: '0.8em', marginLeft: '10px', color: '#82ca9d' }}>
            (แสดง {selectedStations.length} สถานี: {selectedStations.join(', ')})
          </span>
        )}
      </h2>

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
          />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />

          {/* Flood Stage Lines (Bank Levels) - Only for visible stations */}
          {metadata
            .filter(station => visibleStations.includes(station.station_id))
            .map((station, index) => {
              const refColors = ['#ff4444', '#ff8844', '#44ff44'];
              return (
                <ReferenceLine
                  key={`bank-${station.id}`}
                  y={parseFloat(station.bank_level)}
                  stroke={refColors[metadata.indexOf(station)]}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: ` ${parseFloat(station.bank_level).toFixed(1)} ม.`,
                    position: 'right',
                    fill: refColors[metadata.indexOf(station)],
                    fontSize: 11,
                    fontWeight: 'bold'
                  }}
                />
              );
            })}

          {/* Area Charts with gradient - Conditionally render based on selection */}
          {visibleStations.includes('X.274') && (
            <Area
              type="monotone"
              dataKey="X.274"
              stroke={colors['X.274']}
              strokeWidth={3}
              fill="url(#colorX274)"
              name="สถานี X.274"
            />
          )}
          {visibleStations.includes('X.119A') && (
            <Area
              type="monotone"
              dataKey="X.119A"
              stroke={colors['X.119A']}
              strokeWidth={3}
              fill="url(#colorX119A)"
              name="สถานี X.119A"
            />
          )}
          {visibleStations.includes('X.119') && (
            <Area
              type="monotone"
              dataKey="X.119"
              stroke={colors['X.119']}
              strokeWidth={3}
              fill="url(#colorX119)"
              name="สถานี X.119"
            />
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
