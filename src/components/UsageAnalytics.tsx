import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, DollarSign, Clock, TrendingUp, Download, Zap } from "lucide-react";
import { aiService } from "@/services/aiService";
import { toast } from "sonner";

interface UsageReport {
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  totalRequests: number;
  successRate: number;
  byProvider: Record<string, { tokens: number; cost: number; requests: number }>;
  byEndpoint: Record<string, { tokens: number; cost: number; requests: number }>;
  costPerRequest: number;
  migrationRecommendation: string;
}

export function UsageAnalytics() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));
      
      const reportData = await aiService.getUsageReport(startDate, endDate);
      setReport(reportData);
    } catch (error) {
      toast.error("Failed to load usage analytics");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeRange]);

  const getMigrationStatusColor = (recommendation: string) => {
    if (recommendation.includes("Strong candidate")) return "bg-red-500";
    if (recommendation.includes("Consider migrating")) return "bg-yellow-500";
    if (recommendation.includes("hybrid")) return "bg-blue-500";
    return "bg-green-500";
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading analytics...</div>;
  }

  if (!report) {
    return <div className="text-center p-8">No usage data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Usage Analytics</h2>
          <p className="text-muted-foreground">Track AI costs and plan migration to self-hosted models</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
          <Button onClick={fetchReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Success rate: {(report.successRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${report.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${report.costPerRequest.toFixed(4)} per request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Average latency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Migration Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Migration Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Badge 
              className={`${getMigrationStatusColor(report.migrationRecommendation)} text-white`}
            >
              Status
            </Badge>
            <div>
              <p className="font-medium">{report.migrationRecommendation}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Based on your current usage patterns and costs. Consider migrating high-volume, 
                lower-accuracy endpoints first while keeping critical features on hosted APIs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage by Provider</CardTitle>
            <CardDescription>Compare costs across different AI providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(report.byProvider).map(([provider, stats]) => (
                <div key={provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{provider}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.requests} requests
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${stats.cost.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by Feature</CardTitle>
            <CardDescription>Identify which features to migrate first</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(report.byEndpoint).map(([endpoint, stats]) => (
                <div key={endpoint} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{endpoint}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.requests} requests
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${stats.cost.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Roadmap</CardTitle>
          <CardDescription>Suggested phases for transitioning to self-hosted models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-green-700">Phase 1: MVP & Validation (Current)</h4>
              <p className="text-sm text-muted-foreground">
                Continue using hosted APIs. Focus on features and user acquisition.
                Track usage metrics and costs.
              </p>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-medium text-yellow-700">Phase 2: Prepare Migration (500-1K users)</h4>
              <p className="text-sm text-muted-foreground">
                Test LLaMA models on rented GPU servers. Compare quality vs cost.
                Abstract AI calls through service layer (already implemented).
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-blue-700">Phase 3: Hybrid Mode (Revenue)</h4>
              <p className="text-sm text-muted-foreground">
                Move low-risk features to self-hosted models. Keep critical features on hosted APIs.
                Implement automatic fallback systems.
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium text-purple-700">Phase 4: Full Migration & Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Run self-hosted models for all features. Offer tiered AI quality (Standard vs Pro).
                Maintain fallback to hosted APIs for edge cases.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}