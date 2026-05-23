import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ObjectSelector = ({ selectedEventObjects, onEventObjectsChange, specialistMode = false }) => {
  const { t } = useLanguage();
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchObjects = async () => {
      try {
        const response = await api.get('/environmentobjects');
        setObjects(response.data);
      } catch (error) {
        console.error('Error loading objects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchObjects();
  }, []);

  const isSelected = (objectId) =>
    selectedEventObjects.some(eo => eo.objectId === objectId);

  const getEntry = (objectId) =>
    selectedEventObjects.find(eo => eo.objectId === objectId) || { objectId, componentType: '', kKat: '' };

  const handleCheckboxChange = (objectId) => {
    if (isSelected(objectId)) {
      onEventObjectsChange(selectedEventObjects.filter(eo => eo.objectId !== objectId));
    } else {
      onEventObjectsChange([...selectedEventObjects, { objectId, componentType: '', kKat: '' }]);
    }
  };

  const handleFieldChange = (objectId, field, value) => {
    onEventObjectsChange(selectedEventObjects.map(eo =>
      eo.objectId === objectId ? { ...eo, [field]: value } : eo
    ));
  };

  if (loading) return <div>{t('obj_loading')}</div>;

  return (
    <div>
      <h3 style={{ marginBottom: '10px' }}>{t('obj_section_title')}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {objects.map(obj => {
          const selected = isSelected(obj.idObject);
          const entry = getEntry(obj.idObject);
          return (
            <div
              key={obj.idObject}
              style={{
                border: `1px solid ${selected ? '#2563eb' : '#d1d5db'}`,
                borderRadius: '6px',
                padding: '8px 10px',
                background: selected ? '#eff6ff' : '#fafafa',
                minWidth: '160px',
                maxWidth: '210px',
                cursor: 'pointer',
              }}
              onClick={() => handleCheckboxChange(obj.idObject)}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', cursor: 'pointer', pointerEvents: 'none' }}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {}}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: selected ? 600 : 400 }}>{obj.name}</span>
              </label>

              {selected && specialistMode && (
                <div
                  style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                  onClick={e => e.stopPropagation()}
                >
                  <label style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {t('obj_component_label')}
                    <select
                      value={entry.componentType}
                      onChange={e => handleFieldChange(obj.idObject, 'componentType', e.target.value)}
                      style={{ padding: '3px 4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                    >
                      <option value="">{t('obj_component_none')}</option>
                      <option value="water">{t('obj_comp_water')}</option>
                      <option value="soil">{t('obj_comp_soil')}</option>
                      <option value="air">{t('obj_comp_air')}</option>
                    </select>
                  </label>
                  <label style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    K_kat
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={entry.kKat}
                      onChange={e => handleFieldChange(obj.idObject, 'kKat', e.target.value)}
                      placeholder="pvz. 1.0"
                      style={{ padding: '3px 4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem', width: '100%' }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ObjectSelector;
