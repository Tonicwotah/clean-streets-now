import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, Tag, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface ReportsListProps {
  reports: Report[];
  onLocationClick?: (lat: number, lng: number) => void;
}

const ReportsList = ({ reports, onLocationClick }: ReportsListProps) => {
  const categoryLabels: Record<string, string> = {
    garbage: 'Garbage',
    bird_feed: 'Bird Feed',
    dog_poop: 'Dog Poop',
    busted_sewage: 'Busted Sewage',
    other: 'Other',
  };
  // Group reports by street name and count
  const groupedReports = reports.reduce((acc, report) => {
    const key = report.street_name || 'Unknown Location';
    if (!acc[key]) {
      acc[key] = {
        reports: [],
        count: 0,
        latestReport: report.created_at,
      };
    }
    acc[key].reports.push(report);
    acc[key].count++;
    if (new Date(report.created_at) > new Date(acc[key].latestReport)) {
      acc[key].latestReport = report.created_at;
    }
    return acc;
  }, {} as Record<string, { reports: Report[]; count: number; latestReport: string }>);

  const sortedGroups = Object.entries(groupedReports).sort(
    ([, a], [, b]) => b.count - a.count
  );

  const getSeverityColor = (count: number) => {
    if (count >= 25) return 'destructive';
    if (count >= 10) return 'default';
    if (count >= 5) return 'default';
    return 'secondary';
  };

  return (
    <Card className="h-full shadow-elevated">
      <CardHeader>
        <CardTitle>Reports Log</CardTitle>
        <CardDescription>
          {reports.length} total {reports.length === 1 ? 'report' : 'reports'} from the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-3 pr-4">
            {sortedGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No reports yet. Be the first to report!</p>
              </div>
            ) : (
              sortedGroups.map(([streetName, data]) => (
                <Card key={streetName} className="border-l-4 hover:shadow-md transition-shadow" style={{
                  borderLeftColor: data.count >= 25 ? 'hsl(0 84% 60%)' : data.count >= 10 ? 'hsl(25 95% 53%)' : data.count >= 5 ? 'hsl(35 90% 60%)' : 'hsl(180 70% 45%)'
                }}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">{streetName}</h3>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {categoryLabels[data.reports[0].category] || 'Unknown'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {data.reports[0].description}
                          </p>
                        </div>
                        <Badge variant={getSeverityColor(data.count)}>
                          <Users className="h-3 w-3 mr-1" />
                          {data.count}
                        </Badge>
                      </div>

                      {data.reports[0].image_url && (
                        <img 
                          src={data.reports[0].image_url} 
                          alt="Report"
                          className="w-full h-32 object-cover rounded-md"
                        />
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(data.latestReport), { addSuffix: true })}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {data.reports[0].latitude.toFixed(4)}, {data.reports[0].longitude.toFixed(4)}
                          </div>
                        </div>
                        {onLocationClick && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLocationClick(data.reports[0].latitude, data.reports[0].longitude)}
                            className="shrink-0"
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ReportsList;
