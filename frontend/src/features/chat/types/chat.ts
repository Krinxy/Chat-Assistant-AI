export type ChatRole = "assistant" | "user";

export interface ChatAttachment {
  id: string;
  name: string;
  isImage: boolean;
  previewUrl?: string;
}

export interface ChatSource {
  /** Document id stored in the chunk metadata (falls back as filename if unresolved). */
  source: string;
  /** Human-readable document name resolved by the backend. */
  filename: string;
  /** Zero-based index of the chunk within its document. */
  chunkIndex: number;
  /** Cosine similarity of the chunk to the query, in [0, 1]. */
  similarity: number;
}

export interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  time: string;
  isThinking?: boolean;
  reasoning?: string;
  isStreaming?: boolean;
  attachments?: ChatAttachment[];
  sources?: ChatSource[];
}

export interface AttachmentAction {
  id: string;
  label: string;
}

export interface ModelOption {
  id: string;
  label: string;
}

// Chat providers wired to the real backend. Keep in sync with the `llm.providers`
// keys in backend/config/backend.yaml. Models not mapping to one of these are not
// yet connected and fall back to a placeholder reply in the UI.
export type BackendProvider = "local" | "gemini";

export interface ModelProvider {
  id: string;
  label: string;
  models: ModelOption[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
}

export interface CompanyStoryItem {
  id: string;
  company: string;
  shortLabel: string;
  updates: string[];
}

export interface PersonaQuestionnaireAnswers {
  projectType: string;
  functionType: string;
  responseStructure: string;
  analysisGoal: string;
}

export interface WeatherStat {
  label: string;
  value: string;
}

export interface WeatherHourlyPoint {
  hour: string;
  temperature: string;
  feelsLike?: string;
  dayLabel?: string;
  dayOffset?: number;
  humidityOverride?: number;
  windOverride?: number;
}

export interface WeatherCity {
  id: string;
  city: string;
  country: string;
  condition: string;
  updatedAt: string;
  imageUrl?: string;
  stats: WeatherStat[];
  hourlyForecast?: WeatherHourlyPoint[];
}

export type ChatServiceKey =
  | "persona"
  | "factCheck"
  | "promptGuard"
  | "localConfigurator"
  | "brainrot";

export type BrainrotStyleKey = "meme67" | "aiFruits" | "aiSlop";

export interface LocalLlmConfig {
  endpoint: string;
  modelName: string;
  apiKey: string;
}

export type Language = "de" | "en";

export type ActiveView =
  | "dashboard"
  | "chat"
  | "companies"
  | "recommendations"
  | "notifications"
  | "profile"
  | "settings"
  | "guide"
  | "imprint"
  | "mydesk"
  | "documents";
