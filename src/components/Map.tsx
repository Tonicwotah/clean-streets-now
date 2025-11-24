import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MapProps {
  reports: Array<{
    id: string;
    latitude: number;
    longitude: number;
    street_name: string | null;
    description: string;
    image_url: string | null;
    created_at: string;
    category: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
}

export interface MapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

const Map = forwardRef<MapHandle, MapProps>(({ reports, onMapClick }, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom: number = 15) => {
      if (map.current) {
        map.current.flyTo({
          center: [lng, lat],
          zoom: zoom,
          duration: 2000,
        });
      }
    },
  }));

  useEffect(() => {
    const savedToken = localStorage.getItem('mapbox_token');
    if (savedToken) {
      setMapboxToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [78.9629, 20.5937], // Center of India
        zoom: 4.5,
        pitch: 0,
        maxBounds: [
          [68.1766451354, 6.7478], // Southwest coordinates (India bounds)
          [97.4025614766, 35.5087], // Northeast coordinates (India bounds)
        ],
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add heatmap layer when style loads
      map.current.on('load', () => {
        if (!map.current) return;

        // Add heatmap source
        map.current.addSource('reports-heat', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // Add heatmap layer
        map.current.addLayer({
          id: 'reports-heatmap',
          type: 'heatmap',
          source: 'reports-heat',
          maxzoom: 15,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 6, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 15, 0.3],
          },
        });
      });

      // Add click handler for placing new reports
      if (onMapClick) {
        map.current.on('click', (e) => {
          onMapClick(e.lngLat.lat, e.lngLat.lng);
        });
      }

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error('Map initialization error:', error);
      toast.error('Invalid Mapbox token. Please check your token and try again.');
      setMapboxToken('');
      localStorage.removeItem('mapbox_token');
    }
  }, [mapboxToken, onMapClick]);

  // Update markers and heatmap when reports change
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Update heatmap data
    const heatmapFeatures = reports.map(report => ({
      type: 'Feature' as const,
      properties: { weight: 1 },
      geometry: {
        type: 'Point' as const,
        coordinates: [report.longitude, report.latitude],
      },
    }));

    const source = map.current.getSource('reports-heat') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: heatmapFeatures,
      });
    }

    // Group reports by location to show intensity
    const locationGroups: Record<string, Array<typeof reports[number]>> = {};
    reports.forEach(report => {
      const key = `${report.latitude.toFixed(4)},${report.longitude.toFixed(4)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(report);
    });

    // Create markers with size based on report count (tiers: 5, 10, 25)
    Object.entries(locationGroups).forEach(([key, groupReports]) => {
      const [lat, lng] = key.split(',').map(Number);
      const count = groupReports.length;
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'report-marker';
      const size = Math.min(20 + count * 5, 60);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = count >= 25 ? 'hsl(0 84% 60%)' : count >= 10 ? 'hsl(25 95% 53%)' : count >= 5 ? 'hsl(35 90% 60%)' : 'hsl(180 70% 45%)';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '12px';
      el.textContent = count.toString();

      // Build popup content with images
      const categoryLabels: Record<string, string> = {
        garbage: 'Garbage',
        bird_feed: 'Bird Feed',
        dog_poop: 'Dog Poop',
        busted_sewage: 'Busted Sewage',
        other: 'Other',
      };

      const imagesHtml = groupReports
        .filter(r => r.image_url)
        .slice(0, 3)
        .map(r => `<img src="${r.image_url}" alt="Report" class="w-full h-24 object-cover rounded mb-1" />`)
        .join('');

      const popupContent = `
        <div class="p-2 max-w-xs">
          <p class="font-semibold text-sm mb-1">${groupReports[0].street_name || 'Unknown location'}</p>
          <p class="text-xs text-muted-foreground mb-1">${count} ${count === 1 ? 'report' : 'reports'}</p>
          <p class="text-xs mb-1"><strong>Type:</strong> ${categoryLabels[groupReports[0].category] || 'Unknown'}</p>
          ${imagesHtml}
          <p class="text-xs mt-1">${groupReports[0].description}</p>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 } as any).setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el } as any)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [reports, mapboxToken]);

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('mapbox_token', tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      toast.success('Mapbox token saved!');
    }
  };

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg p-8">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Mapbox Token Required</h3>
            <p className="text-sm text-muted-foreground">
              To display the map, please enter your Mapbox public token. Get one free at{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="pk.eyJ1..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTokenSubmit}>
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden shadow-elevated" />
    </div>
  );
});

Map.displayName = 'Map';

export default Map;
