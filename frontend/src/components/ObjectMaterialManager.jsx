import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ObjectMaterialManager = ({ objectId }) => {
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
      const msg = error.response?.data || t('obj_mat_add_error');
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error(error);
    }
  };

  const handleRemoveMaterial = async (materialId) => {
    if (!window.confirm(t('obj_mat_confirm_remove'))) return;
    try {
      await api.delete(`/environmentobjects/${objectId}/materials/${materialId}`);
      fetchObjectMaterials();
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d
        : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('obj_mat_remove_error');
      alert(msg);
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
              <button onClick={() => handleRemoveMaterial(m.materialId)} style={{ marginLeft: '10px' }}>
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showAddForm ? (
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
          />
          <input
            type="number"
            placeholder={t('obj_mat_mass')}
            value={mass}
            onChange={e => setMass(e.target.value)}
            step="any"
          />
          <input
            type="number"
            placeholder={t('obj_mat_vol')}
            value={volume}
            onChange={e => setVolume(e.target.value)}
            step="any"
          />
          <input
            type="number"
            placeholder={t('obj_mat_recovered')}
            value={recoveredQuantity}
            onChange={e => setRecoveredQuantity(e.target.value)}
            step="any"
          />
          <button type="submit">{t('save')}</button>
          <button type="button" onClick={() => setShowAddForm(false)}>{t('cancel')}</button>
        </form>
      )}
    </div>
  );
};

export default ObjectMaterialManager;
