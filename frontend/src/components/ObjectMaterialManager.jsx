import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ObjectMaterialManager = ({ objectId }) => {
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();
  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [percentage, setPercentage] = useState('');
  const [mass, setMass] = useState('');
  const [volume, setVolume] = useState('');
  const [recoveredQuantity, setRecoveredQuantity] = useState('');

  useEffect(() => {
    fetchObjectMaterials();
    fetchAllMaterials();
  }, [objectId]);

  const fetchObjectMaterials = async () => {
    try {
      const response = await api.get(`/environmentobjects/${objectId}/materials`);
      setMaterials(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllMaterials = async () => {
    try {
      const response = await api.get('/materials');
      setAllMaterials(response.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId) return;
    try {
      await api.post(`/environmentobjects/${objectId}/materials`, {
        materialId: parseInt(selectedMaterialId),
        percentage: percentage ? parseFloat(percentage) : null,
        mass: mass ? parseFloat(mass) : null,
        volume: volume ? parseFloat(volume) : null,
        recoveredQuantity: recoveredQuantity ? parseFloat(recoveredQuantity) : null
      });
      setSelectedMaterialId('');
      setPercentage('');
      setMass('');
      setVolume('');
      setRecoveredQuantity('');
      setShowAddForm(false);
      fetchObjectMaterials();
    } catch (error) {
      if (error.response?.status === 403) {
        alert(t('err_403'));
      } else {
        const msg = error.response?.data || t('obj_mat_add_error');
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      console.error(error);
    }
  };

  const handleRemoveMaterial = async (materialId) => {
    if (!window.confirm(t('obj_mat_confirm_remove'))) return;
    try {
      await api.delete(`/environmentobjects/${objectId}/materials/${materialId}`);
      fetchObjectMaterials();
    } catch (err) {
      if (err.response?.status === 403) {
        alert(t('err_403'));
      } else {
        const d = err.response?.data;
        const msg = typeof d === 'string' ? d
          : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('obj_mat_remove_error');
        alert(msg);
      }
      console.error(err);
    }
  };

  if (loading) return <div>{t('loading')}</div>;

  return (
    <div>
      {materials.length === 0 ? (
        <p>{t('obj_mat_no_materials')}</p>
      ) : (
        <ul>
          {materials.map(m => (
            <li key={m.materialId}>
              {m.materialName} –
              {m.percentage !== null && `${m.percentage}%`}
              {m.mass !== null && ` ${m.mass} t`}
              {m.volume !== null && ` ${m.volume} m³`}
              {m.recoveredQuantity != null && ` (${t('obj_mat_recovered_inline')}: ${m.recoveredQuantity} t)`}
              {isSpecialist && (
                <button onClick={() => handleRemoveMaterial(m.materialId)} style={{ marginLeft: '10px' }}>
                  {t('remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isSpecialist ? (
        !showAddForm ? (
          <button onClick={() => setShowAddForm(true)}>{t('obj_mat_add_btn')}</button>
        ) : (
          <form onSubmit={handleAddMaterial} style={{ marginTop: '10px' }}>
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              required
            >
              <option value="">{t('obj_mat_select')}</option>
              {allMaterials.map(m => (
                <option key={m.idMaterial} value={m.idMaterial}>{m.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder={t('obj_mat_pct')}
              value={percentage}
              onChange={e => setPercentage(e.target.value)}
              step="any"
              min="0"
              max="100"
            />
            <input
              type="number"
              placeholder={t('obj_mat_mass')}
              value={mass}
              onChange={e => setMass(e.target.value)}
              step="any"
              min="0"
            />
            <input
              type="number"
              placeholder={t('obj_mat_vol')}
              value={volume}
              onChange={e => setVolume(e.target.value)}
              step="any"
              min="0"
            />
            <input
              type="number"
              placeholder={t('obj_mat_recovered')}
              value={recoveredQuantity}
              onChange={e => setRecoveredQuantity(e.target.value)}
              step="any"
              min="0"
            />
            <button type="submit">{t('save')}</button>
            <button type="button" onClick={() => setShowAddForm(false)}>{t('cancel')}</button>
          </form>
        )
      ) : (
        <p style={{ color: '#888', fontSize: '0.85em', marginTop: '8px' }}>{t('obj_mat_readonly_note')}</p>
      )}
    </div>
  );
};

export default ObjectMaterialManager;
