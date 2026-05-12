import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import EventWindDispersion from './EventWindDispersion';
import L from 'leaflet';
import leafletImage from 'leaflet-image';
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

function FitPolygon({ polygon }) {
  const map = useMap();
  useEffect(() => {
    if (!polygon) return;
    try {
      const layer = L.geoJSON(JSON.parse(polygon));
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    } catch { }
  }, [polygon, map]);
  return null;
}

const CalculationReview = () => {
  const { id } = useParams();
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();
  const mapRef = useRef(null);

  const [breakdown, setBreakdown] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [showDispersion, setShowDispersion] = useState(false);

  const componentLabel = (type) => ({ water: t('calc_comp_water'), soil: t('calc_comp_soil'), air: t('calc_comp_air') }[type] || type);
  const substanceLabel = (type) => ({ standard: t('mat_standard'), bds7: t('mat_bds7'), suspended: t('mat_suspended') }[type] || '-');

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [breakdownRes, eventRes] = await Promise.all([
        api.get(`/calculation/event/${id}`),
        api.get(`/events/${id}`)
      ]);
      setBreakdown(breakdownRes.data);
      setEventData(eventRes.data);
      setError('');
    } catch (err) {
      setError(t('calc_load_error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!window.confirm(t('calc_confirm_recalc'))) return;
    try {
      setRecalculating(true);
      const res = await api.post(`/calculation/event/${id}/recalculate`);
      setBreakdown(res.data);
    } catch (err) {
      alert(t('calc_recalc_error'));
      console.error(err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleDownloadPdf = () => {
    setDownloading(true);
    const doDownload = async (mapImageBase64) => {
      try {
        const res = await api.post(
          `/reports/event/${id}/pdf`,
          { mapImageBase64 },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `ataskaita-ivykis-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {
        alert(t('calc_pdf_error'));
      } finally {
        setDownloading(false);
      }
    };

    const map = mapRef.current;
    if (map) {
      leafletImage(map, (err, canvas) => {
        const base64 = (!err && canvas) ? canvas.toDataURL('image/png') : null;
        doDownload(base64);
      });
    } else {
      doDownload(null);
    }
  };

  if (loading) return <div>{t('loading')}</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!breakdown) return null;

  const polygon = eventData?.polygon ?? null;
  const geoJsonData = polygon ? (() => { try { return JSON.parse(polygon); } catch { return null; } })() : null;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <Link to="/events">{t('calc_back')}</Link>
        <h2 style={{ margin: 0 }}>Žalos skaičiavimas — Įvykis #{breakdown.eventId}</h2>
      </div>

      <div style={{ marginBottom: '12px', color: '#555' }}>
        {t('calc_in_label')} <strong>{breakdown.indexingCoefficient}</strong>
      </div>

      {breakdown.objects.length === 0 ? (
        <p>{t('calc_no_objects')}</p>
      ) : (
        breakdown.objects.map(obj => (
          <div key={obj.objectId} style={{ marginBottom: '24px', border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
            <h3 style={{ margin: '0 0 8px' }}>
              {obj.objectName}
              {obj.componentType && <span style={{ fontSize: '0.8em', marginLeft: '8px', color: '#666' }}>({componentLabel(obj.componentType)})</span>}
              {obj.kKat && <span style={{ fontSize: '0.8em', marginLeft: '8px', color: '#666' }}>K_kat: {obj.kKat}</span>}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={th}>{t('calc_mat_col')}</th>
                  <th style={th}>{t('calc_type_col')}</th>
                  <th style={th}>T_n (EUR/t)</th>
                  <th style={th}>I_n</th>
                  <th style={th}>Q_n (t)</th>
                  <th style={th}>K_kat</th>
                  <th style={th}>{t('calc_pollution_size')}</th>
                  <th style={th}>Z_n (EUR)</th>
                </tr>
              </thead>
              <tbody>
                {obj.materials.map((m, i) => (
                  <tr key={i}>
                    <td style={td}>{m.materialName}</td>
                    <td style={td}>{substanceLabel(m.substanceType)}</td>
                    <td style={td}>{Number(m.tn).toFixed(2)}</td>
                    <td style={td}>{Number(m.in).toFixed(4)}</td>
                    <td style={td}>{Number(m.qn).toFixed(4)}</td>
                    <td style={td}>{Number(m.kKat).toFixed(2)}</td>
                    <td style={td}>{Number(m.pollutionSize).toFixed(2)}</td>
                    <td style={{ ...td, fontWeight: 'bold' }}>{Number(m.zn).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign: 'right', fontWeight: 'bold' }}>{t('calc_obj_total')}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#555' }}>{Number(obj.objectPollutionSize).toFixed(2)}</td>
                  <td style={{ ...td, fontWeight: 'bold', color: '#c00' }}>{Number(obj.objectDamage).toFixed(2)} EUR</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))
      )}

      <div style={{ textAlign: 'right', marginTop: '8px' }}>
        <div style={{ color: '#555', marginBottom: '4px' }}>
          {t('calc_total_pollution')} <strong>{Number(breakdown.totalPollutionSize).toFixed(2)}</strong>
        </div>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
          {t('calc_total_damage')} <span style={{ color: '#c00' }}>{Number(breakdown.totalDamage).toFixed(2)} EUR</span>
        </div>
      </div>

      {geoJsonData && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>{t('calc_map_title')}</div>
          <MapContainer
            ref={mapRef}
            center={[55.0, 24.0]}
            zoom={7}
            style={{ height: '360px', width: '100%', borderRadius: '4px', border: '1px solid #ddd' }}
            maxBounds={[[53.5, 20.0], [57.0, 27.5]]} maxBoundsViscosity={1.0} minZoom={7}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <GeoJSON
              data={geoJsonData}
              style={{ fillColor: '#3388ff', weight: 2, color: '#1a5fa8', fillOpacity: 0.4 }}
            />
            <FitPolygon polygon={polygon} />
          </MapContainer>
        </div>
      )}

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        {isSpecialist && (
          <button onClick={handleRecalculate} disabled={recalculating}>
            {recalculating ? t('calc_recalculating') : t('calc_recalc_btn')}
          </button>
        )}
        {eventData?.status !== 'naujas' && (
          <button onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? t('calc_generating') : t('calc_download_pdf')}
          </button>
        )}
      </div>

      {['gaisras', 'gaisas'].includes(eventData?.eventType) && (
        <div style={{ marginTop: '28px', borderTop: '2px solid #e5e7eb', paddingTop: '16px' }}>
          <button
            onClick={() => setShowDispersion(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8', padding: 0 }}
          >
            {showDispersion ? '▼' : '▶'} {t('calc_wind_section')}
          </button>
          {showDispersion && (
            <div style={{ marginTop: '16px' }}>
              <EventWindDispersion breakdown={breakdown} eventData={eventData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const th = { padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #ddd' };
const td = { padding: '6px 10px', borderBottom: '1px solid #eee' };

export default CalculationReview;