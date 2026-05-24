import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const PAGE_SIZE = 20;

const MaterialList = () => {
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/materials');
      setMaterials(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('mat_confirm_delete'))) return;
    try {
      await api.delete(`/materials/${id}`);
      const updated = materials.filter(m => m.idMaterial !== id);
      setMaterials(updated);
      const totalPages = Math.ceil(updated.length / PAGE_SIZE);
      if (page > totalPages) setPage(Math.max(1, totalPages));
    } catch (error) {
      alert(t('mat_delete_error'));
    }
  };

  const substanceLabel = (type) => ({
    standard: t('mat_standard'),
    bds7: t('mat_bds7'),
    suspended: t('mat_suspended'),
  }[type] || '—');

  const categoryLabel = (c) => ({
    polymers:       t('mat_polymers'),
    plastics:       t('mat_plastics'),
    resins:         t('mat_resins'),
    paper:          t('mat_paper'),
    textile:        t('mat_textile'),
    wood:           t('mat_wood'),
    oil:            t('mat_oil'),
    rubber:         t('mat_rubber'),
    liquid_fuel:    t('mat_liquid_fuel'),
    carbon:         t('mat_carbon'),
    halogenated:    t('mat_halogenated'),
    liquid_organic: t('mat_liquid_organic'),
  }[c] || '—');

  const btn = { display: 'inline-block', padding: '3px 10px', borderRadius: '4px', border: '1px solid #bbb', background: '#f0f0f0', color: '#333', cursor: 'pointer', fontSize: '0.83em', textDecoration: 'none', lineHeight: '1.6', fontFamily: 'inherit' };
  const btnDanger = { ...btn, background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' };

  if (loading) return <div>{t('loading')}</div>;

  const totalPages = Math.ceil(materials.length / PAGE_SIZE);
  const paginated = materials.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <h2>{t('mat_list_title')}</h2>
      {isSpecialist && <Link to="/materials/new" style={btn}>{t('mat_new_btn')}</Link>}
      <table border="1" cellPadding="8" style={{ marginTop: '20px', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>{t('name_col')}</th>
            <th>{t('mat_type_col')}</th>
            <th>{t('mat_emission_col')}</th>
            <th>T_n (€/t)</th>
            <th>{t('unit')}</th>
            {isSpecialist && <th>{t('actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {paginated.map(m => (
            <tr key={m.idMaterial}>
              <td>{m.name}</td>
              <td>{substanceLabel(m.substanceType)}</td>
              <td>{categoryLabel(m.emissionCategory)}</td>
              <td>{m.baseRate ?? '—'}</td>
              <td>{m.unit}</td>
              {isSpecialist && (
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Link to={`/materials/edit/${m.idMaterial}`} style={btn}>{t('edit')}</Link>
                    <button onClick={() => handleDelete(m.idMaterial)} style={btnDanger}>{t('delete')}</button>
                  </div>
                </td>
              )}
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
  );
};

export default MaterialList;
