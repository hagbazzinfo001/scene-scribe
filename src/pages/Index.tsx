import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Film, Zap, Users, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <Film className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Nollywood AI Assistant
            </h1>
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Transform your film scripts into actionable production plans with AI-powered 
            breakdowns, scheduling, and collaboration tools built for Nigerian filmmakers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <a href="/auth">Get Started Free</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6 rounded-lg border bg-card">
            <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Script Breakdown</h3>
            <p className="text-muted-foreground">
              AI analyzes your scripts to identify scenes, characters, props, and locations automatically.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Generate optimized shooting schedules based on locations, cast availability, and budget.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Invite your crew to collaborate, comment, and stay updated on production changes.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Export Ready</h3>
            <p className="text-muted-foreground">
              Export breakdowns and schedules in PDF and CSV formats for your production team.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-8 rounded-lg bg-primary/5 border">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your film production?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Join hundreds of Nollywood filmmakers who've simplified their pre-production process.
          </p>
          <Button size="lg" className="text-lg px-8 py-6" asChild>
            <a href="/auth">Start Your First Project</a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
