import type {
  AttachmentAction,
  CompanyStoryItem,
  Language,
  ModelProvider,
  NewsItem,
  WeatherCity,
} from "../types/chat";

export const headerQuestionsByLanguage: Record<Language, string[]> = {
  de: [
    "Wie war dein Tag?",
    "Was magst du heute fragen?",
    "Womit kann ich dir heute helfen?",
    "Was wollen wir als nächstes bauen?",
    "Was hast du heute noch so vor?",
    "Was gibt es Neues?",
    "Was kam zuerst, das Huhn oder das Ei?",
  ],
  en: [
    "How was your day?",
    "What do you want to ask today?",
    "How can I help you today?",
    "What should we build next?",
    "What are your plans for later today?",
    "What is new on your side?",
    "Which came first, the chicken or the egg?",
  ],
};

export const attachmentActionsByLanguage: Record<Language, AttachmentAction[]> = {
  de: [
    { id: "files", label: "Dateien anhaengen" },
    { id: "events", label: "Event hinzufügen" },
    { id: "cloud", label: "Aus Cloud hochladen" },
  ],
  en: [
    { id: "files", label: "Attach files" },
    { id: "events", label: "Add event" },
    { id: "cloud", label: "Upload from cloud" },
  ],
};

export const modelProviders: ModelProvider[] = [
  {
    id: "recent",
    label: "Recently used",
    models: [
      { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
      { id: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      { id: "claude-opus-4.1", label: "Claude Opus 4.1" },
      { id: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { id: "claude-haiku-3.5", label: "Claude Haiku 3.5" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
  {
    id: "google",
    label: "Google",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "local-self-hosted",
    label: "Local / Self-Hosted",
    models: [
      { id: "local-vllm-openai", label: "vLLM (OpenAI-compatible)" },
      { id: "local-llama-3.3-70b", label: "Llama 3.3 70B (Local)" },
    ],
  },
];

export const recommendedNewsByLanguage: Record<Language, NewsItem[]> = {
  de: [
    {
      id: "news-1",
      title: "Assistant-Latenz sinkt nach Cache-Rollout über Routing-Nodes",
      source: "Ops Digest",
    },
    {
      id: "news-2",
      title: "Wetterstation meldet ruhiges Regenfenster bis zum Abend",
      source: "Weather Wire",
    },
    {
      id: "news-3",
      title: "Support-Queue sinkt durch proaktive FAQ-Empfehlungen",
      source: "Product Notes",
    },
  ],
  en: [
    {
      id: "news-1",
      title: "Assistant latency drops after cache rollout across routing nodes",
      source: "Ops Digest",
    },
    {
      id: "news-2",
      title: "Weather station predicts calm rain window through the evening",
      source: "Weather Wire",
    },
    {
      id: "news-3",
      title: "Support queue volume decreases after proactive FAQ suggestions",
      source: "Product Notes",
    },
  ],
};

export const companyStoriesByLanguage: Record<Language, CompanyStoryItem[]> = {
  de: [
    {
      id: "aurora-bank-story",
      company: "Aurora Bank",
      shortLabel: "AB",
      updates: [
        "Pilotregion wurde auf DACH erweitert.",
        "KPI-Ziel auf Antwortzeit unter 2.1s gesenkt.",
        "Legal Review für Datenaufbewahrung bis Freitag geplant.",
      ],
    },
    {
      id: "nordlicht-logistics-story",
      company: "Nordlicht Logistics",
      shortLabel: "NL",
      updates: [
        "Zwei neue Depots gehen in Q3 in den Rollout.",
        "SLA-Delta im heutigen Ops-Call abgestimmt.",
        "Renewal-Board vorbereitet mit Fokus Dispatch.",
      ],
    },
    {
      id: "cobalt-health-story",
      company: "Cobalt Health",
      shortLabel: "CH",
      updates: [
        "EMEA Procurement Framework freigegeben.",
        "Neue Compliance-Hinweise für Teamspaces aktiv.",
        "Security Review für Rollenmaskierung terminiert.",
      ],
    },
    {
      id: "sunset-insurance-story",
      company: "Sunset Insurance",
      shortLabel: "SI",
      updates: [
        "Board gibt Pilot für Dokument-Routing frei.",
        "Claims Persona Prompting in Stufe 2 gestartet.",
        "Weekly Summary mit Risk Tags ist live.",
      ],
    },
    {
      id: "nova-commerce-story",
      company: "Nova Commerce",
      shortLabel: "NC",
      updates: [
        "Fuenf weitere Stores gehen in den Pilot-Rollout.",
        "Handover-Template für Filialleiter wurde freigegeben.",
        "Support SOP für Peak-Zeiten ist live.",
      ],
    },
    {
      id: "polaris-media-story",
      company: "Polaris Media",
      shortLabel: "PM",
      updates: [
        "Editorial Board budgetiert neues Experiment in Q3.",
        "Persona-Cluster für Kampagnen erweitert.",
        "Confidence Tags in Empfehlungen wurden angefragt.",
      ],
    },
    {
      id: "urban-harbor-story",
      company: "Urban Harbor",
      shortLabel: "UH",
      updates: [
        "Zwei Immobilien wechseln in Modernisierungsplanung.",
        "Portfolio-Risk-Brief für Vorstand vorbereitet.",
        "Neue Handover-Standards für Property Teams aktiviert.",
      ],
    },
    {
      id: "greenforge-energy-story",
      company: "Greenforge Energy",
      shortLabel: "GE",
      updates: [
        "Modernisierungsbudget für 2026 final bestätigt.",
        "Grid Overview wurde mit Finance geteilt.",
        "Executive Summary für Site Review aktualisiert.",
      ],
    },
    {
      id: "lumen-telecom-story",
      company: "Lumen Telecom",
      shortLabel: "LT",
      updates: [
        "Neuer KPI-Dashboard Pilot für Enterprise Kunden startet.",
        "Incident-Playbook mit Priority-Mapping abgestimmt.",
        "Team-Enablement Session für SLA-Tracking geplant.",
      ],
    },
  ],
  en: [
    {
      id: "aurora-bank-story",
      company: "Aurora Bank",
      shortLabel: "AB",
      updates: [
        "Pilot region expanded across DACH.",
        "KPI target lowered to response time below 2.1s.",
        "Legal review for retention wording scheduled for Friday.",
      ],
    },
    {
      id: "nordlicht-logistics-story",
      company: "Nordlicht Logistics",
      shortLabel: "NL",
      updates: [
        "Two new depots are entering the Q3 rollout.",
        "SLA delta aligned in today's ops call.",
        "Renewal board draft prepared with dispatch focus.",
      ],
    },
    {
      id: "cobalt-health-story",
      company: "Cobalt Health",
      shortLabel: "CH",
      updates: [
        "EMEA procurement framework approved.",
        "New compliance hints enabled for team workspaces.",
        "Security review for role-based masking is scheduled.",
      ],
    },
    {
      id: "sunset-insurance-story",
      company: "Sunset Insurance",
      shortLabel: "SI",
      updates: [
        "Board approved pilot for document routing.",
        "Claims persona prompting entered stage two.",
        "Weekly summary with risk tags is live.",
      ],
    },
    {
      id: "nova-commerce-story",
      company: "Nova Commerce",
      shortLabel: "NC",
      updates: [
        "Five additional stores are entering the pilot rollout.",
        "Handover template for store managers was approved.",
        "Support SOP for peak windows is now live.",
      ],
    },
    {
      id: "polaris-media-story",
      company: "Polaris Media",
      shortLabel: "PM",
      updates: [
        "Editorial board budgeted a new Q3 experiment.",
        "Campaign persona cluster was expanded.",
        "Confidence tags in recommendations were requested.",
      ],
    },
    {
      id: "urban-harbor-story",
      company: "Urban Harbor",
      shortLabel: "UH",
      updates: [
        "Two properties moved into modernization planning.",
        "Portfolio risk brief prepared for the executive board.",
        "New handover standards enabled for property teams.",
      ],
    },
    {
      id: "greenforge-energy-story",
      company: "Greenforge Energy",
      shortLabel: "GE",
      updates: [
        "Modernization budget for 2026 was fully confirmed.",
        "Grid overview was shared with finance leadership.",
        "Executive summary for site review was updated.",
      ],
    },
    {
      id: "lumen-telecom-story",
      company: "Lumen Telecom",
      shortLabel: "LT",
      updates: [
        "New KPI dashboard pilot starts for enterprise customers.",
        "Incident playbook aligned with priority mapping.",
        "Team enablement session for SLA tracking is scheduled.",
      ],
    },
  ],
};

export const weatherCitiesByLanguage: Record<Language, WeatherCity[]> = {
  de: [
    {
      id: "berlin",
      city: "Berlin",
      country: "DE",
      condition: "Leichter Regen",
      updatedAt: "09:44",
      imageUrl: "https://picsum.photos/seed/berlin-city/960/360",
      stats: [
        { label: "Temperature", value: "19C" },
        { label: "Feels like", value: "17C" },
        { label: "Humidity", value: "63%" },
        { label: "Wind", value: "14 km/h" },
      ],
    },
    {
      id: "hamburg",
      city: "Hamburg",
      country: "DE",
      condition: "Windig und klar",
      updatedAt: "09:46",
      imageUrl: "https://picsum.photos/seed/hamburg-city/960/360",
      stats: [
        { label: "Temperature", value: "15C" },
        { label: "Feels like", value: "12C" },
        { label: "Humidity", value: "71%" },
        { label: "Wind", value: "28 km/h" },
      ],
    },
    {
      id: "muenchen",
      city: "Muenchen",
      country: "DE",
      condition: "Sonnige Fenster",
      updatedAt: "09:42",
      imageUrl: "https://picsum.photos/seed/munich-city/960/360",
      stats: [
        { label: "Temperature", value: "22C" },
        { label: "Feels like", value: "23C" },
        { label: "Humidity", value: "46%" },
        { label: "Wind", value: "9 km/h" },
      ],
    },
    {
      id: "koeln",
      city: "Koeln",
      country: "DE",
      condition: "Bedeckt",
      updatedAt: "09:41",
      imageUrl: "https://picsum.photos/seed/cologne-city/960/360",
      stats: [
        { label: "Temperature", value: "18C" },
        { label: "Feels like", value: "18C" },
        { label: "Humidity", value: "66%" },
        { label: "Wind", value: "16 km/h" },
      ],
    },
  ],
  en: [
    {
      id: "berlin",
      city: "Berlin",
      country: "DE",
      condition: "Light rain",
      updatedAt: "09:44",
      imageUrl: "https://picsum.photos/seed/berlin-city/960/360",
      stats: [
        { label: "Temperature", value: "19C" },
        { label: "Feels like", value: "17C" },
        { label: "Humidity", value: "63%" },
        { label: "Wind", value: "14 km/h" },
      ],
    },
    {
      id: "hamburg",
      city: "Hamburg",
      country: "DE",
      condition: "Breezy and clear",
      updatedAt: "09:46",
      imageUrl: "https://picsum.photos/seed/hamburg-city/960/360",
      stats: [
        { label: "Temperature", value: "15C" },
        { label: "Feels like", value: "12C" },
        { label: "Humidity", value: "71%" },
        { label: "Wind", value: "28 km/h" },
      ],
    },
    {
      id: "muenchen",
      city: "Munich",
      country: "DE",
      condition: "Sunny windows",
      updatedAt: "09:42",
      imageUrl: "https://picsum.photos/seed/munich-city/960/360",
      stats: [
        { label: "Temperature", value: "22C" },
        { label: "Feels like", value: "23C" },
        { label: "Humidity", value: "46%" },
        { label: "Wind", value: "9 km/h" },
      ],
    },
    {
      id: "koeln",
      city: "Cologne",
      country: "DE",
      condition: "Cloudy",
      updatedAt: "09:41",
      imageUrl: "https://picsum.photos/seed/cologne-city/960/360",
      stats: [
        { label: "Temperature", value: "18C" },
        { label: "Feels like", value: "18C" },
        { label: "Humidity", value: "66%" },
        { label: "Wind", value: "16 km/h" },
      ],
    },
  ],
};
