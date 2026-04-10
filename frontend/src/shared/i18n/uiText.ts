import type { Language } from "../../features/chat/types/chat";

type NavKey = "home" | "chat" | "recommendations" | "notifications" | "profile";

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
    themeLight: string;
    themeDark: string;
  };
  header: {
    profileRole: string;
  };
  chat: {
    emptyState: string;
    modelSearchPlaceholder: string;
    noModelMatch: string;
    returnDashboard: string;
    servicesTitle: string;
    servicesActiveLabel: string;
    serviceLabels: Record<ServiceKey, string>;
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
        recommendations: "Empfehlungen",
        notifications: "Benachrichtigungen",
        profile: "Profil",
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
      themeLight: "Light Mode",
      themeDark: "Dark Mode",
    },
    header: {
      profileRole: "Softwarearchitekt",
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
      attachTitle: "Anhang hinzufuegen",
      inputPlaceholder: "Nachricht schreiben...",
      sendTitle: "Senden",
      audioTitle: "Audio aufnehmen",
      audioStopTitle: "Aufnahme stoppen",
      disclaimer:
        "Sprachmodelle koennen Fehler machen. Wichtige Informationen immer ueberpruefen.",
      streamStatus: "Antwort wird generiert...",
      speechListening: "Hoere zu... sprich jetzt.",
      speechUnsupported: "Spracheingabe wird in diesem Browser nicht unterstuetzt.",
      speechPermissionDenied: "Mikrofon-Zugriff wurde blockiert.",
      speechLocale: "de-DE",
      actionStartedPrefix: "Aktion gestartet",
      reasoningText: "Analysiere die Anfrage und sammle relevanten Kontext...",
    },
    weather: {
      title: "Wetter",
      prevCity: "Vorherige Stadt",
      nextCity: "Naechste Stadt",
      addCity: "Ort hinzufuegen",
      searchCityPlaceholder: "Ortschaft suchen...",
      addCityAction: "Hinzufuegen",
      cityAlreadyAdded: "Ort ist bereits vorhanden",
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
      subtitle: "Bereit fuer deinen Tag",
      subline: "",
      skip: "Intro ueberspringen",
    },
  },
  en: {
    sidebar: {
      nav: {
        home: "Home",
        chat: "Chat",
        recommendations: "Recommendations",
        notifications: "Notifications",
        profile: "Profile",
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
      themeLight: "Light Mode",
      themeDark: "Dark Mode",
    },
    header: {
      profileRole: "Software Architect",
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
