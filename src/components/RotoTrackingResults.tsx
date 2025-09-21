import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, MapPin } from 'lucide-react';
import { MediaPreview } from '@/components/MediaPreview';
import { useTranslation } from 'react-i18next';

interface RotoTrackingResultsProps {
  results: {
    videoUrl?: string;
    maskUrl?: string;
    alphaChannel?: string;
    trackingPoints?: Array<{
      x: number;
      y: number;
      frame: number;
    }>;
    sceneDescription?: string;
    processedFrames?: number;
  };
}

export function RotoTrackingResults({ results }: RotoTrackingResultsProps) {
  const { t } = useTranslation();

  if (!results) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tracking results available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Roto/Track Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2 text-green-600">✓ Tracking Complete</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Rotoscoping and tracking analysis completed for: "{results.sceneDescription}"
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="font-medium">Tracking Points:</span> {results.trackingPoints?.length || 0}
            </div>
            <div>
              <span className="font-medium">Processed Frames:</span> {results.processedFrames || 'N/A'}
            </div>
          </div>

          {/* Original Video */}
          {results.videoUrl && (
            <div className="space-y-2">
              <h5 className="font-medium">Processed Video with Tracking</h5>
              <MediaPreview url={results.videoUrl} type="video" />
            </div>
          )}

          {/* Alpha/Mask Channel Visualization */}
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-green-700 dark:text-green-300">Alpha/Mask Generated</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-3">
              Subject has been isolated from background. Mask data is embedded in the processed video.
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                <span className="font-medium">Format:</span> Alpha Channel
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded border">
                <span className="font-medium">Quality:</span> High
              </div>
            </div>
          </div>

          {/* Tracking Points Visualization */}
          {results.trackingPoints && results.trackingPoints.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Tracking Points Data
              </h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs">
                <p className="mb-2">Sample tracking coordinates:</p>
                <div className="space-y-1">
                  {results.trackingPoints.slice(0, 3).map((point, index) => (
                    <div key={index} className="flex gap-4">
                      <span>Frame {point.frame}:</span>
                      <span>X: {point.x.toFixed(1)}, Y: {point.y.toFixed(1)}</span>
                    </div>
                  ))}
                  {results.trackingPoints.length > 3 && (
                    <p className="text-muted-foreground">...and {results.trackingPoints.length - 3} more points</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Download Actions */}
          <div className="flex gap-2 mt-4">
            {results.videoUrl && (
              <Button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = results.videoUrl!;
                  link.download = `roto_tracked_${Date.now()}.mp4`;
                  link.click();
                }}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Tracked Video
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}