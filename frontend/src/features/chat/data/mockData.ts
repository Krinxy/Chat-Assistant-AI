import type {
  AttachmentAction,
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
    "Was wollen wir als naechstes bauen?",
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
    { id: "events", label: "Event hinzufuegen" },
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
      title: "Assistant-Latenz sinkt nach Cache-Rollout ueber Routing-Nodes",
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
      hourlyForecast: [
        { hour: "10:00", temperature: "19C" },
        { hour: "11:00", temperature: "20C" },
        { hour: "12:00", temperature: "20C" },
        { hour: "13:00", temperature: "21C" },
        { hour: "14:00", temperature: "21C" },
        { hour: "15:00", temperature: "20C" },
        { hour: "16:00", temperature: "19C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "15C" },
        { hour: "11:00", temperature: "15C" },
        { hour: "12:00", temperature: "16C" },
        { hour: "13:00", temperature: "16C" },
        { hour: "14:00", temperature: "15C" },
        { hour: "15:00", temperature: "15C" },
        { hour: "16:00", temperature: "14C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "22C" },
        { hour: "11:00", temperature: "23C" },
        { hour: "12:00", temperature: "24C" },
        { hour: "13:00", temperature: "25C" },
        { hour: "14:00", temperature: "25C" },
        { hour: "15:00", temperature: "24C" },
        { hour: "16:00", temperature: "23C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "18C" },
        { hour: "11:00", temperature: "19C" },
        { hour: "12:00", temperature: "19C" },
        { hour: "13:00", temperature: "20C" },
        { hour: "14:00", temperature: "20C" },
        { hour: "15:00", temperature: "19C" },
        { hour: "16:00", temperature: "18C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "19C" },
        { hour: "11:00", temperature: "20C" },
        { hour: "12:00", temperature: "20C" },
        { hour: "13:00", temperature: "21C" },
        { hour: "14:00", temperature: "21C" },
        { hour: "15:00", temperature: "20C" },
        { hour: "16:00", temperature: "19C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "15C" },
        { hour: "11:00", temperature: "15C" },
        { hour: "12:00", temperature: "16C" },
        { hour: "13:00", temperature: "16C" },
        { hour: "14:00", temperature: "15C" },
        { hour: "15:00", temperature: "15C" },
        { hour: "16:00", temperature: "14C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "22C" },
        { hour: "11:00", temperature: "23C" },
        { hour: "12:00", temperature: "24C" },
        { hour: "13:00", temperature: "25C" },
        { hour: "14:00", temperature: "25C" },
        { hour: "15:00", temperature: "24C" },
        { hour: "16:00", temperature: "23C" },
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
      hourlyForecast: [
        { hour: "10:00", temperature: "18C" },
        { hour: "11:00", temperature: "19C" },
        { hour: "12:00", temperature: "19C" },
        { hour: "13:00", temperature: "20C" },
        { hour: "14:00", temperature: "20C" },
        { hour: "15:00", temperature: "19C" },
        { hour: "16:00", temperature: "18C" },
      ],
    },
  ],
};
