import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import PolygonPicker from './PolygonPicker';
import ObjectSelector from './ObjectSelector';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const EventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { isSpecialist } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    eventType: 'gaisras',
    eventDate: '',
    description: '',
    location: '',
    polygon: null,
    status: 'naujas'
  });
  const [selectedEventObjects, setSelectedEventObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(!id);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isEditing) {
      const fetchEvent = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/events/${id}`);
          const event = response.data;
          setFormData({
            eventType: event.eventType,
            eventDate: event.eventDate.split('T')[0],
            description: event.description || '',
            location: event.location || '',
            polygon: event.polygon ? JSON.parse(event.polygon) : null,
            status: event.status || 'naujas'
          });
          if (event.objects) {
            setSelectedEventObjects(event.objects.map(obj => ({
              objectId: obj.idObject,
              componentType: obj.componentType || '',
              kKat: obj.kKat ?? ''
            })));
          }
          setDataLoaded(true);
        } catch (err) {
          setFetchError(t('event_fetch_error'));
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePolygonChange = (polygon) => {
    setFormData({ ...formData, polygon });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.polygon) {
      alert(t('event_no_polygon'));
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        polygon: JSON.stringify(formData.polygon),
        eventObjects: selectedEventObjects.map(eo => ({
          objectId: Number(eo.objectId),
          componentType: eo.componentType || null,
          kKat: eo.kKat !== '' ? parseFloat(eo.kKat) : null
        })),
        materials: []
      };
      if (isEditing) {
        await api.put(`/events/${id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      navigate('/events');
    } catch (err) {
      const d = err.response?.data;
      const msg = typeof d === 'string' ? d
        : Object.values(d?.errors ?? {}).flat().join(' ') || d?.title || t('event_save_error');
      setSubmitError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetchError) return <div style={{ color: 'red' }}>{fetchError}</div>;

  return (
    <div>
      <h2>{isEditing ? t('event_edit_title') : t('event_new_title')}</h2>
      {submitError && <div style={{ color: 'red', marginBottom: '8px' }}>{submitError}</div>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>{t('event_type_label')}</label>
          <select name="eventType" value={formData.eventType} onChange={handleChange} required>
            <option value="gaisras">{t('event_type_fire')}</option>
            <option value="medžiagų išsiliejimas">{t('event_type_spill')}</option>
            <option value="stichija">{t('event_type_disaster')}</option>
          </select>
        </div>

        <div>
          <label>{t('event_date_label')}</label>
          <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} required />
        </div>

        <div>
          <label>{t('event_desc_label')}</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="3" />
        </div>

        <div>
          <label>{t('event_loc_label')}</label>
          <input type="text" name="location" value={formData.location} onChange={handleChange} />
        </div>

        <div>
          <label>{t('event_mark_area')}</label>
          {dataLoaded
            ? <PolygonPicker onPolygonChange={handlePolygonChange} initialPolygon={formData.polygon} />
            : <div>{t('event_loading_map')}</div>
          }
          {formData.polygon && <div>{t('event_area_marked')}</div>}
        </div>

        <ObjectSelector
          selectedEventObjects={selectedEventObjects}
          onEventObjectsChange={setSelectedEventObjects}
          specialistMode={isEditing || isSpecialist}
        />

        <button type="submit" disabled={loading}>
          {loading ? t('saving') : (isEditing ? t('update') : t('create'))}
        </button>
        <button type="button" onClick={() => navigate('/events')}>{t('cancel')}</button>
      </form>
    </div>
  );
};

export default EventForm;
