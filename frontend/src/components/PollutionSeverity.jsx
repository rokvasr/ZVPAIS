import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

function fmt(n) {
  if (n == null) return '-';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + ' k';
  return n.toFixed(4);
}

export default function PollutionSeverity() {
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { t } = useLanguage();

  const componentLabel = (type) => (
    { water: t('calc_comp_water'), soil: t('calc_comp_soil'), air: t('calc_comp_air') }[type] || type || '-'
  );

  useEffect(() => {
    api.get('/pollution/events')
      .then(r => setEvents(r.data))
      .catch(() => setError(t('poll_load_error')))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (ev) => {
    if (selected === ev.idEvent) { setSelected(null); setDetail(null); return; }
    setSelected(ev.idEvent);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await api.get(`/pollution/event/${ev.idEvent}`);
      setDetail(r.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <p>{t('loading')}</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  const maxSeverity = events[0]?.totalSeverityIndex ?? 1;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900 }}>
      <h2 style={{ marginBottom: '1rem' }}>{t('poll_title')}</h2>

      {events.length === 0 ? (
        <p>{t('poll_none')}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={th}>#</th>
              <th style={th}>{t('type_col')}</th>
              <th style={th}>{t('date_col')}</th>
              <th style={th}>{t('loc_col')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('poll_index_col')}</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => {
              const isOpen = selected === ev.idEvent;
              const barPct = maxSeverity > 0 ? (ev.totalSeverityIndex / maxSeverity) * 100 : 0;
              return (
                <React.Fragment key={ev.idEvent}>
                  <tr
                    onClick={() => handleSelect(ev)}
                    style={{ cursor: 'pointer', background: isOpen ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #e5e7eb' }}
                  >
                    <td style={{ ...td, color: '#6b7280', width: 30 }}>{i + 1}</td>
                    <td style={td}>{ev.eventType}</td>
                    <td style={td}>{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('lt-LT') : '-'}</td>
                    <td style={td}>{ev.location ?? '-'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${barPct}%`, height: '100%', background: barPct > 66 ? '#dc2626' : barPct > 33 ? '#f97316' : '#16a34a', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>{fmt(ev.totalSeverityIndex)}</span>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <Link to={`/events/${ev.idEvent}/calculation`} onClick={e => e.stopPropagation()} style={btn}>
                        {t('poll_calc_link')}
                      </Link>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #bfdbfe' }}>
                        {detailLoading ? (
                          <p style={{ margin: 0, color: '#6b7280' }}>{t('loading')}</p>
                        ) : detail ? (
                          <div>
                            <strong style={{ fontSize: '0.85rem' }}>{t('poll_obj_severity')}</strong>
                            {detail.objects.map(obj => (
                              <div key={obj.objectId} style={{ marginTop: 10, padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <strong style={{ fontSize: '0.83rem' }}>{obj.objectName}</strong>
                                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    {componentLabel(obj.componentType)} | K_kat: {obj.kKat ?? '-'} | {t('poll_index_col')}: <strong>{fmt(obj.objectSeverity)}</strong>
                                  </span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                  <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                      <th style={sth}>{t('poll_material_col')}</th>
                                      <th style={{ ...sth, textAlign: 'right' }}>Q_n (t)</th>
                                      <th style={{ ...sth, textAlign: 'right' }}>K_kat</th>
                                      <th style={{ ...sth, textAlign: 'right' }}>{t('poll_contribution_col')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {obj.materials.map(m => (
                                      <tr key={m.materialId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={std}>{m.materialName}</td>
                                        <td style={{ ...std, textAlign: 'right' }}>{m.qN.toFixed(4)}</td>
                                        <td style={{ ...std, textAlign: 'right' }}>{Number(m.kKat).toFixed(1)}</td>
                                        <td style={{ ...std, textAlign: 'right', fontWeight: 600 }}>{fmt(m.severityContribution)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                            <div style={{ marginTop: 8, textAlign: 'right', fontSize: '0.83rem' }}>
                              {t('poll_total_index')} <strong>{fmt(detail.totalSeverityIndex)}</strong>
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: '#b45309' }}>{t('poll_detail_error')}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const btn = { display: 'inline-block', padding: '3px 10px', borderRadius: '4px', border: '1px solid #bbb', background: '#f0f0f0', color: '#333', cursor: 'pointer', fontSize: '0.83em', textDecoration: 'none', lineHeight: '1.6', fontFamily: 'inherit' };
const th  = { padding: '6px 10px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e7eb' };
const td  = { padding: '7px 10px' };
const sth = { padding: '4px 8px', fontWeight: 600 };
const std = { padding: '3px 8px' };