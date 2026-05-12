import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getColorByType = (type) => {
  switch (type) {
    case 'gaisras': return '#ff4444';
    case 'medžiagų išsiliejimas': return '#ffaa00';
    case 'stichija': return '#44aa44';
    default: return '#3388ff';
  }
};

const polygonStyle = (feature) => ({
  fillColor: getColorByType(feature.properties?.eventType || 'unknown'),
  weight: 2,
  opacity: 1,
  color: 'white',
  fillOpacity: 0.5,
});

const EventMap = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events');
        setEvents(response.data);
      } catch (err) {
        setError(t('map_fetch_error'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div>{t('map_loading')}</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const approved = events.filter(e => e.status === 'patvirtintas' && e.polygon);

  const geoJsonData = {
    type: 'FeatureCollection',
    features: approved.map(event => {
      try {
        return {
          type: 'Feature',
          geometry: JSON.parse(event.polygon),
          properties: {
            id: event.idEvent,
            eventType: event.eventType,
            eventDate: new Date(event.eventDate).toLocaleDateString('lt-LT'),
            location: event.location,
          },
        };
      } catch { return null; }
    }).filter(Boolean),
  };

  const onEachFeature = (feature, layer) => {
    if (!feature.properties) return;
    const { eventType, eventDate, location, id } = feature.properties;
    layer.bindPopup(`
      <div style="min-width:160px">
        <strong>${eventType}</strong><br/>
        ${eventDate}<br/>
        ${location ? `${location}<br/>` : ''}
        <a href="/events/${id}/calculation" style="font-size:0.9em">${t('map_view_calc')}</a>
      </div>
    `);
  };

  return (
    <div>
      <h2>{t('map_title')}</h2>
      <p style={{ color: '#666', marginTop: 0 }}>{approved.length} {t('status_approved').toLowerCase()}</p>
      <MapContainer center={[55.0, 24.0]} zoom={7} style={{ height: '600px', width: '100%' }}
        maxBounds={[[53.5, 20.0], [57.0, 27.5]]} maxBoundsViscosity={1.0} minZoom={7}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <GeoJSON data={geoJsonData} style={polygonStyle} onEachFeature={onEachFeature} />
      </MapContainer>
    </div>
  );
};

export default EventMap;