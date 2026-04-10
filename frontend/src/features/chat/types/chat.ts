export type ChatRole = "assistant" | "user";

export interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  time: string;
  isThinking?: boolean;
  reasoning?: string;
  isStreaming?: boolean;
}

export interface AttachmentAction {
  id: string;
  label: string;
}

export interface ModelOption {
  id: string;
  label: string;
}

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

export interface WeatherStat {
  label: string;
  value: string;
}

export interface WeatherHourlyPoint {
  hour: string;
  temperature: string;
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
  | "guide";
