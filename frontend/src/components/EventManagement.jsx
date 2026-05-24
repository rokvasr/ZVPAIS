import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TYPE_COLORS = {
  gaisras: '#e53935',
  'medžiagų išsiliejimas': '#fb8c00',
  stichija: '#43a047',
};
const getColor = (type) => TYPE_COLORS[type] || '#3388ff';

function MapFlyTo({ selectedEvent }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedEvent?.polygon) return;
    try {
      const geo = JSON.parse(selectedEvent.polygon);
      const layer = L.geoJSON(geo);
      map.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch { }
  }, [selectedEvent, map]);
  return null;
}

const EventManagement = () => {
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [rejectNotes, setRejectNotes] = useState({});

  const statusLabels = () => ({
    naujas:            { label: t('status_new'),       color: '#888' },
    'laukia peržiūros':{ label: t('status_awaiting'),  color: '#e65100' },
    tikrinamas:        { label: t('status_reviewing'),  color: '#1565c0' },
    patvirtintas:      { label: t('status_approved'),   color: '#2e7d32' },
    atmestas:          { label: t('status_rejected'),   color: '#c62828' },
  });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      setEvents(res.data);
      setError('');
    } catch (err) {
      setError(t('events_fetch_error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('event_delete_confirm'))) return;
    try {
      await api.delete(`/events/${id}`);
      const updated = events.filter(e => e.idEvent !== id);
      setEvents(updated);
      if (selectedEvent?.idEvent === id) setSelectedEvent(null);
      const updatedFiltered = updated.filter(e =>
        (!filterType || e.eventType === filterType) &&
        (!filterStatus || e.status === filterStatus)
      );
      const newTotalPages = Math.ceil(updatedFiltered.length / PAGE_SIZE);
      if (page > newTotalPages) setPage(Math.max(1, newTotalPages));
    } catch {
      alert(t('event_delete_error'));
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/events/${id}/approve`);
      setEvents(events.map(e => e.idEvent === id ? { ...e, status: 'patvirtintas' } : e));
    } catch (err) {
      alert(t('event_approve_error'));
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    const notes = rejectNotes[id] || '';
    try {
      await api.post(`/events/${id}/reject`, { notes });
      setEvents(events.map(e => e.idEvent === id ? { ...e, status: 'atmestas' } : e));
      setRejectNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (err) {
      alert(t('event_reject_error'));
      console.error(err);
    }
  };

  const StatusBadge = ({ status }) => {
    const labels = statusLabels();
    const s = labels[status] || { label: status, color: '#888' };
    return (
      <span style={{ background: s.color, color: '#fff', padding: '2px 7px', borderRadius: '3px', fontSize: '0.82em', whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    );
  };

  const pending = events.filter(e => e.status === 'laukia peržiūros');

  const filtered = events.filter(e =>
    (!filterType || e.eventType === filterType) &&
    (!filterStatus || e.status === filterStatus)
  );

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const geoJsonData = {
    type: 'FeatureCollection',
    features: filtered
      .filter(e => e.polygon)
      .map(e => ({
        type: 'Feature',
        geometry: (() => { try { return JSON.parse(e.polygon); } catch { return null; } })(),
        properties: { id: e.idEvent, eventType: e.eventType, selected: selectedEvent?.idEvent === e.idEvent }
      }))
      .filter(f => f.geometry)
  };

  const polygonStyle = (feature) => ({
    fillColor: getColor(feature.properties.eventType),
    weight: feature.properties.selected ? 3 : 1.5,
    color: feature.properties.selected ? '#000' : '#fff',
    fillOpacity: feature.properties.selected ? 0.75 : 0.45,
  });

  const onEachFeature = (feature, layer) => {
    const ev = events.find(e => e.idEvent === feature.properties.id);
    if (ev) layer.on('click', () => setSelectedEvent(ev));
  };

  if (loading) return <div>{t('loading')}</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      {isSpecialist && pending.length > 0 && (
        <div style={{ marginBottom: '20px', border: '2px solid #e65100', borderRadius: '6px', padding: '12px', background: '#fff8f5' }}>
          <h3 style={{ margin: '0 0 10px', color: '#e65100' }}>⚠ {t('status_awaiting')} ({pending.length})</h3>
          {pending.map(ev => (
            <div key={ev.idEvent} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap', borderBottom: '1px solid #ffe0cc', paddingBottom: '8px' }}>
              <span style={{ minWidth: '24px', fontWeight: 'bold' }}>#{ev.idEvent}</span>
              <span style={{ background: getColor(ev.eventType), color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.82em' }}>{ev.eventType}</span>
              <span>{new Date(ev.eventDate).toLocaleDateString('lt-LT')}</span>
              {ev.location && <span style={{ color: '#555' }}>{ev.location}</span>}
              <Link to={`/events/${ev.idEvent}/calculation`} style={{ ...btn, marginLeft: 'auto' }}>{t('event_view_calc')}</Link>
              <button onClick={() => handleApprove(ev.idEvent)} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer' }}>
                {t('event_approve')}
              </button>
              <input
                type="text"
                placeholder={t('event_reject_reason')}
                value={rejectNotes[ev.idEvent] || ''}
                onChange={e => setRejectNotes(prev => ({ ...prev, [ev.idEvent]: e.target.value }))}
                style={{ width: '180px', padding: '3px 6px', fontSize: '0.85em' }}
              />
              <button onClick={() => handleReject(ev.idEvent)} style={{ background: '#c62828', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer' }}>
                {t('event_reject')}
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginBottom: '12px' }}>{t('events_title')}</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">{t('events_filter_all_types')}</option>
          <option value="gaisras">{t('event_type_fire')}</option>
          <option value="medžiagų išsiliejimas">{t('event_type_spill')}</option>
          <option value="stichija">{t('event_type_disaster')}</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">{t('events_filter_all_statuses')}</option>
          <option value="naujas">{t('status_new')}</option>
          <option value="laukia peržiūros">{t('status_awaiting')}</option>
          <option value="tikrinamas">{t('status_reviewing')}</option>
          <option value="patvirtintas">{t('status_approved')}</option>
          <option value="atmestas">{t('status_rejected')}</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>{t('type_col')}</th>
                <th style={th}>{t('date_col')}</th>
                <th style={th}>{t('loc_col')}</th>
                <th style={th}>{t('status_col')}</th>
                <th style={{ ...th, minWidth: '220px' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>{t('events_none_found')}</td></tr>
              )}
              {paginated.map(event => (
                <tr
                  key={event.idEvent}
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    cursor: 'pointer',
                    background: selectedEvent?.idEvent === event.idEvent ? '#e8f4fd' : 'transparent',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <span style={{ background: getColor(event.eventType), color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                      {event.eventType}
                    </span>
                  </td>
                  <td style={td}>{new Date(event.eventDate).toLocaleDateString('lt-LT')}</td>
                  <td style={td}>{event.location || '—'}</td>
                  <td style={td}><StatusBadge status={event.status} /></td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Link to={`/events/${event.idEvent}/calculation`} style={btn}>{t('event_damage_link')}</Link>
                      {isSpecialist && (
                        <>
                          <Link to={`/events/edit/${event.idEvent}`} style={btn}>{t('edit')}</Link>
                          <button onClick={() => handleDelete(event.idEvent)} style={btnDanger}>{t('delete')}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btn}>
                &lsaquo; {t('page_prev')}
              </button>
              <span style={{ fontSize: '0.9em' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={btn}>
                {t('page_next')} &rsaquo;
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '6px' }}>
            <Link to="/events/new" style={btn}>{t('events_new')}</Link>
          </div>
          <MapContainer
            center={[55.0, 24.0]}
            zoom={7}
            style={{ height: '520px', width: '100%', borderRadius: '4px', border: '1px solid #ddd' }}
            maxBounds={[[53.5, 20.0], [57.0, 27.5]]} maxBoundsViscosity={1.0} minZoom={7}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <GeoJSON
              key={JSON.stringify(geoJsonData)}
              data={geoJsonData}
              style={polygonStyle}
              onEachFeature={onEachFeature}
            />
            <MapFlyTo selectedEvent={selectedEvent} />
          </MapContainer>

          {selectedEvent && (
            <div style={{ marginTop: '8px', padding: '10px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9em' }}>
              <strong>{selectedEvent.eventType}</strong> · {new Date(selectedEvent.eventDate).toLocaleDateString('lt-LT')}<br />
              <StatusBadge status={selectedEvent.status} /><br />
              {selectedEvent.location && <span>{selectedEvent.location}<br /></span>}
              {selectedEvent.description && <span style={{ color: '#555' }}>{selectedEvent.description}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const th = { padding: '7px 10px', textAlign: 'left', borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' };
const td = { padding: '7px 10px' };
const btn = { display: 'inline-block', padding: '3px 10px', borderRadius: '4px', border: '1px solid #bbb', background: '#f0f0f0', color: '#333', cursor: 'pointer', fontSize: '0.83em', textDecoration: 'none', lineHeight: '1.6', fontFamily: 'inherit' };
const btnDanger = { ...btn, background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' };

export default EventManagement;
