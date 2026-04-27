import type { BrainrotStyleKey, Language } from "../../features/chat/types/chat";

type NavKey =
  | "home"
  | "chat"
  | "companies"
  | "recommendations"
  | "notifications"
  | "profile"
  | "settings"
  | "mydesk";

type ServiceKey =
  | "persona"
  | "factCheck"
  | "promptGuard"
  | "localConfigurator"
  | "brainrot";

export interface UiText {
  sidebar: {
    nav: Record<NavKey, string>;
    lastChatsTitle: string;
    newChatTitle: string;
    moreChats: string;
    lessChats: string;
    languageTitle: string;
    languageDe: string;
    languageEn: string;
    currentSessionTitle: string;
    scopeLabel: string;
    modelLabel: string;
    servicesLabel: string;
    noActiveServices: string;
    noMessagesYet: string;
    activeNow: string;
    featureGuideButton: string;
    themeLight: string;
    themeDark: string;
    imprint: string;
  };
  header: {
    profileRole: string;
    storiesLabel: string;
    storyNewsLabel: string;
    storyCloseLabel: string;
  };
  chat: {
    emptyState: string;
    modelSearchPlaceholder: string;
    noModelMatch: string;
    returnDashboard: string;
    servicesTitle: string;
    servicesActiveLabel: string;
    serviceLabels: Record<ServiceKey, string>;
    serviceTooltips: Record<ServiceKey, string>;
    personaWizardTitle: string;
    personaWizardSubtitle: string;
    personaProjectQuestion: string;
    personaFunctionQuestion: string;
    personaStructureQuestion: string;
    personaGoalQuestion: string;
    personaInputPlaceholder: string;
    personaBack: string;
    personaNext: string;
    personaFinish: string;
    personaSkip: string;
    personaSummaryPrefix: string;
    brainrotStyleLabel: string;
    brainrotStyleActivePrefix: string;
    brainrotStyles: Record<BrainrotStyleKey, string>;
    removeService: string;
    localConfigTitle: string;
    localConfigHint: string;
    localSetupSteps: string[];
    localEndpoint: string;
    localModelName: string;
    localApiKey: string;
    localSave: string;
    localSaved: string;
    attachTitle: string;
    inputPlaceholder: string;
    sendTitle: string;
    audioTitle: string;
    audioStopTitle: string;
    disclaimer: string;
    streamStatus: string;
    speechListening: string;
    speechUnsupported: string;
    speechPermissionDenied: string;
    speechBackendUnavailable: string;
    speechLocale: string;
    actionStartedPrefix: string;
    reasoningText: string;
  };
  weather: {
    title: string;
    prevCity: string;
    nextCity: string;
    addCity: string;
    searchCityPlaceholder: string;
    addCityAction: string;
    cityAlreadyAdded: string;
    hourlyForecastTitle: string;
    feelsLikeToggle: string;
    recommendedNews: string;
    updatedPrefix: string;
    generatedCondition: string[];
  };
  welcome: {
    titlePrefix: string;
    titleVariants: string[];
    kicker: string;
    subtitle: string;
    subline: string;
    skip: string;
  };
}

export const uiTextByLanguage: Record<Language, UiText> = {
  de: {
    sidebar: {
      nav: {
        home: "Home",
        chat: "Chat",
        companies: "Workspace",
        recommendations: "Empfehlungen",
        notifications: "Benachrichtigungen",
        profile: "Profil",
        settings: "Einstellungen",
        mydesk: "Mein Schreibtisch",
      },
      lastChatsTitle: "Letzte Chats",
      newChatTitle: "Neuer Chat",
      moreChats: "Mehr anzeigen",
      lessChats: "Weniger anzeigen",
      languageTitle: "Sprache",
      languageDe: "Deutsch",
      languageEn: "Englisch",
      currentSessionTitle: "Aktuelle Session",
      scopeLabel: "Bereich",
      modelLabel: "Modell",
      servicesLabel: "Services",
      noActiveServices: "Keine aktiven Services",
      noMessagesYet: "Noch keine Nachrichten",
      activeNow: "Aktiv",
      featureGuideButton: "Help",
      themeLight: "Light Mode",
      themeDark: "Dark Mode",
      imprint: "Impressum",
    },
    header: {
      profileRole: "Softwarearchitekt",
      storiesLabel: "Stories",
      storyNewsLabel: "Daily News",
      storyCloseLabel: "Schließen",
    },
    chat: {
      emptyState: "Wie kann ich dir helfen?",
      modelSearchPlaceholder: "Modelle suchen",
      noModelMatch: "Kein passendes Modell gefunden.",
      returnDashboard: "Dashboard",
      servicesTitle: "Optionale Services aktivieren",
      servicesActiveLabel: "Aktive Services",
      serviceLabels: {
        persona: "Persona",
        factCheck: "Faktencheck",
        promptGuard: "Prompt Guard",
        localConfigurator: "Lokales LLM Setup",
        brainrot: "Brainrot",
      },
      serviceTooltips: {
        persona: "Antwortstil mit persönlicher Rolle und Tonalität anreichern.",
        factCheck: "Aussagen gegen verfügbare Quellen gegenprüfen.",
        promptGuard: "Eingaben auf riskante oder unerwünschte Anweisungen prüfen.",
        localConfigurator: "Lokales LLM einmalig einrichten und direkt im Picker nutzen.",
        brainrot: "Antworten in einen bewusst verspielten Meme-Stil umwandeln.",
      },
      personaWizardTitle: "Persona Setup",
      personaWizardSubtitle:
        "Kurz einordnen, damit Antworten später besser zum Projekt und zur Rolle passen.",
      personaProjectQuestion: "1. Was für ein Projekt ist es?",
      personaFunctionQuestion: "2. Welche Funktion soll die Analyse unterstützen?",
      personaStructureQuestion: "3. Welche Antwort-Struktur brauchst du?",
      personaGoalQuestion: "4. Was ist das wichtigste Ziel für die Auswertung?",
      personaInputPlaceholder: "Kurz und klar beschreiben...",
      personaBack: "Zurück",
      personaNext: "Weiter",
      personaFinish: "Fertig",
      personaSkip: "Später",
      personaSummaryPrefix: "Persona Kontext gesetzt",
      brainrotStyleLabel: "Brainrot Style",
      brainrotStyleActivePrefix: "Stil",
      brainrotStyles: {
        meme67: "67 Meme Sprache",
        aiFruits: "AI Früchte",
        aiSlop: "AI Slop",
      },
      removeService: "Service entfernen",
      localConfigTitle: "Lokales LLM anbinden",
      localConfigHint:
        "Nur Endpoint und Modellname setzen. Alles Weitere kannst du danach selbst in deiner Runtime erweitern.",
      localSetupSteps: [
        "1. Lokalen OpenAI-kompatiblen Endpoint starten.",
        "2. Endpoint und Modellname eintragen.",
        "3. Speichern und direkt im Modell-Picker verwenden.",
      ],
      localEndpoint: "vLLM Endpoint URL",
      localModelName: "Lokaler Modellname",
      localApiKey: "API Key (optional)",
      localSave: "Konfiguration speichern",
      localSaved: "Konfiguration gespeichert",
      attachTitle: "Anhang hinzufügen",
      inputPlaceholder: "Nachricht schreiben...",
      sendTitle: "Senden",
      audioTitle: "Audio aufnehmen",
      audioStopTitle: "Aufnahme stoppen",
      disclaimer:
        "Sprachmodelle können Fehler machen. Wichtige Informationen immer überprüfen.",
      streamStatus: "Antwort wird generiert...",
      speechListening: "Höre zu... sprich jetzt.",
      speechUnsupported: "Spracheingabe wird in diesem Browser nicht unterstützt.",
      speechPermissionDenied: "Mikrofon-Zugriff wurde blockiert.",
      speechBackendUnavailable:
        "Transkriptions-Service ist nicht erreichbar. Bitte lokalen Backend-Service starten.",
      speechLocale: "de-DE",
      actionStartedPrefix: "Aktion gestartet",
      reasoningText: "Analysiere die Anfrage und sammle relevanten Kontext...",
    },
    weather: {
      title: "Wetter",
      prevCity: "Vorherige Stadt",
      nextCity: "Nächste Stadt",
      addCity: "Ort hinzufügen",
      searchCityPlaceholder: "Ortschaft suchen...",
      addCityAction: "Hinzufügen",
      cityAlreadyAdded: "Ort ist bereits vorhanden",
      hourlyForecastTitle: "Stuendliche Prognose",
      feelsLikeToggle: "Gefuehlt",
      recommendedNews: "Empfohlene News",
      updatedPrefix: "Aktualisiert",
      generatedCondition: [
        "Leichter Regen",
        "Bedeckt",
        "Sonnige Fenster",
        "Frischer Wind",
      ],
    },
    welcome: {
      titlePrefix: "Willkommen",
      titleVariants: ["Hi", "Hallo", "Moin", "Servus"],
      kicker: "AURA",
      subtitle: "Bereit für deinen Tag",
      subline: "",
      skip: "Intro überspringen",
    },
  },
  en: {
    sidebar: {
      nav: {
        home: "Home",
        chat: "Chat",
        companies: "Workspace",
        recommendations: "Recommendations",
        notifications: "Notifications",
        profile: "Profile",
        settings: "Settings",
        mydesk: "My Desk",
      },
      lastChatsTitle: "Recent Chats",
      newChatTitle: "New Chat",
      moreChats: "Show more",
      lessChats: "Show less",
      languageTitle: "Language",
      languageDe: "German",
      languageEn: "English",
      currentSessionTitle: "Current Session",
      scopeLabel: "Scope",
      modelLabel: "Model",
      servicesLabel: "Services",
      noActiveServices: "No active services",
      noMessagesYet: "No messages yet",
      activeNow: "Active",
      featureGuideButton: "Help",
      themeLight: "Light Mode",
      themeDark: "Dark Mode",
      imprint: "Imprint",
    },
    header: {
      profileRole: "Software Architect",
      storiesLabel: "Stories",
      storyNewsLabel: "Daily News",
      storyCloseLabel: "Close",
    },
    chat: {
      emptyState: "How can I help you?",
      modelSearchPlaceholder: "Search models",
      noModelMatch: "No matching model found.",
      returnDashboard: "Dashboard",
      servicesTitle: "Enable optional services",
      servicesActiveLabel: "Active services",
      serviceLabels: {
        persona: "Persona",
        factCheck: "Fact Check",
        promptGuard: "Prompt Guard",
        localConfigurator: "Local LLM Setup",
        brainrot: "Brainrot",
      },
      serviceTooltips: {
        persona: "Shapes answer tone and role context for your assistant.",
        factCheck: "Cross-checks claims against available sources.",
        promptGuard: "Screens prompts for risky or unwanted instructions.",
        localConfigurator: "Connect a local model endpoint and use it in the picker.",
        brainrot: "Applies a playful meme-style transformation to responses.",
      },
      personaWizardTitle: "Persona setup",
      personaWizardSubtitle:
        "Provide quick context so downstream analysis can map role, project, and intent.",
      personaProjectQuestion: "1. What kind of project is this?",
      personaFunctionQuestion: "2. Which function should this analysis support?",
      personaStructureQuestion: "3. What response structure do you prefer?",
      personaGoalQuestion: "4. What is the main outcome you expect?",
      personaInputPlaceholder: "Describe briefly and clearly...",
      personaBack: "Back",
      personaNext: "Next",
      personaFinish: "Finish",
      personaSkip: "Later",
      personaSummaryPrefix: "Persona context configured",
      brainrotStyleLabel: "Brainrot style",
      brainrotStyleActivePrefix: "Style",
      brainrotStyles: {
        meme67: "67 Meme Language",
        aiFruits: "AI Fruits",
        aiSlop: "AI Slop",
      },
      removeService: "Remove service",
      localConfigTitle: "Connect local LLM",
      localConfigHint:
        "Provide only endpoint and model name. Extend auth or advanced runtime settings later in your own implementation.",
      localSetupSteps: [
        "1. Start your local OpenAI-compatible endpoint.",
        "2. Enter endpoint and model name.",
        "3. Save and use it from the model picker.",
      ],
      localEndpoint: "vLLM endpoint URL",
      localModelName: "Local model name",
      localApiKey: "API key (optional)",
      localSave: "Save configuration",
      localSaved: "Configuration saved",
      attachTitle: "Add attachment",
      inputPlaceholder: "Type a message...",
      sendTitle: "Send",
      audioTitle: "Record audio",
      audioStopTitle: "Stop recording",
      disclaimer:
        "Language models can make mistakes. Always verify important information.",
      streamStatus: "Generating response...",
      speechListening: "Listening... speak now.",
      speechUnsupported: "Speech input is not supported in this browser.",
      speechPermissionDenied: "Microphone access was denied.",
      speechBackendUnavailable:
        "Transcription service is unreachable. Start the local backend service.",
      speechLocale: "en-US",
      actionStartedPrefix: "Action started",
      reasoningText: "Analyzing request and gathering relevant context...",
    },
    weather: {
      title: "Weather",
      prevCity: "Previous city",
      nextCity: "Next city",
      addCity: "Add location",
      searchCityPlaceholder: "Search location...",
      addCityAction: "Add",
      cityAlreadyAdded: "Location already added",
      hourlyForecastTitle: "Hourly forecast",
      feelsLikeToggle: "Feels like",
      recommendedNews: "Recommended News",
      updatedPrefix: "Updated",
      generatedCondition: [
        "Light rain",
        "Cloudy",
        "Sunny windows",
        "Breezy",
      ],
    },
    welcome: {
      titlePrefix: "Welcome",
      titleVariants: ["Hi", "Hello", "Hey", "Welcome"],
      kicker: "AURA",
      subtitle: "Ready for your day",
      subline: "",
      skip: "Skip intro",
    },
  },
};
