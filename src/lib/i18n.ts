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
      "projects": "Projects",
      "dashboard": "Dashboard",
      "chat": "Chat",
      "ai_assistant": "AI Assistant",
      "send_message": "Send message",
      "type_message": "Type your message...",
      "vfx_animation": "VFX & Animation",
      "asset_library": "Asset Library",
      "welcome_to": "Welcome to",
      "nollyai_studio": "NollyAI Studio",
      "create_account": "Create Account",
      "sign_in": "Sign In",
      "email": "Email",
      "password": "Password",
      "create_new_project": "Create New Project",
      "project_name": "Project Name",
      "description": "Description",
      "create": "Create",
      "preview": "Preview",
      "admin": "Admin",
      "users": "Users",
      "analytics": "Analytics",
      "api_keys": "API Keys",
      "system_status": "System Status",
      
      // Plugin names
      "script_breakdown": "Script Breakdown",
      "rotoscoping": "Rotoscoping",
      "audio_cleanup": "Audio Cleanup", 
      "color_grade": "Color Grade",
      "auto_rig": "Auto Rig",
      "mesh_generator": "Mesh Generator",
      
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
      "projects": "Projekte", 
      "dashboard": "Dashboard",
      "chat": "Chat",
      "ai_assistant": "KI-Assistent",
      "send_message": "Nachricht senden",
      "type_message": "Nachricht eingeben...",
      "vfx_animation": "VFX & Animation",
      "asset_library": "Asset-Bibliothek",
      "welcome_to": "Willkommen bei",
      "nollyai_studio": "NollyAI Studio",
      "create_account": "Konto erstellen",
      "sign_in": "Anmelden",
      "email": "E-Mail",
      "password": "Passwort",
      "create_new_project": "Neues Projekt erstellen",
      "project_name": "Projektname",
      "description": "Beschreibung",
      "create": "Erstellen",
      "preview": "Vorschau",
      "admin": "Admin",
      "users": "Benutzer",
      "analytics": "Analysen",
      "api_keys": "API-Schlüssel",
      "system_status": "Systemstatus",
      
      // Plugin names
      "script_breakdown": "Drehbuch-Analyse",
      "rotoscoping": "Rotoskopierung",
      "audio_cleanup": "Audio-Bereinigung",
      "color_grade": "Farbkorrektur", 
      "auto_rig": "Auto-Rigging",
      "mesh_generator": "Mesh-Generator",
      
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