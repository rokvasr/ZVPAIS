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
      <h3>{t('obj_section_title')}</h3>
      {objects.map(obj => (
        <div key={obj.idObject} style={{ marginBottom: '8px' }}>
          <label>
            <input
              type="checkbox"
              checked={isSelected(obj.idObject)}
              onChange={() => handleCheckboxChange(obj.idObject)}
            />
            {' '}{obj.name}{obj.description && ` (${obj.description})`}
          </label>
          {isSelected(obj.idObject) && specialistMode && (
            <span style={{ marginLeft: '16px' }}>
              <label>
                {t('obj_component_label')}{' '}
                <select
                  value={getEntry(obj.idObject).componentType}
                  onChange={(e) => handleFieldChange(obj.idObject, 'componentType', e.target.value)}
                  style={{ marginRight: '12px' }}
                >
                  <option value="">{t('obj_component_none')}</option>
                  <option value="water">{t('obj_comp_water')}</option>
                  <option value="soil">{t('obj_comp_soil')}</option>
                  <option value="air">{t('obj_comp_air')}</option>
                </select>
              </label>
              <label>
                K_kat:{' '}
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={getEntry(obj.idObject).kKat}
                  onChange={(e) => handleFieldChange(obj.idObject, 'kKat', e.target.value)}
                  placeholder="pvz. 1.0"
                  style={{ width: '70px' }}
                />
              </label>
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ObjectSelector;
