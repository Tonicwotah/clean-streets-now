import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Plus } from 'lucide-react';
import Map, { MapHandle } from '@/components/Map';
import ReportForm from '@/components/ReportForm';
import ReportsList from '@/components/ReportsList';
import { toast } from 'sonner';

interface Report {
  id: string;
  latitude: number;
  longitude: number;
  street_name: string | null;
  description: string;
  image_url: string | null;
  created_at: string;
  category: string;
}

const Index = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<MapHandle>(null);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setShowReportForm(true);
    toast.info('Location selected! Fill in the report details.');
  };

  const handleReportSubmitted = () => {
    setSelectedLocation(null);
    fetchReports();
  };

  const handleLocationClick = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">CleanStreets</h1>
                <p className="text-sm text-muted-foreground">Community Garbage Reporting</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowReportForm(true)}
              size="lg"
              className="shadow-elevated"
            >
              <Plus className="h-5 w-5 mr-2" />
              Report Garbage
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Map Section */}
          <div className="lg:col-span-2 h-full">
            <Map 
              ref={mapRef}
              reports={reports} 
              onMapClick={handleMapClick}
            />
          </div>

          {/* Reports List Section */}
          <div className="h-full">
            <ReportsList 
              reports={reports} 
              onLocationClick={handleLocationClick}
            />
          </div>
        </div>
      </main>

      {/* Report Form Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <ReportForm
              selectedLocation={selectedLocation}
              onReportSubmitted={handleReportSubmitted}
              onClose={() => {
                setShowReportForm(false);
                setSelectedLocation(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
