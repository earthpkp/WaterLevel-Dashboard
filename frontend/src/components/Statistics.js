import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Statistics = ({ metadata }) => {
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    fetchStatistics();
  }, [metadata]);

  const fetchStatistics = async () => {
    try {
      const stats = {};
      for (const station of metadata) {
        const stationId = station.station_id.toLowerCase().replace('.', '');
        const response = await axios.get(`${API_URL}/api/statistics/${stationId}`);
        stats[station.station_id] = response.data.data;
      }
      setStatistics(stats);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  return (
    <div className="chart-wrapper">
      <h2 style={{ color: '#667eea', marginBottom: '20px' }}>
        📈 สстатистิก์ระดับน้ำ
      </h2>
      <div className="dashboard-grid">
        {metadata.map((station) => {
          const stat = statistics[station.station_id];
          return (
            <div key={station.id} className="card">
              <h3 style={{ color: '#667eea', marginBottom: '15px' }}>
                สถานี {station.station_id}
              </h3>
              {stat ? (
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-label">ต่ำสุด</div>
                    <div className="stat-value">{parseFloat(stat.min_level).toFixed(2)} ม.</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">สูงสุด</div>
                    <div className="stat-value">{parseFloat(stat.max_level).toFixed(2)} ม.</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">เฉลี่ย</div>
                    <div className="stat-value">{parseFloat(stat.avg_level).toFixed(2)} ม.</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">จำนวนข้อมูล</div>
                    <div className="stat-value">{stat.total_records}</div>
                  </div>
                </div>
              ) : (
                <div>กำลังโหลดข้อมูล...</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Statistics;
