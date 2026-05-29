import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, Polygon, useMap } from 'react-leaflet';
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

const CONC_BANDS = [
  { min: 0,     max: 1,        color: '#c7e9b4' },
  { min: 1,     max: 10,       color: '#7fcdbb' },
  { min: 10,    max: 100,      color: '#41b6c4' },
  { min: 100,   max: 1000,     color: '#2c7fb8' },
  { min: 1000,  max: 10000,    color: '#f97316' },
  { min: 10000, max: Infinity, color: '#dc2626' },
];


function offsetToLatLon(fireLat, fireLon, downwindM, crosswindM, windFromDeg) {
  const downwindRad  = ((windFromDeg + 180) % 360) * Math.PI / 180;
  const crosswindRad = ((windFromDeg + 270) % 360) * Math.PI / 180;
  const cosLat = Math.cos(fireLat * Math.PI / 180);
  const lat = fireLat + (downwindM * Math.cos(downwindRad) + crosswindM * Math.cos(crosswindRad)) / 111111;
  const lon = fireLon + (downwindM * Math.sin(downwindRad) + crosswindM * Math.sin(crosswindRad)) / (111111 * cosLat);
  return [lat, lon];
}

function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  const cross = (O, A, B) => (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

function deriveStabilityClass(windSpeed, shortwaveRad, cloudCoverPct, isDay) {
  if (isDay) {
    const ins = shortwaveRad > 500 ? 'strong' : shortwaveRad > 250 ? 'moderate' : 'slight';
    if (windSpeed < 2) return ins === 'slight' ? 'B' : 'A';
    if (windSpeed < 3) return ins === 'strong' ? 'A' : ins === 'moderate' ? 'B' : 'C';
    if (windSpeed < 5) return ins === 'strong' ? 'B' : 'C';
    if (windSpeed < 6) return ins === 'strong' ? 'C' : 'D';
    return ins === 'strong' ? 'C' : 'D';
  } else {
    if (windSpeed >= 5) return 'D';
    if (cloudCoverPct > 50) return windSpeed < 2 ? 'E' : 'D';
    return windSpeed < 2 ? 'F' : 'E';
  }
}

async function fetchWindFromApi(lat, lon, eventDate) {
  const dt = new Date(eventDate);
  const date = dt.toISOString().split('T')[0];
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=windspeed_10m,winddirection_10m,shortwave_radiation,cloudcover,is_day&wind_speed_unit=ms&timezone=UTC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  // If the event has no stored time (midnight UTC), default to noon to avoid nighttime stability class.
  const hour       = dt.getUTCHours() === 0 ? 12 : dt.getUTCHours();
  const speed      = data.hourly?.windspeed_10m?.[hour];
  const dir        = data.hourly?.winddirection_10m?.[hour];
  const radiation  = data.hourly?.shortwave_radiation?.[hour] ?? 0;
  const cloudCover = data.hourly?.cloudcover?.[hour] ?? 50;
  const isDay      = data.hourly?.is_day?.[hour] === 1;
  if (speed == null || dir == null) throw new Error('Wind data unavailable');
  return {
    speed:          Math.round(speed * 10) / 10,
    dir:            Math.round(dir),
    stabilityClass: deriveStabilityClass(speed, radiation, cloudCover, isDay),
  };
}

function captureMap(map) {
  return new Promise(resolve => {
    leafletImage(map, (err, canvas) => resolve(!err && canvas ? canvas.toDataURL('image/png') : null));
  });
}

// Fits the polygon map and calls onCapture(map) after tiles settle.
// Uses a ref for the callback so re-renders don't restart the timer.
function FitAndCapture({ polygon, onCapture }) {
  const map = useMap();
  const cbRef = useRef(onCapture);
  useEffect(() => { cbRef.current = onCapture; });

  useEffect(() => {
    if (!polygon) { cbRef.current(map, null); return; }
    try {
      const layer = L.geoJSON(JSON.parse(polygon));
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    } catch { }
    const timer = setTimeout(() => cbRef.current(map, polygon), 2500);
    return () => clearTimeout(timer);
  }, [polygon]); // intentionally omit onCapture — cbRef keeps it fresh
  return null;
}

// Fits to dispersion extent and calls onCapture(map) after tiles settle.
function DispersionFitAndCapture({ dispersion, selectedCompound, onCapture }) {
  const map = useMap();
  const cbRef = useRef(onCapture);
  useEffect(() => { cbRef.current = onCapture; });

  useEffect(() => {
    const pts = selectedCompound.gridPoints
      .map(pt => offsetToLatLon(dispersion.fireLat, dispersion.fireLon, pt.downwindM, pt.crosswindM, dispersion.windDirectionDeg))
      .filter(([lat, lon]) => isFinite(lat) && isFinite(lon));
    if (pts.length > 0) {
      try { map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] }); } catch { }
    }
    const timer = setTimeout(() => cbRef.current(map), 2500);
    return () => clearTimeout(timer);
  }, []); // run once on mount
  return null;
}

const PAGE_SIZE = 10;

const ReportList = () => {
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();
  const eventTypeLabel = type => ({ gaisras: t('event_type_fire'), 'medžiagų išsiliejimas': t('event_type_spill'), stichija: t('event_type_disaster') }[type] ?? type);
  const statusLabel = s => ({ naujas: t('status_new'), 'laukia peržiūros': t('status_awaiting'), tikrinamas: t('status_reviewing'), patvirtintas: t('status_approved'), atmestas: t('status_rejected') }[s] ?? s);
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [pdfJob, setPdfJob]         = useState(null);
  const [dispersionJob, setDispersionJob] = useState(null);
  const [page, setPage] = useState(1);

  // Guards to prevent duplicate captures when re-renders occur mid-flow
  const polygonCapturedRef    = useRef(false);
  const dispersionCapturedRef = useRef(false);

  useEffect(() => { fetchReports(); }, []);

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
      const updated = reports.filter(r => r.idDamageEvaluation !== id);
      setReports(updated);
      const totalPages = Math.ceil(updated.length / PAGE_SIZE);
      if (page > totalPages) setPage(Math.max(1, totalPages));
    } catch (err) {
      alert(t('report_delete_error'));
      console.error(err);
    }
  };

  const handleDownloadPdf = async (report) => {
    setDownloadingId(report.idDamageEvaluation);
    polygonCapturedRef.current    = false;
    dispersionCapturedRef.current = false;
    try {
      const eventRes = await api.get(`/events/${report.eventId}`);
      setPdfJob({
        eventId:     report.eventId,
        polygon:     eventRes.data.polygon || null,
        centroidLat: eventRes.data.centroidLat ?? null,
        centroidLon: eventRes.data.centroidLon ?? null,
        isFireEvent: report.eventType === 'gaisras',
        eventDate:   report.eventDate,
      });
    } catch {
      alert(t('report_pdf_error'));
      setDownloadingId(null);
    }
  };

  const sendPdf = async (eventId, mapImageBase64, dispersionImageBase64, dispersionMeta) => {
    const res = await api.post(
      `/reports/event/${eventId}/pdf`,
      { mapImageBase64, dispersionImageBase64, ...dispersionMeta },
      { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ataskaita-ivykis-${eventId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Step 1: polygon map captured — for fire events, fetch wind + dispersion, then hand off to step 2
  const handleMapReady = async (map, polygon) => {
    if (polygonCapturedRef.current) return;
    polygonCapturedRef.current = true;

    const polygonImage = polygon && map ? await captureMap(map) : null;

    if (pdfJob.isFireEvent) {
      try {
        const { centroidLat, centroidLon } = pdfJob;
        if (centroidLat && centroidLon) {
          const wind = await fetchWindFromApi(centroidLat, centroidLon, pdfJob.eventDate);
          const res  = await api.post(`/wind-dispersion/calculate-from-event/${pdfJob.eventId}`, {
            fireDurationHours: 1,
            windSpeedMs:       wind.speed,
            windDirectionDeg:  wind.dir,
            stabilityClass:    wind.stabilityClass,
            sourceHeightM:     10,
            fireLat:           centroidLat,
            fireLon:           centroidLon,
          });
          const dispersion = res.data?.dispersion;
          // Pick the compound with the highest emission rate for the map snapshot
          const best = dispersion?.compounds
            ?.slice()
            .sort((a, b) => b.emissionRateGs - a.emissionRateGs)[0];
          if (best) {
            dispersionCapturedRef.current = false;
            setDispersionJob({
              eventId: pdfJob.eventId, polygonImage, dispersion, selectedCompound: best, polygon: pdfJob.polygon,
              windMeta: {
                dispersionWindSpeedMs:      wind.speed,
                dispersionWindDirectionDeg: wind.dir,
                dispersionStabilityClass:   wind.stabilityClass,
              },
            });
            return; // step 2 will send the PDF
          }
        }
      } catch (err) {
        console.warn('Auto-dispersion for PDF failed, generating without it:', err);
      }
    }

    // Non-fire event or dispersion failed → send PDF with polygon map only
    try { await sendPdf(pdfJob.eventId, polygonImage, null); }
    catch { alert(t('report_pdf_error')); }
    finally { setPdfJob(null); setDownloadingId(null); }
  };

  // Step 2: dispersion map captured → send PDF with both images
  const handleDispersionCapture = async (map) => {
    if (dispersionCapturedRef.current) return;
    dispersionCapturedRef.current = true;

    const dispersionImage = map ? await captureMap(map) : null;
    try { await sendPdf(dispersionJob.eventId, dispersionJob.polygonImage, dispersionImage, dispersionJob.windMeta); }
    catch { alert(t('report_pdf_error')); }
    finally { setDispersionJob(null); setPdfJob(null); setDownloadingId(null); }
  };

  const btn = { display: 'inline-block', padding: '3px 10px', borderRadius: '4px', border: '1px solid #bbb', background: '#f0f0f0', color: '#333', cursor: 'pointer', fontSize: '0.83em', textDecoration: 'none', lineHeight: '1.6', fontFamily: 'inherit' };
  const btnDanger = { ...btn, background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' };

  if (loading) return <div>{t('loading')}</div>;
  if (error)   return <div style={{ color: 'red' }}>{error}</div>;

  const totalPages = Math.ceil(reports.length / PAGE_SIZE);
  const paginated = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h2>{t('reports_title')}</h2>
      {isSpecialist && <Link to="/reports/new" style={btn}>{t('reports_new_btn')}</Link>}
      {reports.length === 0 ? (
        <p style={{ marginTop: '16px' }}>{t('reports_none')}</p>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <table border="1" cellPadding="6" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.88em' }}>
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t('report_event_type')}</th>
                <th>{t('report_event_date')}</th>
                <th>{t('loc_col')}</th>
                <th>{t('status_col')}</th>
                <th>{t('report_assess_date')}</th>
                <th>{t('report_damage_col')}</th>
                <th>{t('report_monetary_col')}</th>
                <th>{t('notes_col')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => {
                const calcsDone   = DONE_STATUSES.includes(r.eventStatus);
                const isDownloading = downloadingId === r.idDamageEvaluation;
                return (
                  <tr key={r.idDamageEvaluation}>
                    <td style={{ wordBreak: 'break-word' }}>{eventTypeLabel(r.eventType)}</td>
                    <td>{r.eventDate ? new Date(r.eventDate).toLocaleDateString('lt-LT') : '—'}</td>
                    <td style={{ wordBreak: 'break-word' }}>{r.eventLocation || '—'}</td>
                    <td style={{ wordBreak: 'break-word' }}>{r.eventStatus ? statusLabel(r.eventStatus) : '—'}</td>
                    <td>{new Date(r.data).toLocaleDateString('lt-LT')}</td>
                    <td>{r.zalosDydis      != null ? r.zalosDydis.toFixed(2)      : '—'}</td>
                    <td>{r.piniginisDydis  != null ? r.piniginisDydis.toFixed(2)  : '—'}</td>
                    <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Link to={`/events/${r.eventId}/calculation`} style={btn}>{t('report_calc_link')}</Link>
                        {calcsDone && (
                          <button onClick={() => handleDownloadPdf(r)} disabled={!!downloadingId} style={btn}>
                            {isDownloading ? t('report_generating') : t('calc_download_pdf')}
                          </button>
                        )}
                        {isSpecialist && (
                          <>
                            <Link to={`/reports/edit/${r.idDamageEvaluation}`} style={btn}>{t('edit')}</Link>
                            <button onClick={() => handleDelete(r.idDamageEvaluation)} style={btnDanger}>{t('delete')}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      )}

      {/* Hidden map for polygon capture */}
      {pdfJob && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '700px', height: '450px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <MapContainer
            center={[55.0, 24.0]} zoom={7}
            style={{ width: '700px', height: '450px' }}
            zoomControl={false} attributionControl={false}
            maxBounds={[[53.5, 20.0], [57.0, 27.5]]} maxBoundsViscosity={1.0} minZoom={7}
            preferCanvas={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
            {pdfJob.polygon && (() => {
              try {
                return <GeoJSON data={JSON.parse(pdfJob.polygon)} style={{ fillColor: '#3388ff', weight: 2, color: '#1a5fa8', fillOpacity: 0.4 }} />;
              } catch { return null; }
            })()}
            <FitAndCapture polygon={pdfJob.polygon} onCapture={handleMapReady} />
          </MapContainer>
        </div>
      )}

      {/* Hidden map for dispersion capture — only for fire events */}
      {dispersionJob && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '700px', height: '450px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <MapContainer
            center={[dispersionJob.dispersion.fireLat, dispersionJob.dispersion.fireLon]}
            zoom={10}
            style={{ width: '700px', height: '450px' }}
            zoomControl={false} attributionControl={false}
            preferCanvas={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" crossOrigin="anonymous" />
            {dispersionJob.polygon && (() => {
              try {
                return <GeoJSON data={JSON.parse(dispersionJob.polygon)} style={{ fillColor: '#3388ff', weight: 2, color: '#1a5fa8', fillOpacity: 0.25 }} />;
              } catch { return null; }
            })()}
            {CONC_BANDS.map(band => {
              const pts = dispersionJob.selectedCompound.gridPoints
                .map(pt => {
                  const [lat, lon] = offsetToLatLon(
                    dispersionJob.dispersion.fireLat, dispersionJob.dispersion.fireLon,
                    pt.downwindM, pt.crosswindM, dispersionJob.dispersion.windDirectionDeg
                  );
                  return isFinite(lat) && isFinite(lon) && pt.concentrationUgM3 >= band.min ? [lat, lon] : null;
                })
                .filter(Boolean);
              if (pts.length < 3) return null;
              const hull = convexHull(pts);
              if (hull.length < 3) return null;
              return (
                <Polygon key={band.min} positions={hull}
                  pathOptions={{ color: band.color, fillColor: band.color, fillOpacity: 0.45, weight: 1, opacity: 0.8 }} />
              );
            })}
            <DispersionFitAndCapture
              dispersion={dispersionJob.dispersion}
              selectedCompound={dispersionJob.selectedCompound}
              onCapture={handleDispersionCapture}
            />
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default ReportList;
