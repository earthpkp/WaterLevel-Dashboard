import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const StationMap = ({ metadata, latestData, onStationSelect, selectedStations }) => {
    // Calculate center from stations
    const centerLat = metadata.length > 0
        ? metadata.reduce((sum, s) => sum + parseFloat(s.lat), 0) / metadata.length
        : 6.0;
    const centerLon = metadata.length > 0
        ? metadata.reduce((sum, s) => sum + parseFloat(s.lon), 0) / metadata.length
        : 101.9;

    const handleStationClick = (stationId) => {
        if (selectedStations.includes(stationId)) {
            // Remove from selection
            onStationSelect(selectedStations.filter(id => id !== stationId));
        } else {
            // Add to selection
            onStationSelect([...selectedStations, stationId]);
        }
    };

    const getStationStatus = (station) => {
        if (!latestData) return 'normal';
        const columnName = `x_${station.station_id.toLowerCase().replace('.', '')}`;
        const currentLevel = latestData[columnName];
        if (!currentLevel) return 'normal';

        const percentage = (parseFloat(currentLevel) / parseFloat(station.bank_level)) * 100;
        if (percentage >= 100) return 'critical';
        if (percentage >= 80) return 'warning';
        return 'normal';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'critical': return '#ff4444';
            case 'warning': return '#ffc107';
            default: return '#51cf66';
        }
    };

    const createCustomIcon = (station, status) => {
        const color = getStatusColor(status);
        const isSelected = selectedStations.includes(station.station_id);
        return L.divIcon({
            className: 'custom-marker',
            html: `
        <div style="
          background-color: ${color};
          width: ${isSelected ? '40px' : '30px'};
          height: ${isSelected ? '40px' : '30px'};
          border-radius: 50%;
          border: ${isSelected ? '4px' : '3px'} solid ${isSelected ? '#667eea' : 'white'};
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: ${isSelected ? '14px' : '12px'};
          transition: all 0.3s;
          ${isSelected ? 'box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);' : ''}
        ">
          ${station.station_id.replace('X.', '')}
          ${isSelected ? '<div style="position:absolute;top:-5px;right:-5px;background:#667eea;width:15px;height:15px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:10px;">✓</div>' : ''}
        </div>
      `,
            iconSize: [isSelected ? 40 : 30, isSelected ? 40 : 30],
            iconAnchor: [isSelected ? 20 : 15, isSelected ? 20 : 15]
        });
    };

    return (
        <div className="chart-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ color: '#667eea', margin: 0 }}>
                    🗺️ แผนที่แสดงตำแหน่งสถานีตรวจวัด
                    {selectedStations.length > 0 && (
                        <span style={{ fontSize: '0.7em', marginLeft: '10px', color: '#82ca9d' }}>
                            ({selectedStations.length} สถานีที่เลือก)
                        </span>
                    )}
                </h2>
                {selectedStations.length > 0 && (
                    <button
                        onClick={() => onStationSelect([])}
                        style={{
                            padding: '8px 16px',
                            background: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}
                    >
                        ✕ ยกเลิกการเลือกทั้งหมด
                    </button>
                )}
            </div>

            <MapContainer
                center={[centerLat, centerLon]}
                zoom={10}
                style={{ height: '1000px', width: '100%', borderRadius: '10px' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {metadata.map((station) => {
                    const status = getStationStatus(station);
                    const columnName = `x_${station.station_id.toLowerCase().replace('.', '')}`;
                    const currentLevel = latestData ? latestData[columnName] : null;
                    const percentage = currentLevel
                        ? ((parseFloat(currentLevel) / parseFloat(station.bank_level)) * 100).toFixed(2)
                        : 0;

                    return (
                        <React.Fragment key={station.id}>
                            {/* Marker */}
                            <Marker
                                position={[parseFloat(station.lat), parseFloat(station.lon)]}
                                icon={createCustomIcon(station, status)}
                                eventHandlers={{
                                    click: () => {
                                        if (onStationSelect) {
                                            handleStationClick(station.station_id);
                                        }
                                    }
                                }}
                            >
                                <Popup>
                                    <div style={{ minWidth: '200px' }}>
                                        <h3 style={{
                                            margin: '0 0 10px 0',
                                            color: '#667eea',
                                            borderBottom: '2px solid #667eea',
                                            paddingBottom: '5px'
                                        }}>
                                            สถานี {station.station_id}
                                        </h3>
                                        <p style={{ margin: '5px 0' }}>
                                            <strong>ลุ่มน้ำ:</strong> {station.subbasin_name}
                                        </p>
                                        <p style={{ margin: '5px 0' }}>
                                            <strong>พิกัด:</strong><br />
                                            Lat: {parseFloat(station.lat).toFixed(6)}°<br />
                                            Lon: {parseFloat(station.lon).toFixed(6)}°
                                        </p>
                                        <p style={{ margin: '5px 0' }}>
                                            <strong>ระดับตลิ่ง:</strong> {parseFloat(station.bank_level).toFixed(2)} ม.
                                        </p>
                                        {currentLevel && (
                                            <>
                                                <p style={{ margin: '5px 0' }}>
                                                    <strong>ระดับน้ำปัจจุบัน:</strong> {currentLevel} ม.
                                                </p>
                                                <p style={{ margin: '5px 0' }}>
                                                    <strong>เปอร์เซ็นต์:</strong> {percentage}%
                                                </p>
                                                <div style={{
                                                    marginTop: '10px',
                                                    padding: '5px 10px',
                                                    borderRadius: '5px',
                                                    textAlign: 'center',
                                                    fontWeight: 'bold',
                                                    background: getStatusColor(status),
                                                    color: 'white'
                                                }}>
                                                    {status === 'critical' ? '🚨 วิกฤต' :
                                                        status === 'warning' ? '⚠️ เฝ้าระวัง' :
                                                            '✅ ปกติ'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Circle for coverage area */}
                            <Circle
                                center={[parseFloat(station.lat), parseFloat(station.lon)]}
                                radius={2000}
                                pathOptions={{
                                    color: getStatusColor(status),
                                    fillColor: getStatusColor(status),
                                    fillOpacity: 0.1
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            <div style={{
                marginTop: '15px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '10px',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#51cf66',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                    <span>ปกติ (&lt;80%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffc107',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                    <span>เฝ้าระวัง (80-99%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ff4444',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                    <span>วิกฤต (≥100%)</span>
                </div>
            </div>
        </div>
    );
};

export default StationMap;
