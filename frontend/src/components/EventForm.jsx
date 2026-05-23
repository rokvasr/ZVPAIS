import React, { useState, useEffect, useRef } from 'react';
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
  const datePickerRef = useRef(null);
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
    if (selectedEventObjects.length === 0) {
      alert(t('event_no_objects'));
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

  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' };
  const inputStyle = { padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.95rem' };

  if (fetchError) return <div style={{ color: 'red' }}>{fetchError}</div>;

  return (
    <div style={{ maxWidth: '1100px' }}>
      <h2>{isEditing ? t('event_edit_title') : t('event_new_title')}</h2>
      {submitError && <div style={{ color: 'red', marginBottom: '8px' }}>{submitError}</div>}
      <form onSubmit={handleSubmit}>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', marginBottom: '20px' }}>

          {/* Left column: form inputs */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={fieldStyle}>
              <label>{t('event_type_label')}</label>
              <select name="eventType" value={formData.eventType} onChange={handleChange} required style={inputStyle}>
                <option value="gaisras">{t('event_type_fire')}</option>
                <option value="medžiagų išsiliejimas">{t('event_type_spill')}</option>
                <option value="stichija">{t('event_type_disaster')}</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label>{t('event_date_label')}</label>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  placeholder="YYYY-MM-DD"
                  pattern="\d{4}-\d{2}-\d{2}"
                  title="Formatas: YYYY-MM-DD"
                  required
                  style={{ ...inputStyle, width: '120px' }}
                />
                <input
                  ref={datePickerRef}
                  type="date"
                  value={formData.eventDate || ''}
                  onChange={e => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                  tabIndex={-1}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                />
                <button type="button" onClick={() => datePickerRef.current?.showPicker()}
                  style={{ cursor: 'pointer', padding: '2px 6px', fontSize: '1rem', lineHeight: 1 }}>
                  📅
                </button>
              </div>
            </div>

            <div style={fieldStyle}>
              <label>{t('event_desc_label')}</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="4"
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={fieldStyle}>
              <label>{t('event_loc_label')}</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          {/* Right column: map */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>{t('event_mark_area')}</label>
            {dataLoaded
              ? <PolygonPicker onPolygonChange={handlePolygonChange} initialPolygon={formData.polygon} />
              : <div>{t('event_loading_map')}</div>
            }
            {formData.polygon && (
              <div style={{ marginTop: '4px', color: '#2e7d32', fontSize: '0.9em' }}>{t('event_area_marked')}</div>
            )}
          </div>
        </div>

        <ObjectSelector
          selectedEventObjects={selectedEventObjects}
          onEventObjectsChange={setSelectedEventObjects}
          specialistMode={isEditing || isSpecialist}
        />

        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button type="submit" disabled={loading}>
            {loading ? t('saving') : (isEditing ? t('update') : t('create'))}
          </button>
          <button type="button" onClick={() => navigate('/events')}>{t('cancel')}</button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
