import React from 'react';

const StationCard = ({ station, currentLevel, status }) => {
  const statusColors = {
    normal: 'level-normal',
    warning: 'level-warning',
    critical: 'level-critical'
  };

  const statusText = {
    normal: 'ปกติ',
    warning: 'เฝ้าระวัง',
    critical: 'วิกฤต'
  };

  const percentage = currentLevel ? ((currentLevel / parseFloat(station.bank_level)) * 100).toFixed(2) : 0;

  return (
    <div className="card">
      <h2>สถานี {station.station_id}</h2>
      <div className="station-info">
        <div className="info-row">
          <span className="info-label">ชื่อสถานี:</span>
          <span className="info-value">{station.station_name || station.subbasin_name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">ละติจูด:</span>
          <span className="info-value">{parseFloat(station.lat).toFixed(6)}°</span>
        </div>
        <div className="info-row">
          <span className="info-label">ลองจิจูด:</span>
          <span className="info-value">{parseFloat(station.lon).toFixed(6)}°</span>
        </div>
        <div className="info-row">
          <span className="info-label">ระดับตลิ่ง:</span>
          <span className="info-value">{parseFloat(station.bank_level).toFixed(2)} ม.</span>
        </div>
        <div className="info-row">
          <span className="info-label">ระดับน้ำปัจจุบัน:</span>
          <span className="info-value">
            {currentLevel ? `${currentLevel} ม.` : 'ไม่มีข้อมูล'}
          </span>
        </div>
        {currentLevel && (
          <div className="info-row">
            <span className="info-label">เปอร์เซ็นต์:</span>
            <span className="info-value">{percentage}%</span>
          </div>
        )}
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <span className={`level-indicator ${statusColors[status]}`}>
            {statusText[status]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StationCard;
