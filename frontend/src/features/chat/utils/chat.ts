import type { Language } from "../types/chat";

interface ComposeAssistantReplyOptions {
  brainrotTone?: boolean;
}

const pickRandom = (values: string[]): string => {
  if (values.length === 0) {
    return "";
  }

  const index = Math.floor(Math.random() * values.length);
  return values[index] ?? values[0] ?? "";
};

const applyBrainrotTone = (text: string, language: Language): string => {
  const variants =
    language === "en"
      ? [
          `No cap: ${text} Tiny roast incoming: your prompt was chaos, but I cooked anyway.`,
          `Brainrot mode online. ${text} Low-key unhinged ask, high-key solid outcome.`,
          `Certified goofy energy detected. ${text} I still got your back though.`,
        ]
      : [
          `No cap: ${text} Mini-Roast: Dein Prompt war wild, aber ich hab geliefert.`,
          `Brainrot-Modus aktiv. ${text} Etwas cursed gefragt, trotzdem sauber beantwortet.`,
          `Komplett goofy Vibe heute. ${text} Ich rette das trotzdem locker.`,
        ];

  return pickRandom(variants);
};

export const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

export const composeAssistantReply = (
  prompt: string,
  modelLabel: string,
  language: Language,
  options: ComposeAssistantReplyOptions = {},
): string => {
  const baseReply =
    language === "en"
      ? pickRandom([
          `Understood: "${prompt}". I answer with ${modelLabel} and blend in weather/news while streaming.`,
          `Got it. Prompt locked: "${prompt}". Running on ${modelLabel} with context from weather and news.`,
          `Copy that: "${prompt}". I will use ${modelLabel} and inject live context step by step.`,
          `Task accepted: "${prompt}". ${modelLabel} is active and context channels are warming up.`,
        ])
      : pickRandom([
          `Verstanden: "${prompt}". Ich antworte mit ${modelLabel} und streame dabei Wetter- und News-Kontext rein.`,
          `Alles klar, Prompt sitzt: "${prompt}". Ich nutze ${modelLabel} mit Live-Kontext aus Wetter und News.`,
          `Auftrag angekommen: "${prompt}". ${modelLabel} ist aktiv, Kontext wird schrittweise nachgeladen.`,
          `Gelesen und gespeichert: "${prompt}". Antwort kommt ueber ${modelLabel} inkl. relevanter Zusatzinfos.`,
        ]);

  if (options.brainrotTone) {
    return applyBrainrotTone(baseReply, language);
  }

  return baseReply;
};

export const getGreetingFromUnixTime = (
  unixTime: number,
  language: Language,
): string => {
  const hour = new Date(unixTime * 1000).getHours();

  if (language === "en") {
    if (hour < 10) {
      return "Good morning";
    }

    if (hour < 12) {
      return "Good day";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }

  if (hour < 10) {
    return "Guten Morgen";
  }

  if (hour < 12) {
    return "Guten Tag";
  }

  if (hour < 18) {
    return "Schoenen Nachmittag";
  }

  return "Guten Abend";
};
