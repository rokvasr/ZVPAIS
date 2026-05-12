import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
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

const DONE_STATUSES = ['laukia peržiūros', 'tikrinamas', 'patvirtintas', 'atmestas'];

function FitAndCapture({ polygon, onCapture }) {
  const map = useMap();
  useEffect(() => {
    if (!polygon) { onCapture(map, null); return; }
    try {
      const layer = L.geoJSON(JSON.parse(polygon));
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    } catch { }
    const timer = setTimeout(() => onCapture(map, polygon), 2500);
    return () => clearTimeout(timer);
  }, [polygon, onCapture]);
  return null;
}

const ReportList = () => {
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [pdfJob, setPdfJob] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (err) {
      setError(t('reports_fetch_error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('report_delete_confirm'))) return;
    try {
      await api.delete(`/reports/${id}`);
      setReports(reports.filter(r => r.idDamageEvaluation !== id));
    } catch (err) {
      alert(t('report_delete_error'));
      console.error(err);
    }
  };

  const handleDownloadPdf = async (report) => {
    setDownloadingId(report.idDamageEvaluation);
    try {
      const eventRes = await api.get(`/events/${report.eventId}`);
      const polygon = eventRes.data.polygon || null;
      setPdfJob({ eventId: report.eventId, polygon });
    } catch {
      alert(t('report_pdf_error'));
      setDownloadingId(null);
    }
  };

  const handleMapReady = async (map, polygon) => {
    const captureAndDownload = async (base64) => {
      try {
        const res = await api.post(
          `/reports/event/${pdfJob.eventId}/pdf`,
          { mapImageBase64: base64 },
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `ataskaita-ivykis-${pdfJob.eventId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {
        alert(t('report_pdf_error'));
      } finally {
        setPdfJob(null);
        setDownloadingId(null);
      }
    };

    if (polygon && map) {
      leafletImage(map, (err, canvas) => {
        if (err) console.error('leaflet-image capture error:', err);
        const base64 = (!err && canvas) ? canvas.toDataURL('image/png') : null;
        captureAndDownload(base64);
      });
    } else {
      await captureAndDownload(null);
    }
  };

  if (loading) return <div>{t('loading')}</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h2>{t('reports_title')}</h2>
      {isSpecialist && <Link to="/reports/new">{t('reports_new_btn')}</Link>}
      {reports.length === 0 ? (
        <p style={{ marginTop: '16px' }}>{t('reports_none')}</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('report_event_type')}</th>
              <th>{t('report_event_date')}</th>
              <th>{t('loc_col')}</th>
              <th>{t('status_col')}</th>
              <th>{t('report_assess_date')}</th>
              <th>{t('report_damage_col')}</th>
              <th>{t('report_monetary_col')}</th>
              <th>{t('notes_col') ?? 'Pastabos'}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => {
              const calcsDone = DONE_STATUSES.includes(r.eventStatus);
              const isDownloading = downloadingId === r.idDamageEvaluation;
              return (
                <tr key={r.idDamageEvaluation}>
                  <td>{r.idDamageEvaluation}</td>
                  <td>{r.eventType}</td>
                  <td>{r.eventDate ? new Date(r.eventDate).toLocaleDateString('lt-LT') : '—'}</td>
                  <td>{r.eventLocation || '—'}</td>
                  <td>{r.eventStatus || '—'}</td>
                  <td>{new Date(r.data).toLocaleDateString('lt-LT')}</td>
                  <td>{r.zalosDydis != null ? r.zalosDydis.toFixed(2) : '—'}</td>
                  <td>{r.piniginisDydis != null ? r.piniginisDydis.toFixed(2) : '—'}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.notes || '—'}</td>
                  <td>
                    <Link to={`/events/${r.eventId}/calculation`}>{t('report_calc_link')}</Link>
                    {calcsDone && (
                      <>
                        {' | '}
                        <button
                          onClick={() => handleDownloadPdf(r)}
                          disabled={!!downloadingId}
                          style={{ marginLeft: '2px' }}
                        >
                          {isDownloading ? t('report_generating') : 'PDF'}
                        </button>
                      </>
                    )}
                    {isSpecialist && (
                      <>
                        {' | '}
                        <Link to={`/reports/edit/${r.idDamageEvaluation}`}>{t('edit')}</Link>
                        {' '}
                        <button onClick={() => handleDelete(r.idDamageEvaluation)} style={{ marginLeft: '4px' }}>
                          {t('delete')}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {pdfJob && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '700px', height: '450px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <MapContainer
            center={[55.0, 24.0]}
            zoom={7}
            style={{ width: '700px', height: '450px' }}
            zoomControl={false}
            attributionControl={false}
            maxBounds={[[53.5, 20.0], [57.0, 27.5]]} maxBoundsViscosity={1.0} minZoom={7}
            preferCanvas={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              crossOrigin="anonymous"
            />
            {pdfJob.polygon && (() => {
              try {
                return (
                  <GeoJSON
                    data={JSON.parse(pdfJob.polygon)}
                    style={{ fillColor: '#3388ff', weight: 2, color: '#1a5fa8', fillOpacity: 0.4 }}
                  />
                );
              } catch { return null; }
            })()}
            <FitAndCapture polygon={pdfJob.polygon} onCapture={handleMapReady} />
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default ReportList;
