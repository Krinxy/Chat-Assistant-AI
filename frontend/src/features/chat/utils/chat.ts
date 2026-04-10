import type { BrainrotStyleKey, Language } from "../types/chat";

interface ComposeAssistantReplyOptions {
  brainrotTone?: boolean;
  brainrotStyle?: BrainrotStyleKey;
}

const pickRandom = (values: string[]): string => {
  if (values.length === 0) {
    return "";
  }

  const index = Math.floor(Math.random() * values.length);
  return values[index] ?? values[0] ?? "";
};

const applyBrainrotTone = (
  text: string,
  language: Language,
  style: BrainrotStyleKey,
): string => {
  const variantsByStyle =
    language === "en"
      ? {
          meme67: [
            `No cap: ${text} Chat at 67% meme density, still delivering hard facts.`,
            `Meme-mode calibrated. ${text} Chaotic wording, clean result.`,
            `Certified goofy signal. ${text} Answer still lands on target.`,
          ],
          aiFruits: [
            `Fruit-core mode. ${text} This answer is ripe, juicy, and structured.`,
            `AI Fruits online. ${text} Fresh blend: sweet tone, precise output.`,
            `Banana-level absurdity, apple-level clarity. ${text}`,
          ],
          aiSlop: [
            `AI Slop aesthetic enabled. ${text} Looks messy, logic is not.`,
            `Slop-style shell, pro-grade core. ${text}`,
            `Intentional chaos wrapper. ${text} Substance preserved.`,
          ],
        }
      : {
          meme67: [
            `No cap: ${text} 67% Meme-Sprache, aber fachlich stabil.`,
            `Meme-Modus aktiv. ${text} Wild formuliert, sauber geliefert.`,
            `Goofy Vibe erkannt. ${text} Ergebnis bleibt praezise.`,
          ],
          aiFruits: [
            `Frucht-Modus aktiv. ${text} Reif, saftig und strukturiert.`,
            `AI-Fruechte online. ${text} Suesser Ton, klare Substanz.`,
            `Banane im Stil, Apfel in der Logik. ${text}`,
          ],
          aiSlop: [
            `AI-Slop-Look aktiv. ${text} Optisch chaotisch, inhaltlich sauber.`,
            `Slop-Aussenhuelle, stabile Antwort im Kern. ${text}`,
            `Absichtlich messy im Ton. ${text} Inhalt bleibt solide.`,
          ],
        };

  const variants = variantsByStyle[style];

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
    return applyBrainrotTone(baseReply, language, options.brainrotStyle ?? "meme67");
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
