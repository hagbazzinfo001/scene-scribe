import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BreakdownResultsProps {
  jobs: any[];
  onExport: (job: any, format: string) => void;
}

export function BreakdownResults({ jobs, onExport }: BreakdownResultsProps) {
  const breakdownJobs = jobs.filter(job => 
    job.type === 'script-breakdown' && job.status === 'done' && job.output_data
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
                  onClick={() => onExport(job, 'csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport(job, 'pdf')}
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