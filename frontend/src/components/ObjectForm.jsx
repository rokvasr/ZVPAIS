import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import ObjectMaterialManager from './ObjectMaterialManager';
import { useLanguage } from '../context/LanguageContext';

const ObjectForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalMass, setTotalMass] = useState('');
  const [totalVolume, setTotalVolume] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      api.get(`/environmentobjects/${id}`)
        .then(res => {
          setName(res.data.name || '');
          setDescription(res.data.description || '');
          setTotalMass(res.data.totalMass != null ? String(res.data.totalMass) : '');
          setTotalVolume(res.data.totalVolume != null ? String(res.data.totalVolume) : '');
        })
        .catch(err => {
          setError(t('obj_fetch_error'));
          console.error(err);
        });
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name,
        description,
        totalMass: totalMass !== '' ? parseFloat(totalMass) : null,
        totalVolume: totalVolume !== '' ? parseFloat(totalVolume) : null
      };
      if (isEditing) {
        await api.put(`/environmentobjects/${id}`, payload);
      } else {
        await api.post('/environmentobjects', payload);
      }
      navigate('/objects');
    } catch (err) {
      if (err.response?.status === 403) {
        setError(t('err_403'));
      } else {
        const d = err.response?.data;
        const msg = typeof d === 'string' ? d
          : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('obj_save_error');
        setError(msg);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>{isEditing ? t('obj_edit_title') : t('obj_new_title')}</h2>
      {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>{t('obj_name_label')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ marginLeft: '8px', width: '300px' }}
          />
        </div>
        <div style={{ marginTop: '8px' }}>
          <label>{t('obj_desc_label')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            style={{ marginLeft: '8px', width: '300px', display: 'inline-block', verticalAlign: 'top' }}
          />
        </div>
        <div style={{ marginTop: '8px', color: '#666', fontSize: '0.85em' }}>
          {t('obj_pct_hint')}
        </div>
        <div style={{ marginTop: '4px' }}>
          <label>{t('obj_total_mass_label')}</label>
          <input
            type="number"
            step="any"
            min="0"
            value={totalMass}
            onChange={e => setTotalMass(e.target.value)}
            placeholder="pvz. 5.0"
            style={{ marginLeft: '8px', width: '120px' }}
          />
          <label style={{ marginLeft: '16px' }}>{t('obj_total_vol_label')}</label>
          <input
            type="number"
            step="any"
            min="0"
            value={totalVolume}
            onChange={e => setTotalVolume(e.target.value)}
            placeholder="pvz. 5.0"
            style={{ marginLeft: '8px', width: '120px' }}
          />
        </div>

        <div style={{ marginTop: '12px' }}>
          <button type="submit" disabled={loading}>
            {loading ? t('saving') : (isEditing ? t('update') : t('obj_create_btn'))}
          </button>
          <button type="button" onClick={() => navigate('/objects')} style={{ marginLeft: '8px' }}>
            {t('cancel')}
          </button>
        </div>
      </form>

      {isEditing && (
        <div style={{ marginTop: '30px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
          <h3>{t('obj_materials_section')}</h3>
          <ObjectMaterialManager objectId={parseInt(id, 10)} />
        </div>
      )}
    </div>
  );
};

export default ObjectForm;
