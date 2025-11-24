import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Upload, X } from 'lucide-react';

interface ReportFormProps {
  selectedLocation?: { lat: number; lng: number } | null;
  onReportSubmitted: () => void;
  onClose: () => void;
}

const ReportForm = ({ selectedLocation, onReportSubmitted, onClose }: ReportFormProps) => {
  const [streetName, setStreetName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation) {
      toast.error('Please select a location on the map first');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('report-images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('report-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Insert report
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          street_name: streetName.trim() || null,
          description: description.trim(),
          image_url: imageUrl,
        });

      if (insertError) throw insertError;

      toast.success('Report submitted successfully!');
      
      // Reset form
      setStreetName('');
      setDescription('');
      setImage(null);
      setImagePreview(null);
      
      onReportSubmitted();
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-elevated">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Report Garbage</CardTitle>
            <CardDescription>Help keep our streets clean by reporting garbage</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <MapPin className="h-4 w-4 text-primary" />
              <span>
                Location: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="streetName">Street Name (Optional)</Label>
            <Input
              id="streetName"
              placeholder="e.g., Main Street"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the garbage issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Photo (Optional)</Label>
            <div className="flex flex-col gap-3">
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Label 
                htmlFor="image" 
                className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {image ? 'Change photo' : 'Upload photo'}
                </span>
              </Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedLocation}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportForm;
