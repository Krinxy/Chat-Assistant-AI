import { useEffect, useMemo, useRef, useState } from "react";

import type { Language, LocalLlmConfig } from "../../features/chat/types/chat";
import { ACTIVE_DEV_PROFILE } from "../../shared/constants/devProfiles";
import { useDragScroll } from "../../shared/hooks/useDragScroll";

interface ProfilePanelProps {
  language: Language;
  localLlmConfig: LocalLlmConfig | null;
  onOpenLocalLlmSetup: () => void;
}

interface TuningConfig {
  temperature: number;
  topP: number;
  topK: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

interface BuiltInPreset {
  id: "balanced" | "precise" | "creative" | "research";
  label: string;
  values: TuningConfig;
}

interface CustomPreset {
  id: string;
  name: string;
  values: TuningConfig;
}

const defaultTuningConfig: TuningConfig = {
  temperature: 0.45,
  topP: 0.9,
  topK: 45,
  presencePenalty: 0.1,
  frequencyPenalty: 0.15,
};

const getInitialText = (key: string): string => {
  try {
    return globalThis.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

const getInitialTuningConfig = (): TuningConfig => {
  try {
    const raw = globalThis.localStorage.getItem("aura.profile.tuning");

    if (raw === null) {
      return defaultTuningConfig;
    }

    const parsed = JSON.parse(raw) as Partial<TuningConfig>;

    const numberOr = (value: unknown, fallback: number): number => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return fallback;
      }

      return value;
    };

    return {
      temperature: Math.min(1, Math.max(0, numberOr(parsed.temperature, defaultTuningConfig.temperature))),
      topP: Math.min(1, Math.max(0, numberOr(parsed.topP, defaultTuningConfig.topP))),
      topK: Math.round(Math.min(100, Math.max(1, numberOr(parsed.topK, defaultTuningConfig.topK)))),
      presencePenalty: Math.min(2, Math.max(-2, numberOr(parsed.presencePenalty, defaultTuningConfig.presencePenalty))),
      frequencyPenalty: Math.min(2, Math.max(-2, numberOr(parsed.frequencyPenalty, defaultTuningConfig.frequencyPenalty))),
    };
  } catch {
    return defaultTuningConfig;
  }
};

const getInitialCustomPresets = (): CustomPreset[] => {
  try {
    const raw = globalThis.localStorage.getItem("aura.profile.customPresets");

    if (raw === null) {
      return [];
    }

    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      values?: Partial<TuningConfig>;
    }>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item.id !== "string" || typeof item.name !== "string") {
          return null;
        }

        const values = item.values ?? {};

        return {
          id: item.id,
          name: item.name,
          values: {
            temperature: Math.min(1, Math.max(0, Number(values.temperature ?? defaultTuningConfig.temperature))),
            topP: Math.min(1, Math.max(0, Number(values.topP ?? defaultTuningConfig.topP))),
            topK: Math.round(Math.min(100, Math.max(1, Number(values.topK ?? defaultTuningConfig.topK)))),
            presencePenalty: Math.min(2, Math.max(-2, Number(values.presencePenalty ?? defaultTuningConfig.presencePenalty))),
            frequencyPenalty: Math.min(2, Math.max(-2, Number(values.frequencyPenalty ?? defaultTuningConfig.frequencyPenalty))),
          },
        };
      })
      .filter((item): item is CustomPreset => item !== null)
      .slice(0, 20);
  } catch {
    return [];
  }
};

const getInitialActivePresetKey = (): string | null => {
  try {
    return globalThis.localStorage.getItem("aura.profile.activePreset");
  } catch {
    return null;
  }
};

const getSliderTrackStyle = (value: number, min: number, max: number) => {
  const progress = ((value - min) / (max - min)) * 100;

  return {
    background: `linear-gradient(90deg,
      color-mix(in srgb, var(--feature-lilac) 78%, white) 0%,
      color-mix(in srgb, var(--feature-lilac) 92%, white) ${progress}%,
      color-mix(in srgb, var(--feature-lilac) 14%, transparent) ${progress}%,
      color-mix(in srgb, var(--feature-lilac) 14%, transparent) 100%)`,
  };
};

const formatFloat = (value: number): string => {
  return value.toFixed(2);
};

const formatSigned = (value: number): string => {
  if (value > 0) {
    return `+${value.toFixed(2)}`;
  }

  return value.toFixed(2);
};

const getRoleLabel = (): string => {
  return ACTIVE_DEV_PROFILE.role;
};

export function ProfilePanel({ language, localLlmConfig, onOpenLocalLlmSetup }: ProfilePanelProps) {
  const [aboutYou, setAboutYou] = useState<string>(() => getInitialText("aura.profile.aboutYou"));
  const [considerations, setConsiderations] = useState<string>(() => getInitialText("aura.profile.considerations"));
  const [tuning, setTuning] = useState<TuningConfig>(getInitialTuningConfig);
  const [activePresetKey, setActivePresetKey] = useState<string | null>(getInitialActivePresetKey);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(getInitialActivePresetKey);
  const [customPresetName, setCustomPresetName] = useState<string>("");
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(getInitialCustomPresets);
  const customPresetsListRef = useRef<HTMLDivElement | null>(null);
  const customPresetsDragScroll = useDragScroll(customPresetsListRef, "vertical");
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const builtInPresets = useMemo<BuiltInPreset[]>(() => {
    const presetLabels = language === "de"
      ? {
        balanced: "Ausgewogen",
        precise: "Präzise",
        creative: "Kreativ",
        research: "Recherche",
      }
      : {
        balanced: "Balanced",
        precise: "Precise",
        creative: "Creative",
        research: "Research",
      };

    return [
      {
        id: "balanced",
        label: presetLabels.balanced,
        values: {
          temperature: 0.45,
          topP: 0.9,
          topK: 45,
          presencePenalty: 0.1,
          frequencyPenalty: 0.15,
        },
      },
      {
        id: "precise",
        label: presetLabels.precise,
        values: {
          temperature: 0.2,
          topP: 0.75,
          topK: 20,
          presencePenalty: -0.1,
          frequencyPenalty: 0.3,
        },
      },
      {
        id: "creative",
        label: presetLabels.creative,
        values: {
          temperature: 0.85,
          topP: 0.98,
          topK: 75,
          presencePenalty: 0.4,
          frequencyPenalty: -0.05,
        },
      },
      {
        id: "research",
        label: presetLabels.research,
        values: {
          temperature: 0.35,
          topP: 0.82,
          topK: 32,
          presencePenalty: 0,
          frequencyPenalty: 0.55,
        },
      },
    ];
  }, [language]);

  const setConfigValue = (key: keyof TuningConfig, value: number): void => {
    setIsSaved(false);
    setSelectedPresetKey(null);
    setTuning((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const applyBuiltInPreset = (preset: BuiltInPreset): void => {
    setIsSaved(false);
    setSelectedPresetKey(`builtin:${preset.id}`);
    setTuning(preset.values);
  };

  const applyCustomPreset = (preset: CustomPreset): void => {
    setIsSaved(false);
    setSelectedPresetKey(`custom:${preset.id}`);
    setTuning(preset.values);
  };

  const saveCustomPreset = (): void => {
    const trimmedName = customPresetName.trim();

    if (trimmedName.length === 0) {
      return;
    }

    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: trimmedName,
      values: { ...tuning },
    };

    setCustomPresets((previous) => {
      const nextPresets = [newPreset, ...previous].slice(0, 20);
      try {
        globalThis.localStorage.setItem("aura.profile.customPresets", JSON.stringify(nextPresets));
      } catch {
        // Ignore storage failures in restrictive browser contexts.
      }

      return nextPresets;
    });
    setSelectedPresetKey(`custom:${newPreset.id}`);
    setCustomPresetName("");
    setIsSaved(false);
  };

  const deleteCustomPreset = (presetId: string): void => {
    setCustomPresets((previous) => {
      const nextPresets = previous.filter((preset) => preset.id !== presetId);
      try {
        globalThis.localStorage.setItem("aura.profile.customPresets", JSON.stringify(nextPresets));
      } catch {
        // Ignore storage failures in restrictive browser contexts.
      }

      return nextPresets;
    });

    const presetKey = `custom:${presetId}`;
    if (selectedPresetKey === presetKey) {
      setSelectedPresetKey(null);
    }

    if (activePresetKey === presetKey) {
      setActivePresetKey(null);
      try {
        globalThis.localStorage.setItem("aura.profile.activePreset", "custom");
      } catch {
        // Ignore storage failures in restrictive browser contexts.
      }
    }

    setIsSaved(false);
  };

  useEffect(() => {
    if (!isSaved) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setIsSaved(false);
    }, 1600);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [isSaved]);

  const text = language === "de"
    ? {
      title: "Profil",
      subtitle: "Persönliche Einstellungen für deinen Assistant",
      fullName: ACTIVE_DEV_PROFILE.fullName,
      email: ACTIVE_DEV_PROFILE.email,
      roleLabel: "Rolle",
      subscriptionLabel: "Subscription",
      subscriptionValue: "Pro Annual",
      planRenewal: "Verlängert am 16.08.2026",
      localModelTitle: "Lokales LLM",
      localModelFallback: "Noch kein lokales LLM konfiguriert",
      localSetupTitle: "vLLM Setup öffnen",
      aboutYouTitle: "Über dich",
      aboutYouHint: "Kurzer Kontext zu Rolle, Fokus und Arbeitsweise.",
      considerationsTitle: "Was soll ich beachten?",
      considerationsHint: "Regeln, Prioritäten und No-Gos für Antworten.",
      tuningTitle: "Modellparameter",
      tuningHint: "Einstellungen für LangChain/OpenAI-kompatible Generation.",
      applyTuning: "Übernehmen",
      presetsTitle: "Presets",
      customPresetsTitle: "Eigene Presets",
      customPresetPlaceholder: "Preset-Name",
      customPresetSave: "Preset speichern",
      customPresetDelete: "Preset löschen",
      temperature: "Temperature",
      topP: "Top P",
      topK: "Top K",
      presencePenalty: "Presence penalty",
      frequencyPenalty: "Frequency penalty",
      temperatureHint: "Steuert Kreativität (niedrig = stabiler).",
      temperatureLowLabel: "Konservativ",
      temperatureHighLabel: "Kreativ",
      topPHint: "Begrenzt Wahrscheinlichkeitssumme der Token-Auswahl.",
      topPLowLabel: "Fokussiert",
      topPHighLabel: "Vielfältig",
      topKHint: "Beschränkt Auswahl auf Top-K Kandidaten.",
      topKLowLabel: "Präzise",
      topKHighLabel: "Breit",
      presencePenaltyHint: "Fördert neue Inhalte statt Wiederholung.",
      presencePenaltyLowLabel: "Bleibt beim Kontext",
      presencePenaltyHighLabel: "Neue Aspekte",
      frequencyPenaltyHint: "Reduziert wiederholte Wörter/Phrasen.",
      frequencyPenaltyLowLabel: "Wiederholt eher",
      frequencyPenaltyHighLabel: "Wiederholt weniger",
      saved: "Gespeichert",
    }
    : {
      title: "Profile",
      subtitle: "Personal settings for your assistant",
      fullName: ACTIVE_DEV_PROFILE.fullName,
      email: ACTIVE_DEV_PROFILE.email,
      roleLabel: "Role",
      subscriptionLabel: "Subscription",
      subscriptionValue: "Pro Annual",
      planRenewal: "Renews on 16 Aug 2026",
      localModelTitle: "Local LLM",
      localModelFallback: "No local LLM configured yet",
      localSetupTitle: "Open vLLM setup",
      aboutYouTitle: "About you",
      aboutYouHint: "Short context about your role, focus and work style.",
      considerationsTitle: "What should I keep in mind?",
      considerationsHint: "Rules, priorities and boundaries for responses.",
      tuningTitle: "Model parameters",
      tuningHint: "Controls for LangChain/OpenAI-compatible generation.",
      applyTuning: "Apply",
      presetsTitle: "Presets",
      customPresetsTitle: "Custom presets",
      customPresetPlaceholder: "Preset name",
      customPresetSave: "Save preset",
      customPresetDelete: "Delete preset",
      temperature: "Temperature",
      topP: "Top P",
      topK: "Top K",
      presencePenalty: "Presence penalty",
      frequencyPenalty: "Frequency penalty",
      temperatureHint: "Controls creativity (lower = more deterministic).",
      temperatureLowLabel: "Conservative",
      temperatureHighLabel: "Creative",
      topPHint: "Limits token selection by probability mass.",
      topPLowLabel: "Focused",
      topPHighLabel: "Diverse",
      topKHint: "Caps token selection to top-k candidates.",
      topKLowLabel: "Precise",
      topKHighLabel: "Broad",
      presencePenaltyHint: "Encourages introducing new information.",
      presencePenaltyLowLabel: "Context anchored",
      presencePenaltyHighLabel: "Novel directions",
      frequencyPenaltyHint: "Reduces repeated words and phrases.",
      frequencyPenaltyLowLabel: "More repetition",
      frequencyPenaltyHighLabel: "Less repetition",
      saved: "Saved",
    };

  const aboutYouPlaceholder = language === "de"
    ? "z. B. Ich bin Product Owner, arbeite datengetrieben und priorisiere Klarheit."
    : "e.g. I am a product owner, data-driven, and I prioritize clarity.";

  const considerationsPlaceholder = language === "de"
    ? "z. B. Bitte antworte kompakt, gib Risiken zuerst an und nenne nächste Schritte."
    : "e.g. Keep replies concise, start with risks, and suggest next steps.";

  const handleApplyTuning = (): void => {
    const resolvedPresetKey = selectedPresetKey ?? "custom";

    try {
      globalThis.localStorage.setItem("aura.profile.aboutYou", aboutYou);
      globalThis.localStorage.setItem("aura.profile.considerations", considerations);
      globalThis.localStorage.setItem("aura.profile.tuning", JSON.stringify(tuning));
      globalThis.localStorage.setItem("aura.profile.activePreset", resolvedPresetKey);
      globalThis.localStorage.setItem("aura.profile.customPresets", JSON.stringify(customPresets));
    } catch {
      // Ignore storage failures in restrictive browser contexts.
    }

    setActivePresetKey(resolvedPresetKey);
    setIsSaved(true);
  };

  return (
    <section className="profile-panel" aria-label={text.title}>
      <header className="profile-panel-header">
        <div className="profile-panel-title-wrap">
          <h2>{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>

        <aside className="profile-header-identity" aria-label={text.fullName}>
          <strong>{text.fullName}</strong>
          <span>{text.email}</span>
          <span>{getRoleLabel()}</span>
        </aside>
      </header>

      <div className="profile-layout-grid">
        <div className="profile-layout-column">
          <article className="profile-card">
            <div className="profile-chip-row">
              <span>{text.subscriptionLabel}</span>
              <strong>{text.subscriptionValue}</strong>
            </div>
            <small>{text.planRenewal}</small>
          </article>

          <article className="profile-card profile-local-card">
            <div className="profile-local-card-header">
              <h3>{text.localModelTitle}</h3>
              <button
                type="button"
                className="profile-local-add-btn"
                onClick={onOpenLocalLlmSetup}
                title={text.localSetupTitle}
                aria-label={text.localSetupTitle}
              >
                +
              </button>
            </div>
            {localLlmConfig === null ? (
              <p>{text.localModelFallback}</p>
            ) : (
              <div className="profile-local-model-details">
                <p>{localLlmConfig.modelName}</p>
                <small>{localLlmConfig.endpoint}</small>
              </div>
            )}
          </article>
        </div>

        <div className="profile-layout-column">
          <article className="profile-card profile-persona-card">
            <label className="profile-field-stack">
              <span>{text.aboutYouTitle}</span>
              <small>{text.aboutYouHint}</small>
              <textarea
                value={aboutYou}
                onChange={(event) => {
                  setIsSaved(false);
                  setAboutYou(event.target.value);
                }}
                placeholder={aboutYouPlaceholder}
              />
            </label>

            <label className="profile-field-stack">
              <span>{text.considerationsTitle}</span>
              <small>{text.considerationsHint}</small>
              <textarea
                value={considerations}
                onChange={(event) => {
                  setIsSaved(false);
                  setConsiderations(event.target.value);
                }}
                placeholder={considerationsPlaceholder}
              />
            </label>
          </article>
        </div>
      </div>

      <article className="profile-card profile-tuning-card">
        <div className="profile-tuning-header">
          <div className="profile-tuning-headline-row">
            <h3>{text.tuningTitle}</h3>
            <div className="profile-tuning-actions">
              <button type="button" className="profile-tuning-apply-btn" onClick={handleApplyTuning}>
                + {text.applyTuning}
              </button>
              {isSaved ? <span className="profile-tuning-saved-pill">{text.saved}</span> : null}
            </div>
          </div>
        </div>

        <div className="profile-tuning-layout">
          <div className="profile-parameter-column">
            <div className="profile-parameter-stack">
              <label className="profile-parameter-slider">
                <div className="profile-parameter-head">
                  <span>{text.temperature}</span>
                  <strong>{formatFloat(tuning.temperature)}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={tuning.temperature}
                  style={getSliderTrackStyle(tuning.temperature, 0, 1)}
                  onChange={(event) => {
                    setConfigValue("temperature", Number.parseFloat(event.target.value));
                  }}
                />
                <div className="profile-parameter-scale-row">
                  <span>{text.temperatureLowLabel}</span>
                  <small>{text.temperatureHint}</small>
                  <span>{text.temperatureHighLabel}</span>
                </div>
              </label>

              <label className="profile-parameter-slider">
                <div className="profile-parameter-head">
                  <span>{text.topP}</span>
                  <strong>{formatFloat(tuning.topP)}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={tuning.topP}
                  style={getSliderTrackStyle(tuning.topP, 0, 1)}
                  onChange={(event) => {
                    setConfigValue("topP", Number.parseFloat(event.target.value));
                  }}
                />
                <div className="profile-parameter-scale-row">
                  <span>{text.topPLowLabel}</span>
                  <small>{text.topPHint}</small>
                  <span>{text.topPHighLabel}</span>
                </div>
              </label>

              <label className="profile-parameter-slider">
                <div className="profile-parameter-head">
                  <span>{text.topK}</span>
                  <strong>{Math.round(tuning.topK)}</strong>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={tuning.topK}
                  style={getSliderTrackStyle(tuning.topK, 1, 100)}
                  onChange={(event) => {
                    setConfigValue("topK", Number.parseInt(event.target.value, 10));
                  }}
                />
                <div className="profile-parameter-scale-row">
                  <span>{text.topKLowLabel}</span>
                  <small>{text.topKHint}</small>
                  <span>{text.topKHighLabel}</span>
                </div>
              </label>

              <label className="profile-parameter-slider">
                <div className="profile-parameter-head">
                  <span>{text.presencePenalty}</span>
                  <strong>{formatSigned(tuning.presencePenalty)}</strong>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={0.05}
                  value={tuning.presencePenalty}
                  style={getSliderTrackStyle(tuning.presencePenalty, -2, 2)}
                  onChange={(event) => {
                    setConfigValue("presencePenalty", Number.parseFloat(event.target.value));
                  }}
                />
                <div className="profile-parameter-scale-row">
                  <span>{text.presencePenaltyLowLabel}</span>
                  <small>{text.presencePenaltyHint}</small>
                  <span>{text.presencePenaltyHighLabel}</span>
                </div>
              </label>

              <label className="profile-parameter-slider">
                <div className="profile-parameter-head">
                  <span>{text.frequencyPenalty}</span>
                  <strong>{formatSigned(tuning.frequencyPenalty)}</strong>
                </div>
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={0.05}
                  value={tuning.frequencyPenalty}
                  style={getSliderTrackStyle(tuning.frequencyPenalty, -2, 2)}
                  onChange={(event) => {
                    setConfigValue("frequencyPenalty", Number.parseFloat(event.target.value));
                  }}
                />
                <div className="profile-parameter-scale-row">
                  <span>{text.frequencyPenaltyLowLabel}</span>
                  <small>{text.frequencyPenaltyHint}</small>
                  <span>{text.frequencyPenaltyHighLabel}</span>
                </div>
              </label>
            </div>
          </div>

          <aside className="profile-presets-column">
            <p className="profile-presets-title">{text.presetsTitle}</p>
            <div className="profile-presets-list">
              {builtInPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`profile-preset-btn${selectedPresetKey === `builtin:${preset.id}` ? " is-active" : ""}`}
                  onClick={() => applyBuiltInPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="profile-presets-title">{text.customPresetsTitle}</p>
            <div
              ref={customPresetsListRef}
              className={`profile-presets-list${customPresetsDragScroll.isDragging ? " is-dragging" : ""}`}
              {...customPresetsDragScroll.handlers}
            >
              {customPresets.map((preset) => (
                <div className="profile-custom-preset-row" key={preset.id}>
                  <button
                    type="button"
                    className={`profile-preset-btn${selectedPresetKey === `custom:${preset.id}` ? " is-active" : ""}`}
                    onClick={() => {
                      if (customPresetsDragScroll.hasMoved()) {
                        return;
                      }
                      applyCustomPreset(preset);
                    }}
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    className="profile-custom-preset-delete"
                    aria-label={`${text.customPresetDelete}: ${preset.name}`}
                    title={`${text.customPresetDelete}: ${preset.name}`}
                    onClick={() => deleteCustomPreset(preset.id)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <div className="profile-custom-preset-form">
              <input
                type="text"
                value={customPresetName}
                placeholder={text.customPresetPlaceholder}
                onChange={(event) => {
                  setIsSaved(false);
                  setCustomPresetName(event.target.value);
                }}
              />
              <button type="button" onClick={saveCustomPreset}>{text.customPresetSave}</button>
            </div>
          </aside>
        </div>
      </article>
    </section>
  );
}
