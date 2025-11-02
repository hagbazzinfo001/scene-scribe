import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Film, Zap, Users, FileText, BarChart3, Rocket, Sparkles, Calendar, DollarSign, MessageSquare, Languages } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@/components/LanguageToggle';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

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
      {/* Header with Language Toggle */}
      <div className="container mx-auto px-4 py-4 flex justify-end">
        <LanguageToggle variant="mini" />
      </div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <Film className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              {t('welcome_to')} {t('nollyai_studio')}
            </h1>
          </div>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Lights, camera, AI — The future of Indie production begins here. Plan, analyze, and create with the smartest film assistant ever built.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <a href="/auth">{t('create_account')}</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => {
              document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Watch Demo
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-16 max-w-2xl mx-auto">
            Currently in early access — join our waitlist to be part of the first 5 studios shaping Africa's next-gen film software.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto" id="demo-section">
          <motion.div 
            className="text-center p-6 rounded-lg border bg-card"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Script Breakdown</h3>
            <p className="text-muted-foreground">
              AI analyzes your scripts to identify scenes, characters, props, and locations automatically.
            </p>
          </motion.div>

          <motion.div 
            className="text-center p-6 rounded-lg border bg-card"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              whileHover={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Generate optimized shooting schedules based on locations, cast availability, and budget.
            </p>
          </motion.div>

          <motion.div 
            className="text-center p-6 rounded-lg border bg-card"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Invite your crew to collaborate, comment, and stay updated on production changes.
            </p>
          </motion.div>

          <motion.div 
            className="text-center p-6 rounded-lg border bg-card"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              whileHover={{ y: [-5, 5, -5] }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Export Ready</h3>
            <p className="text-muted-foreground">
              Export breakdowns and schedules in PDF and CSV formats for your production team.
            </p>
          </motion.div>
        </div>

        {/* Feature Carousel Section */}
        <div className="mt-24 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Explore What We Offer</h2>
          <Carousel className="max-w-4xl mx-auto">
            <CarouselContent>
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <FileText className="h-16 w-16 text-primary" />
                    <Languages className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">AI Script Breakdown + Translation</h3>
                  <p className="text-muted-foreground text-lg">
                    Scene, character & prop intelligence with multi-language translation support
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <Calendar className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">Smart Scheduling</h3>
                  <p className="text-muted-foreground text-lg">
                    Automated timeline generation based on your project needs
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <DollarSign className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">Budget Planning</h3>
                  <p className="text-muted-foreground text-lg">
                    Cost prediction powered by data-driven insights
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <MessageSquare className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">Team Collaboration</h3>
                  <p className="text-muted-foreground text-lg">
                    AI notes and project chat for seamless team coordination
                  </p>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-12 rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background border">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your film production?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of Nollywood filmmakers who've simplified their pre-production process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6 gap-2" asChild>
              <a href="/auth">
                <Rocket className="h-5 w-5" />
                Join Waitlist
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 gap-2" onClick={() => {
              document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <Sparkles className="h-5 w-5" />
              See How It Works
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pb-8">
          <p className="text-sm text-muted-foreground/60">
            Developed by African Creators
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
