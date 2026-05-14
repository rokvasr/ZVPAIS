import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const MaterialForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    toxicityFactor: '',
    unit: '',
    baseRate: '',
    substanceType: 'standard',
    emissionCategory: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchMaterial = async () => {
        try {
          const response = await api.get(`/materials/${id}`);
          const m = response.data;
          setFormData({
            name: m.name || '',
            description: m.description || '',
            toxicityFactor: m.toxicityFactor ?? '',
            unit: m.unit || '',
            baseRate: m.baseRate ?? '',
            substanceType: m.substanceType || 'standard',
            emissionCategory: m.emissionCategory || ''
          });
        } catch (err) {
          setError(t('mat_fetch_error'));
          console.error(err);
        }
      };
      fetchMaterial();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        toxicityFactor: formData.toxicityFactor ? parseFloat(formData.toxicityFactor) : null,
        unit: formData.unit,
        baseRate: formData.baseRate ? parseFloat(formData.baseRate) : null,
        substanceType: formData.substanceType || 'standard',
        emissionCategory: formData.emissionCategory || null
      };
      if (isEditing) {
        await api.put(`/materials/${id}`, payload);
      } else {
        await api.post('/materials', payload);
      }
      navigate('/materials');
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d
        : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('mat_save_error');
      setError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>{isEditing ? t('mat_edit_title') : t('mat_new_title')}</h2>
      {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>{t('mat_name_label')}</label>
          <input name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div>
          <label>{t('mat_desc_label')}</label>
          <textarea name="description" value={formData.description} onChange={handleChange} />
        </div>
        <div>
          <label>{t('mat_toxicity_label')}</label>
          <input type="number" step="0.01" min="0" name="toxicityFactor" value={formData.toxicityFactor} onChange={handleChange} />
        </div>
        <div>
          <label>{t('mat_unit_label')}</label>
          <input name="unit" value={formData.unit} onChange={handleChange} />
        </div>
        <div>
          <label>{t('mat_baserate_label')}</label>
          <input type="number" step="0.01" min="0" name="baseRate" value={formData.baseRate} onChange={handleChange} />
        </div>
        <div>
          <label>{t('mat_type_label')}</label>
          <select name="substanceType" value={formData.substanceType} onChange={handleChange}>
            <option value="standard">{t('mat_standard')}</option>
            <option value="bds7">{t('mat_bds7')}</option>
            <option value="suspended">{t('mat_suspended_long')}</option>
          </select>
        </div>
        <div>
          <label>{t('mat_emission_label')}</label>
          <select name="emissionCategory" value={formData.emissionCategory} onChange={handleChange}>
            <option value="">{t('mat_emission_none')}</option>
            <option value="polymers">{t('mat_polymers')}</option>
            <option value="plastics">{t('mat_plastics')}</option>
            <option value="resins">{t('mat_resins')}</option>
            <option value="paper">{t('mat_paper_long')}</option>
            <option value="textile">{t('mat_textile')}</option>
            <option value="wood">{t('mat_wood')}</option>
            <option value="oil">{t('mat_oil')}</option>
            <option value="rubber">{t('mat_rubber')}</option>
            <option value="liquid_fuel">{t('mat_liquid_fuel')}</option>
            <option value="carbon">{t('mat_carbon')}</option>
            <option value="halogenated">{t('mat_halogenated')}</option>
            <option value="liquid_organic">{t('mat_liquid_organic')}</option>
          </select>
          <small style={{ color: '#888' }}>{t('mat_emission_hint')}</small>
        </div>
        <button type="submit" disabled={loading}>{loading ? t('saving') : t('save')}</button>
        <button type="button" onClick={() => navigate('/materials')}>{t('cancel')}</button>
      </form>
    </div>
  );
};

export default MaterialForm;
