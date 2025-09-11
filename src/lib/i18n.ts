import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation & Common
      "upload": "Upload",
      "run": "Run", 
      "processing": "Processing...",
      "download": "Download",
      "delete": "Delete",
      "coming_soon": "Coming soon",
      "settings": "Settings",
      "invite": "Invite",
      "refresh": "Refresh",
      "export": "Export",
      
      // Plugin names
      "script_breakdown": "Script Breakdown",
      "roto": "Rotoscoping",
      "audio_clean": "Audio Cleanup", 
      "color_grade": "Color Grade",
      "auto_rig": "Auto-Rig",
      
      // UI Messages
      "no_breakdowns": "No script breakdowns available yet.",
      "upload_script_hint": "Upload a script file to generate AI-powered breakdowns.",
      "delete_confirm": "Delete this asset permanently?",
      "delete_failed": "Delete failed",
      "asset_uploaded": "Asset uploaded and is being analyzed.",
      "processing_jobs": "Processing Jobs",
      "jobs_processed": "jobs successfully processed",
      
      // Feature messages
      "auto_rig_coming": "Auto-Rig is coming soon — sign up for beta access.",
      "invite_coming": "Project collaboration features will be available soon.",
      "settings_coming": "Project settings will be available soon.",
      
      // Language
      "language": "Language",
      "english": "English",
      "german": "German"
    }
  },
  de: {
    translation: {
      // Navigation & Common
      "upload": "Hochladen",
      "run": "Ausführen",
      "processing": "Verarbeitung...",
      "download": "Herunterladen", 
      "delete": "Löschen",
      "coming_soon": "Demnächst verfügbar",
      "settings": "Einstellungen",
      "invite": "Einladen",
      "refresh": "Aktualisieren",
      "export": "Exportieren",
      
      // Plugin names
      "script_breakdown": "Drehbuch-Analyse",
      "roto": "Rotoskopie",
      "audio_clean": "Audio-Bereinigung",
      "color_grade": "Farbkorrektur", 
      "auto_rig": "Auto-Rigging",
      
      // UI Messages
      "no_breakdowns": "Noch keine Drehbuch-Analysen verfügbar.",
      "upload_script_hint": "Laden Sie eine Drehbuch-Datei hoch, um KI-gestützte Analysen zu erstellen.",
      "delete_confirm": "Dieses Asset dauerhaft löschen?",
      "delete_failed": "Löschen fehlgeschlagen",
      "asset_uploaded": "Asset hochgeladen und wird analysiert.",
      "processing_jobs": "Jobs verarbeiten",
      "jobs_processed": "Jobs erfolgreich verarbeitet",
      
      // Feature messages  
      "auto_rig_coming": "Auto-Rigging ist bald verfügbar — melden Sie sich für Beta-Zugang an.",
      "invite_coming": "Projekt-Kollaborationsfunktionen werden bald verfügbar sein.",
      "settings_coming": "Projekteinstellungen werden bald verfügbar sein.",
      
      // Language
      "language": "Sprache",
      "english": "Englisch", 
      "german": "Deutsch"
    }
  }
};

const savedLng = typeof window !== 'undefined' ? (localStorage.getItem('language') || undefined) : undefined;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLng || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try { localStorage.setItem('language', lng); } catch {}
  });
}

export default i18n;