import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Film, Zap, Users, FileText, BarChart3, Rocket, Sparkles, Calendar, DollarSign, MessageSquare, Languages, Box, Globe2, FileDown } from 'lucide-react';
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
            {t('hero_subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <a href="/auth">{t('create_account')}</a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => {
              document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              {t('watch_demo')}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-16 max-w-2xl mx-auto">
            {t('early_access_note')}
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
            <h3 className="text-xl font-semibold mb-2">{t('script_breakdown_title')}</h3>
            <p className="text-muted-foreground">
              {t('script_breakdown_desc')}
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
            <h3 className="text-xl font-semibold mb-2">{t('smart_scheduling_title')}</h3>
            <p className="text-muted-foreground">
              {t('smart_scheduling_desc')}
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
            <h3 className="text-xl font-semibold mb-2">{t('team_collaboration_title')}</h3>
            <p className="text-muted-foreground">
              {t('team_collaboration_desc')}
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
            <h3 className="text-xl font-semibold mb-2">{t('export_ready_title')}</h3>
            <p className="text-muted-foreground">
              {t('export_ready_desc')}
            </p>
          </motion.div>
        </div>

        {/* Feature Carousel Section */}
        <div className="mt-24 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">{t('explore_features')}</h2>
          <Carousel className="max-w-4xl mx-auto">
            <CarouselContent>
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <FileText className="h-16 w-16 text-primary" />
                    <Languages className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{t('ai_breakdown_translation')}</h3>
                  <p className="text-muted-foreground text-lg">
                    {t('ai_breakdown_translation_desc')}
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <Calendar className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{t('smart_scheduling')}</h3>
                  <p className="text-muted-foreground text-lg">
                    {t('smart_scheduling_carousel_desc')}
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <DollarSign className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{t('budget_planning')}</h3>
                  <p className="text-sm text-primary/80 font-medium mb-2">+ {t('budget_planning_ai')}</p>
                  <p className="text-muted-foreground text-lg">
                    {t('budget_planning_desc')}
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <MessageSquare className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{t('team_collab_carousel')}</h3>
                  <p className="text-muted-foreground text-lg">
                    {t('team_collab_carousel_desc')}
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <Box className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{t('mesh_generator_carousel')}</h3>
                  <p className="text-muted-foreground text-lg">
                    {t('mesh_generator_carousel_desc')}
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Globe2 className="h-16 w-16 text-primary" />
                    <Languages className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{t('translation_localization')}</h3>
                  <p className="text-sm text-primary/80 font-medium mb-2">{t('translation_prototype')}</p>
                  <p className="text-muted-foreground text-lg">
                    {t('translation_desc')}
                  </p>
                </div>
              </CarouselItem>
              
              <CarouselItem>
                <div className="text-center p-12 rounded-lg border bg-card/50 backdrop-blur">
                  <FileDown className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-3">{t('export_formats')}</h3>
                  <p className="text-muted-foreground text-lg">
                    {t('export_formats_desc')}
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
          <h2 className="text-3xl font-bold mb-4">{t('ready_to_streamline')}</h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('join_hundreds')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6 gap-2" asChild>
              <a href="/auth">
                <Rocket className="h-5 w-5" />
                {t('join_waitlist')}
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 gap-2" onClick={() => {
              document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              <Sparkles className="h-5 w-5" />
              {t('see_how_it_works')}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pb-8">
          <p className="text-sm text-muted-foreground/60">
            {t('developed_by_african')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
