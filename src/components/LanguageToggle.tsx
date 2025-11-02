import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'mini' | 'full';
}

export function LanguageToggle({ variant = 'full' }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'en' ? 'de' : currentLang === 'de' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    try { localStorage.setItem('language', newLang); } catch {}
  };

  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={i18n.language === 'en' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            i18n.changeLanguage('en');
            try { localStorage.setItem('language', 'en'); } catch {}
          }}
          className="px-2 py-1 text-xs"
        >
          EN
        </Button>
        <Button
          variant={i18n.language === 'de' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            i18n.changeLanguage('de');
            try { localStorage.setItem('language', 'de'); } catch {}
          }}
          className="px-2 py-1 text-xs"
        >
          DE
        </Button>
        <Button
          variant={i18n.language === 'fr' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            i18n.changeLanguage('fr');
            try { localStorage.setItem('language', 'fr'); } catch {}
          }}
          className="px-2 py-1 text-xs"
        >
          FR
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      {i18n.language === 'en' ? t('german') : i18n.language === 'de' ? t('french') : t('english')}
    </Button>
  );
}