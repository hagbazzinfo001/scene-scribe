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
    const newLang = i18n.language === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={i18n.language === 'en' ? 'default' : 'outline'}
          size="sm"
          onClick={() => i18n.changeLanguage('en')}
          className="px-2 py-1 text-xs"
        >
          EN
        </Button>
        <Button
          variant={i18n.language === 'de' ? 'default' : 'outline'}
          size="sm"
          onClick={() => i18n.changeLanguage('de')}
          className="px-2 py-1 text-xs"
        >
          DE
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
      {i18n.language === 'en' ? t('german') : t('english')}
    </Button>
  );
}