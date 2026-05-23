import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PolygonPicker = ({ onPolygonChange, initialPolygon }) => {
  const featureGroupRef = useRef(null);

  useEffect(() => {
    if (!initialPolygon) return;
    const timer = setTimeout(() => {
      if (!featureGroupRef.current) return;
      const fg = featureGroupRef.current;
      fg.clearLayers();
      const layer = L.geoJSON(initialPolygon);
      layer.eachLayer(l => fg.addLayer(l));
    }, 100);
    return () => clearTimeout(timer);
  }, [initialPolygon]);

  const handleCreated = (e) => {
    onPolygonChange(e.layer.toGeoJSON().geometry);
  };

  const handleEdited = (e) => {
    e.layers.eachLayer(layer => {
      onPolygonChange(layer.toGeoJSON().geometry);
    });
  };

  const handleDeleted = () => {
    onPolygonChange(null);
  };

  return (
    <div style={{ height: '450px', width: '100%', marginBottom: '8px' }}>
      <MapContainer center={[55.0, 24.0]} zoom={7} style={{ height: '100%', width: '100%' }}
        maxBounds={[[53.5, 20.0], [57.0, 27.5]]} maxBoundsViscosity={1.0} minZoom={7}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              rectangle: true,
              polygon: true,
              circle: false,
              marker: false,
              polyline: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
};

export default PolygonPicker;
