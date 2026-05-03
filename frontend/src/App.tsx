import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChatPanel } from "./features/chat/components/ChatPanel";
import {
  attachmentActionsByLanguage,
  companyStoriesByLanguage,
  headerQuestionsByLanguage,
  modelProviders,
  recommendedNewsByLanguage,
  weatherCitiesByLanguage,
} from "./features/chat/data/mockData";
import { useChatSession } from "./features/chat/hooks/useChatSession";
import type {
  ActiveView,
  BrainrotStyleKey,
  ChatServiceKey,
  Language,
  LocalLlmConfig,
  ModelOption,
  PersonaQuestionnaireAnswers,
} from "./features/chat/types/chat";
import { CompanyWorkspacePanel } from "./pages/CompanyWorkspacePage/CompanyWorkspacePanel";
import { FeatureGuidePanel } from "./pages/FeatureGuidePage/FeatureGuidePanel";
import { MyDeskPanel } from "./pages/MyDeskPage/MyDeskPanel";
import { getGreetingFromUnixTime } from "./features/chat/utils/chat";
import { ProfilePanel } from "./pages/ProfilePage/ProfilePanel";
import { UserProfilePanel } from "./pages/ProfilePage/UserProfilePanel";
import {
  personalAppointments,
  weekdayLabelsByLanguage,
} from "./pages/CompanyWorkspacePage/companyWorkspace.data";
import { userProfile } from "./shared/data/userProfile";
import { uiTextByLanguage } from "./shared/i18n/uiText";
import { ACTIVE_DEV_PROFILE } from "./shared/constants/devProfiles";
import { WelcomeOverlay } from "./shared/components/ui/WelcomeOverlay";
import { DashboardAside } from "./widgets/dashboard/DashboardAside";
import { Header } from "./widgets/header/Header";
import { Sidebar } from "./widgets/sidebar/Sidebar";

const WELCOME_START_EXIT_MS = 2100;
const WELCOME_HIDE_MS = 3000;
const WELCOME_SKIP_HIDE_MS = 420;
const ENABLE_INSTAFEED = false;

type ThemeMode = "light" | "dark";
type InviteDecision = "accepted" | "declined";

interface NotificationFeedItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

const getInitialLanguage = (): Language => {
  try {
    const stored = globalThis.localStorage.getItem("aura.language");

    if (stored === "de" || stored === "en") {
      return stored;
    }
  } catch {
    // Local storage may be unavailable in some browser privacy contexts.
  }

  return "de";
};

const getThemeFromClock = (): ThemeMode => {
  const hour = new Date().getHours();
  return hour >= 16 || hour < 8 ? "dark" : "light";
};

const getInitialTheme = (): ThemeMode => {
  try {
    const stored = globalThis.localStorage.getItem("aura.theme");

    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Ignore storage read failures and keep resolving theme from runtime signals.
  }

  if (typeof globalThis.matchMedia === "function") {
    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

    if (mediaQuery.media !== "not all") {
      return mediaQuery.matches ? "dark" : "light";
    }
  }

  return getThemeFromClock();
};

const pickRandom = (values: string[], fallback: string): string => {
  if (values.length === 0) {
    return fallback;
  }

  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex] ?? fallback;
};

const getInitialBrainrotStyle = (): BrainrotStyleKey => {
  try {
    const stored = globalThis.localStorage.getItem("aura.brainrotStyle");

    if (stored === "meme67" || stored === "aiFruits" || stored === "aiSlop") {
      return stored;
    }
  } catch {
    // Ignore storage failures and keep default style.
  }

  return "meme67";
};

export default function App() {
  const initialLanguageRef = useRef<Language>(getInitialLanguage());
  const initialLanguage = initialLanguageRef.current;

  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [selectedModelId, setSelectedModelId] = useState<string>("gpt-5.3-codex");
  const [activeServices, setActiveServices] = useState<ChatServiceKey[]>([]);
  const [brainrotStyle, setBrainrotStyle] = useState<BrainrotStyleKey>(getInitialBrainrotStyle);
  const [localModelOptions, setLocalModelOptions] = useState<ModelOption[]>([]);
  const [localLlmConfig, setLocalLlmConfig] = useState<LocalLlmConfig | null>(null);
  const [unixTime, setUnixTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [deskRsvpDecisions, setDeskRsvpDecisions] = useState<Record<string, InviteDecision>>({});
  const [notificationFeed, setNotificationFeed] = useState<NotificationFeedItem[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const [isWelcomeVisible, setIsWelcomeVisible] = useState<boolean>(true);
  const [isWelcomeLeaving, setIsWelcomeLeaving] = useState<boolean>(false);
  const [isViewSwitching, setIsViewSwitching] = useState<boolean>(false);
  const [welcomeTitlePrefix, setWelcomeTitlePrefix] = useState<string>(() => {
    const initialCopy = uiTextByLanguage[initialLanguage].welcome;
    return pickRandom(initialCopy.titleVariants, initialCopy.titlePrefix);
  });
  const welcomeTimeoutIdsRef = useRef<
    Array<ReturnType<typeof globalThis.setTimeout>>
  >([]);
  const viewTransitionTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(
    null,
  );

  const ui = useMemo(() => uiTextByLanguage[language], [language]);

  const headerQuestions = useMemo(() => {
    return headerQuestionsByLanguage[language];
  }, [language]);

  const attachmentActions = useMemo(() => {
    return attachmentActionsByLanguage[language];
  }, [language]);

  const recommendedNews = useMemo(() => {
    return recommendedNewsByLanguage[language];
  }, [language]);

  const companyStories = useMemo(() => {
    return companyStoriesByLanguage[language];
  }, [language]);

  const weatherCities = useMemo(() => {
    return weatherCitiesByLanguage[language];
  }, [language]);

  const availableModelProviders = useMemo(() => {
    return modelProviders.map((provider) => {
      if (provider.id !== "local-self-hosted") {
        return provider;
      }

      return {
        ...provider,
        models: [...provider.models, ...localModelOptions],
      };
    });
  }, [localModelOptions]);

  const allModelsFlat = useMemo(() => {
    return availableModelProviders.flatMap((provider) => provider.models);
  }, [availableModelProviders]);

  useEffect(() => {
    try {
      globalThis.localStorage.setItem("aura.language", language);
    } catch {
      // Ignore persistence failure and keep runtime language state.
    }
  }, [language]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      globalThis.localStorage.setItem("aura.theme", theme);
    } catch {
      // Ignore storage write failures and keep runtime theme state.
    }
  }, [theme]);

  useEffect(() => {
    try {
      globalThis.localStorage.setItem("aura.brainrotStyle", brainrotStyle);
    } catch {
      // Ignore storage write failures and keep runtime style state.
    }
  }, [brainrotStyle]);

  useEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setUnixTime(Math.floor(Date.now() / 1000));
    }, 60000);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    setWelcomeTitlePrefix(pickRandom(ui.welcome.titleVariants, ui.welcome.titlePrefix));
  }, [ui.welcome.titlePrefix, ui.welcome.titleVariants]);

  useEffect(() => {
    const exitTimeoutId = globalThis.setTimeout(() => {
      setIsWelcomeLeaving(true);
    }, WELCOME_START_EXIT_MS);

    const hideTimeoutId = globalThis.setTimeout(() => {
      setIsWelcomeVisible(false);
      setIsWelcomeLeaving(false);
    }, WELCOME_HIDE_MS);

    welcomeTimeoutIdsRef.current.push(exitTimeoutId, hideTimeoutId);

    return () => {
      welcomeTimeoutIdsRef.current.forEach((timeoutId) => {
        globalThis.clearTimeout(timeoutId);
      });
      welcomeTimeoutIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof globalThis.matchMedia === "function") {
      const isMobileViewport = globalThis.matchMedia("(max-width: 900px)").matches;

      if (isMobileViewport) {
        setIsSidebarOpen(false);
      }
    }
  }, [activeView]);

  useEffect(() => {
    setIsViewSwitching(true);

    if (viewTransitionTimeoutRef.current !== null) {
      globalThis.clearTimeout(viewTransitionTimeoutRef.current);
    }

    viewTransitionTimeoutRef.current = globalThis.setTimeout(() => {
      setIsViewSwitching(false);
    }, 340);

    return () => {
      if (viewTransitionTimeoutRef.current !== null) {
        globalThis.clearTimeout(viewTransitionTimeoutRef.current);
      }
    };
  }, [activeView]);

  const selectedModel = useMemo<ModelOption>(() => {
    return (
      allModelsFlat.find((model) => model.id === selectedModelId) ?? allModelsFlat[0]
    );
  }, [selectedModelId]);

  const {
    draft,
    setDraft,
    messages,
    isTyping,
    sendMessage,
    addAttachmentActionMessage,
    addUploadedFilesMessage,
    resetSession,
    openSessionFromPreview,
  } = useChatSession({
    selectedModelId,
    selectedModelLabel: selectedModel.label,
    language,
    isBrainrotEnabled: activeServices.includes("brainrot"),
    brainrotStyle,
    actionStartedPrefix: ui.chat.actionStartedPrefix,
    reasoningText: ui.chat.reasoningText,
    onFirstUserMessage: () => {
      setActiveView("chat");
      setIsSidebarOpen(false);
    },
  });

  const latestMessagePreview = useMemo(() => {
    const latestMessage = [...messages]
      .reverse()
      .find((message) => message.text.trim().length > 0);

    if (latestMessage === undefined) {
      return null;
    }

    return {
      text: latestMessage.text,
      time: latestMessage.time,
    };
  }, [messages]);

  const greeting = useMemo<string>(() => {
    return getGreetingFromUnixTime(unixTime, language);
  }, [language, unixTime]);

  const randomHeaderQuestion = useMemo<string>(() => {
    const index = Math.floor(Math.random() * headerQuestions.length);
    return headerQuestions[index] ?? headerQuestions[0] ?? "";
  }, [headerQuestions]);

  const skipWelcome = (): void => {
    setIsWelcomeLeaving(true);

    const hideTimeoutId = globalThis.setTimeout(() => {
      setIsWelcomeVisible(false);
      setIsWelcomeLeaving(false);
    }, WELCOME_SKIP_HIDE_MS);

    welcomeTimeoutIdsRef.current.push(hideTimeoutId);
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>): void => {
    const hasSent = sendMessage(event);

    if (!hasSent) {
      return;
    }

    setActiveView("chat");
  };

  const handleAttachmentAction = (actionId: string): void => {
    const action = attachmentActions.find((item) => item.id === actionId);

    if (action === undefined) {
      return;
    }

    addAttachmentActionMessage(action.label);
  };

  const handleAttachmentUpload = useCallback((files: File[]): void => {
    if (files.length === 0) {
      return;
    }

    addUploadedFilesMessage(files);
  }, [addUploadedFilesMessage]);

  const handleReturnToDashboard = (): void => {
    setActiveView("dashboard");
    setIsSidebarOpen(true);
  };

  const handleStartNewChat = useCallback((): void => {
    resetSession();
    setActiveView("chat");
    setIsSidebarOpen(false);
  }, [resetSession]);

  const handleOpenRecentChat = useCallback((previewText: string, timeLabel: string): void => {
    openSessionFromPreview(previewText, timeLabel);
    setActiveView("chat");
    setIsSidebarOpen(false);
  }, [openSessionFromPreview]);

  const handleOpenProfile = useCallback((): void => {
    setActiveView("profile");
    setIsSidebarOpen(true);
  }, []);

  const inviteNotifications = useMemo(() => {
    const weekDays = weekdayLabelsByLanguage[language];
    const invites = personalAppointments
      .filter((appointment) => appointment.invitedBy !== undefined)
      .map((appointment) => {
        const status = deskRsvpDecisions[appointment.id] ?? appointment.rsvp ?? "pending";
        return {
          ...appointment,
          status,
          dayLabel: weekDays[appointment.dayIndex] ?? "",
        };
      });

    return invites.sort((a, b) => a.weekIndex - b.weekIndex || a.dayIndex - b.dayIndex || a.timeLabel.localeCompare(b.timeLabel));
  }, [deskRsvpDecisions, language]);

  const handleDeskRsvpDecision = useCallback((appointmentId: string, decision: InviteDecision): void => {
    setDeskRsvpDecisions((previous) => ({ ...previous, [appointmentId]: decision }));
    const appointment = personalAppointments.find((entry) => entry.id === appointmentId);
    if (appointment === undefined) {
      return;
    }

    const actionLabel = language === "de"
      ? (decision === "accepted" ? "zugesagt" : "abgesagt")
      : (decision === "accepted" ? "accepted" : "declined");
    const actorLabel = language === "de" ? "Du hast" : "You";
    const message = `${actorLabel} ${actionLabel}: ${appointment.title}`;

    setNotificationFeed((previous) => ([
      {
        id: `${appointmentId}-${Date.now()}`,
        title: message,
        detail: `${appointment.timeLabel}${appointment.endTimeLabel !== undefined ? ` - ${appointment.endTimeLabel}` : ""}`,
        timestamp: new Date().toLocaleTimeString(language === "de" ? "de-DE" : "en-US", { hour: "2-digit", minute: "2-digit" }),
      },
      ...previous,
    ]).slice(0, 16));
    setSnackbarMessage(message);
  }, [language]);

  useEffect(() => {
    if (snackbarMessage === null) {
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      setSnackbarMessage(null);
    }, 3200);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [snackbarMessage]);

  const handleOpenLocalLlmSetup = useCallback((): void => {
    setActiveView("chat");
    setIsSidebarOpen(false);
    setActiveServices((previous) => {
      if (previous.includes("localConfigurator")) {
        return previous;
      }

      return [...previous, "localConfigurator"];
    });
  }, []);

  const handleAddService = useCallback((serviceKey: ChatServiceKey): void => {
    setActiveServices((previous) => {
      if (previous.includes(serviceKey)) {
        return previous;
      }

      return [...previous, serviceKey];
    });
  }, []);

  const handleRemoveService = useCallback((serviceKey: ChatServiceKey): void => {
    setActiveServices((previous) => previous.filter((item) => item !== serviceKey));
  }, []);

  const handleSaveLocalLlmConfig = useCallback((config: LocalLlmConfig): void => {
    setLocalLlmConfig(config);

    const normalizedModelId = config.modelName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const modelId = `local-custom-${normalizedModelId || "model"}`;
    const modelLabel = `${config.modelName.trim()} (Local)`;

    setLocalModelOptions((previous) => {
      if (previous.some((option) => option.id === modelId)) {
        return previous;
      }

      return [...previous, { id: modelId, label: modelLabel }];
    });

    setSelectedModelId(modelId);

    const localSavedLabel =
      language === "de"
        ? `Lokales LLM gespeichert: ${config.modelName}`
        : `Local LLM saved: ${config.modelName}`;
    addAttachmentActionMessage(localSavedLabel);
  }, [addAttachmentActionMessage, language]);

  const handlePersonaProfileReady = useCallback((answers: PersonaQuestionnaireAnswers): void => {
    const summary = language === "de"
      ? [
        "Persona Kontext gesetzt:",
        `Projekt=${answers.projectType};`,
        `Funktion=${answers.functionType};`,
        `Struktur=${answers.responseStructure};`,
        `Ziel=${answers.analysisGoal}`,
      ].join(" ")
      : [
        "Persona context configured:",
        `Project=${answers.projectType};`,
        `Function=${answers.functionType};`,
        `Structure=${answers.responseStructure};`,
        `Goal=${answers.analysisGoal}`,
      ].join(" ");

    addAttachmentActionMessage(summary);
  }, [addAttachmentActionMessage, language]);

  const hasStartedChat = activeView === "chat";

  const showChatAndDashboardLayout = activeView === "dashboard" || activeView === "chat";

  const viewPanelText = useMemo(() => {
    if (activeView === "recommendations") {
      return {
        title: language === "de" ? "Empfehlungen" : "Recommendations",
        description:
          language === "de"
            ? "Hier erscheinen priorisierte Vorschlaege auf Basis deiner Session und Modelle."
            : "Prioritized suggestions based on your current session and model usage appear here.",
      };
    }

    return null;
  }, [activeView, language]);

  return (
    <div className={`dashboard-root ${hasStartedChat ? "chat-mode-root" : "is-dashboard"}`}>
      {isWelcomeVisible ? (
        <WelcomeOverlay
          userName={ACTIVE_DEV_PROFILE.firstName}
          isLeaving={isWelcomeLeaving}
          onSkip={skipWelcome}
          titlePrefix={welcomeTitlePrefix}
          kicker={ui.welcome.kicker}
          subtitle={randomHeaderQuestion}
          subline=""
          skipLabel={ui.welcome.skip}
        />
      ) : null}

      {!showChatAndDashboardLayout && !isSidebarOpen ? (
        <button
          type="button"
          className="mobile-menu-trigger mobile-menu-trigger-floating"
          onClick={() => {
            setIsSidebarOpen(true);
          }}
          aria-label="Open navigation"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      ) : null}

      {isSidebarOpen ? (
        <div
          className="mobile-sidebar-backdrop"
          role="presentation"
          onClick={() => {
            setIsSidebarOpen(false);
          }}
        />
      ) : null}

      <div
        className={`dashboard-shell${isSidebarOpen ? "" : " is-collapsed"} ${
          hasStartedChat ? "chat-mode-shell" : ""
        }`}
      >
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeView={activeView}
          setActiveView={setActiveView}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          onToggleTheme={() => {
            setTheme((previous) => (previous === "dark" ? "light" : "dark"));
          }}
          copy={ui.sidebar}
          activeServiceLabels={activeServices.map((serviceKey) => ui.chat.serviceLabels[serviceKey])}
          latestMessagePreview={latestMessagePreview}
          onStartNewChat={handleStartNewChat}
          onOpenRecentChat={handleOpenRecentChat}
        />

        <main className="main-stage">
          {activeView === "dashboard" ? (
            <Header
              greeting={greeting}
              randomHeaderQuestion={randomHeaderQuestion}
              hasStartedChat={hasStartedChat}
              showChatBrand={false}
              profileRole={ui.header.profileRole}
              storiesLabel={ui.header.storiesLabel}
              storyNewsLabel={ui.header.storyNewsLabel}
              storyCloseLabel={ui.header.storyCloseLabel}
              companyStories={companyStories}
              onOpenProfile={handleOpenProfile}
              onOpenSidebar={() => {
                setIsSidebarOpen(true);
              }}
              showStories={ENABLE_INSTAFEED}
            />
          ) : null}

          {showChatAndDashboardLayout ? (
            <div
              className={`content-grid ${hasStartedChat ? "chat-focused" : "dashboard-focused"} ${
                isViewSwitching ? "is-view-switching" : ""
              }`}
            >
              <ChatPanel
                hasStartedChat={hasStartedChat}
                draft={draft}
                setDraft={setDraft}
                messages={messages}
                isTyping={isTyping}
                selectedModel={selectedModel}
                selectedModelId={selectedModelId}
                modelProviders={availableModelProviders}
                attachmentActions={attachmentActions}
                onSendMessage={handleSendMessage}
                onAttachmentAction={handleAttachmentAction}
                onAttachmentUpload={handleAttachmentUpload}
                onModelSelect={setSelectedModelId}
                activeServices={activeServices}
                onServiceAdd={handleAddService}
                onServiceRemove={handleRemoveService}
                brainrotStyle={brainrotStyle}
                onBrainrotStyleChange={setBrainrotStyle}
                onLocalLlmConfigSave={handleSaveLocalLlmConfig}
                onPersonaProfileReady={handlePersonaProfileReady}
                onReturnToDashboard={handleReturnToDashboard}
                onOpenProfile={handleOpenProfile}
                copy={ui.chat}
              />

              {!hasStartedChat ? (
                <DashboardAside
                  recommendedNews={recommendedNews}
                  weatherCities={weatherCities}
                  copy={ui.weather}
                  language={language}
                />
              ) : null}
            </div>
          ) : null}

          {activeView === "profile" ? (
            <UserProfilePanel
              language={language}
              onOpenSettings={() => {
                setActiveView("settings");
              }}
            />
          ) : null}

          {activeView === "mydesk" ? (
            <MyDeskPanel
              language={language}
              rsvpDecisions={deskRsvpDecisions}
              onRsvpDecision={handleDeskRsvpDecision}
            />
          ) : null}

          {activeView === "notifications" ? (
            <section
              className="utility-view-panel notifications-panel"
              aria-label={language === "de" ? "Benachrichtigungen" : "Notifications"}
            >
              <header className="utility-view-header">
                <h2>{language === "de" ? "Benachrichtigungen" : "Notifications"}</h2>
              </header>

              <div className="notifications-layout">
                <article className="notifications-block">
                  <h3>{language === "de" ? "Termin-Einladungen" : "Appointment invites"}</h3>
                  <ul className="notifications-list">
                    {inviteNotifications.map((invite) => (
                      <li key={invite.id} className="notifications-item">
                        <div className="notifications-item-content">
                          <strong>{invite.title}</strong>
                          <p>
                            {invite.dayLabel} · {invite.timeLabel}
                            {invite.endTimeLabel !== undefined ? `-${invite.endTimeLabel}` : ""}
                            {invite.invitedBy !== undefined ? ` · ${language === "de" ? "von" : "by"} ${invite.invitedBy}` : ""}
                          </p>
                          {invite.status === "pending" ? (
                            <div className="notifications-rsvp-actions">
                              <button
                                type="button"
                                className="notifications-rsvp-btn notifications-rsvp-btn--accept"
                                onClick={() => handleDeskRsvpDecision(invite.id, "accepted")}
                              >
                                {language === "de" ? "Annehmen" : "Accept"}
                              </button>
                              <button
                                type="button"
                                className="notifications-rsvp-btn notifications-rsvp-btn--decline"
                                onClick={() => handleDeskRsvpDecision(invite.id, "declined")}
                              >
                                {language === "de" ? "Ablehnen" : "Decline"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <span className={`notifications-status notifications-status--${invite.status}`}>
                          {invite.status === "pending"
                            ? (language === "de" ? "Offen" : "Pending")
                            : invite.status === "accepted"
                              ? (language === "de" ? "Zugesagt" : "Accepted")
                              : (language === "de" ? "Abgesagt" : "Declined")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="notifications-block">
                  <h3>{language === "de" ? "Live Feed" : "Live feed"}</h3>
                  {notificationFeed.length === 0 ? (
                    <p className="notifications-empty">
                      {language === "de"
                        ? "Sobald du unter Desk auf Einladungen reagierst, erscheinen Events hier live."
                        : "As soon as you respond to invites in Desk, events appear here live."}
                    </p>
                  ) : (
                    <ul className="notifications-list">
                      {notificationFeed.map((entry) => (
                        <li key={entry.id} className="notifications-item notifications-item--feed">
                          <div>
                            <strong>{entry.title}</strong>
                            <p>{entry.detail}</p>
                          </div>
                          <time>{entry.timestamp}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {activeView === "settings" ? (
            <ProfilePanel
              language={language}
              localLlmConfig={localLlmConfig}
              onOpenLocalLlmSetup={handleOpenLocalLlmSetup}
            />
          ) : null}

          {activeView === "companies" ? (
            <CompanyWorkspacePanel
              language={language}
              onOpenProfile={handleOpenProfile}
              isSidebarOpen={isSidebarOpen}
              onOpenSidebar={() => setIsSidebarOpen(true)}
            />
          ) : null}

          {activeView === "guide" ? <FeatureGuidePanel language={language} /> : null}

          {viewPanelText !== null ? (
            <section className="utility-view-panel" aria-label={viewPanelText.title}>
              <header className="utility-view-header">
                <h2>{viewPanelText.title}</h2>
                <button
                  type="button"
                  className="profile-chip profile-chip-btn profile-chip-inline"
                  aria-label="Open profile"
                  onClick={handleOpenProfile}
                >
                  <div className="profile-avatar" aria-hidden="true" title={userProfile.fullName}>
                    {userProfile.initials}
                  </div>
                </button>
              </header>
              <p>{viewPanelText.description}</p>
            </section>
          ) : null}
        </main>
      </div>
      {snackbarMessage !== null ? (
        <div className="aura-snackbar" role="status" aria-live="polite">
          {snackbarMessage}
        </div>
      ) : null}
    </div>
  );
}
