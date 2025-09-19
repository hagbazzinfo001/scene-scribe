import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

interface BreakdownResultsProps {
  jobs: any[];
  onExport: (job: any, format: string) => void;
}

const exportToCSV = (job: any) => {
  const breakdown = job.output_data;
  let csvContent = "Type,Name,Description,Characters\n";
  
  if (breakdown?.scenes) {
    breakdown.scenes.forEach((scene: any) => {
      const chars = scene.characters ? scene.characters.join('; ') : '';
      csvContent += `Scene,"${scene.location || ''}","${scene.description || ''}","${chars}"\n`;
    });
  }
  
  if (breakdown?.characters) {
    breakdown.characters.forEach((char: any) => {
      csvContent += `Character,"${char.name || char}","${char.importance || ''}",""\n`;
    });
  }
  
  if (breakdown?.props) {
    breakdown.props.forEach((prop: string) => {
      csvContent += `Prop,"${prop}","",""\n`;
    });
  }
  
  if (breakdown?.locations) {
    breakdown.locations.forEach((location: string) => {
      csvContent += `Location,"${location}","",""\n`;
    });
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `script-breakdown-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported successfully!');
};

const exportToPDF = (job: any) => {
  // Simple PDF export - in production, you'd use a proper PDF library
  const breakdown = job.output_data;
  let textContent = "SCRIPT BREAKDOWN REPORT\n\n";
  
  if (breakdown?.scenes) {
    textContent += "SCENES:\n";
    breakdown.scenes.forEach((scene: any, idx: number) => {
      textContent += `${idx + 1}. ${scene.location || 'Unknown Location'}\n`;
      textContent += `   ${scene.description || 'No description'}\n`;
      if (scene.characters) {
        textContent += `   Characters: ${scene.characters.join(', ')}\n`;
      }
      textContent += "\n";
    });
  }
  
  if (breakdown?.characters) {
    textContent += "\nCHARACTERS:\n";
    breakdown.characters.forEach((char: any) => {
      textContent += `- ${char.name || char}${char.importance ? ` (${char.importance})` : ''}\n`;
    });
  }
  
  if (breakdown?.props) {
    textContent += "\nPROPS:\n";
    breakdown.props.forEach((prop: string) => {
      textContent += `- ${prop}\n`;
    });
  }
  
  if (breakdown?.locations) {
    textContent += "\nLOCATIONS:\n";
    breakdown.locations.forEach((location: string) => {
      textContent += `- ${location}\n`;
    });
  }
  
  const blob = new Blob([textContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `script-breakdown-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Report exported successfully!');
};

export function BreakdownResults({ jobs, onExport }: BreakdownResultsProps) {
  const breakdownJobs = jobs.filter(job => 
    (job.type === 'script-breakdown' || job.type === 'script_breakdown') && 
    job.status === 'done' && job.output_data
  );

  if (breakdownJobs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No script breakdowns available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a script file to generate AI-powered breakdowns.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {breakdownJobs.map((job) => (
        <Card key={job.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Script Breakdown</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(job)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(job)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Generated on {new Date(job.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Scenes */}
              {job.output_data?.scenes && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Scenes ({job.output_data.scenes.length})
                  </h4>
                  <div className="grid gap-2 max-h-40 overflow-y-auto">
                    {job.output_data.scenes.slice(0, 5).map((scene: any, idx: number) => (
                      <div key={idx} className="text-sm border rounded p-2">
                        <div className="font-medium">
                          Scene {scene.id || idx + 1}: {scene.location}
                        </div>
                        <div className="text-muted-foreground">
                          {scene.description}
                        </div>
                        {scene.characters && (
                          <div className="mt-1">
                            <span className="text-xs text-muted-foreground">
                              Characters: {scene.characters.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Characters */}
              {job.output_data?.characters && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Characters ({job.output_data.characters.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.output_data.characters.map((char: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {char.name} {char.importance && `(${char.importance})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Props */}
              {job.output_data?.props && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Props ({job.output_data.props.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {job.output_data.props.map((prop: string, idx: number) => (
                      <Badge key={idx} variant="outline">{prop}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {job.output_data?.locations && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Locations ({job.output_data.locations.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {job.output_data.locations.map((location: string, idx: number) => (
                      <Badge key={idx} variant="outline">{location}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}