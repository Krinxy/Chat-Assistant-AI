import { type FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "assistant" | "user";

interface ChatMessage {
	id: number;
	role: ChatRole;
	text: string;
	time: string;
}

interface ServiceItem {
	id: string;
	title: string;
	description: string;
	accent: string;
	preview: string;
	highlights: [string, string];
}

interface NewsItem {
	id: string;
	title: string;
	source: string;
}

interface AttachmentAction {
	id: string;
	label: string;
}

interface ModelOption {
	id: string;
	label: string;
}

interface RecentChat {
	id: string;
	title: string;
	lastUpdate: string;
}

const navigationItems: string[] = ["Home", "Chat", "Recommendations", "Notifications", "Profile"];

const headerQuestions: string[] = [
	"Wie war dein Tag?",
	"Was magst du heute fragen?",
	"Womit kann ich dir heute helfen?",
	"Was wollen wir als naechstes bauen?",
];

const attachmentActions: AttachmentAction[] = [
	{ id: "files", label: "Dateien anhaengen" },
	{ id: "events", label: "Event hinzufuegen" },
	{ id: "cloud", label: "Aus Cloud hochladen" },
];

const modelOptions: ModelOption[] = [
	{ id: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
	{ id: "gpt-5.3", label: "GPT-5.3" },
	{ id: "gpt-4.2", label: "GPT-4.2" },
	{ id: "local-balanced", label: "Local Balanced" },
];

const recentChats: RecentChat[] = [
	{ id: "chat-001", title: "Weather + Recommendations", lastUpdate: "09:44" },
	{ id: "chat-002", title: "Pipeline Fixes", lastUpdate: "09:11" },
	{ id: "chat-003", title: "Dashboard Layout", lastUpdate: "08:57" },
	{ id: "chat-004", title: "Service Health Check", lastUpdate: "08:38" },
	{ id: "chat-005", title: "Frontend Styling", lastUpdate: "08:04" },
	{ id: "chat-006", title: "Auth Notes", lastUpdate: "Yesterday" },
	{ id: "chat-007", title: "Model Settings", lastUpdate: "Yesterday" },
	{ id: "chat-008", title: "Context Memory", lastUpdate: "Yesterday" },
	{ id: "chat-009", title: "Release Prep", lastUpdate: "2 days" },
	{ id: "chat-010", title: "Feature Ideas", lastUpdate: "2 days" },
	{ id: "chat-011", title: "Security Scan", lastUpdate: "3 days" },
	{ id: "chat-012", title: "User Profile", lastUpdate: "3 days" },
];

const serviceItems: ServiceItem[] = [
	{
		id: "llm-core",
		title: "LLM Core",
		description: "Routing prompts to model providers",
		accent: "#636059",
		preview: "Prompt routing",
		highlights: ["Multi-model switch", "Token usage guard"],
	},
	{
		id: "memory-graph",
		title: "Memory Graph",
		description: "Context stitching from previous threads",
		accent: "#7b8488",
		preview: "Memory timeline",
		highlights: ["Session recall", "Cross-thread links"],
	},
	{
		id: "weather-agent",
		title: "Weather Agent",
		description: "Collecting local forecast signals",
		accent: "#8f989c",
		preview: "Live forecast",
		highlights: ["Now and next 24h", "Feels-like deltas"],
	},
	{
		id: "news-agent",
		title: "News Agent",
		description: "Ranking relevant headlines",
		accent: "#9ea8ad",
		preview: "Headline ranker",
		highlights: ["Source confidence", "Topic clustering"],
	},
	{
		id: "notifier",
		title: "Notification Bus",
		description: "Dispatching realtime updates",
		accent: "#566168",
		preview: "Realtime dispatch",
		highlights: ["Priority channels", "Delivery tracking"],
	},
	{
		id: "quality-gate",
		title: "Quality Gate",
		description: "Pipeline checks for every response",
		accent: "#b6c0c4",
		preview: "Policy checks",
		highlights: ["Lint + test gates", "Risk scoring"],
	},
];

const recommendedNews: NewsItem[] = [
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
];

const weatherStats: Array<{ label: string; value: string }> = [
	{ label: "Temperature", value: "19C" },
	{ label: "Feels like", value: "17C" },
	{ label: "Humidity", value: "63%" },
	{ label: "Wind", value: "14 km/h" },
];

const initialMessages: ChatMessage[] = [
	{
		id: 1,
		role: "assistant",
		text: "Willkommen zurueck. Frag mich nach Wetter, News oder Service-Status.",
		time: "09:41",
	},
	{
		id: 2,
		role: "user",
		text: "Zeig mir den aktuellen Service-Zustand und News-Highlights.",
		time: "09:42",
	},
	{
		id: 3,
		role: "assistant",
		text: "Alle Services sind online. News- und Wetterbereich wurden aktualisiert.",
		time: "09:42",
	},
];

const timeFormatter = new Intl.DateTimeFormat("de-DE", {
	hour: "2-digit",
	minute: "2-digit",
});

const composeAssistantReply = (prompt: string, modelLabel: string): string =>
	`Verstanden: "${prompt}". Ich antworte mit Modell ${modelLabel} und reiche Kontext aus News/Wetter nach.`;

const getGreetingFromUnixTime = (unixTime: number): string => {
	const hour = new Date(unixTime * 1000).getHours();

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
};

export default function App() {
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
	const [showAllChats, setShowAllChats] = useState<boolean>(false);
	const [draft, setDraft] = useState<string>("");
	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const [isAttachMenuOpen, setIsAttachMenuOpen] = useState<boolean>(false);
	const [selectedModelId, setSelectedModelId] = useState<string>(modelOptions[0].id);
	const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
	const [unixTime, setUnixTime] = useState<number>(Math.floor(Date.now() / 1000));
	const [isDraggingServices, setIsDraggingServices] = useState<boolean>(false);

	const serviceScrollerRef = useRef<HTMLDivElement | null>(null);
	const dragStateRef = useRef<{ active: boolean; startY: number; startScrollTop: number }>({
		active: false,
		startY: 0,
		startScrollTop: 0,
	});

	useEffect(() => {
		const timerId = globalThis.setInterval(() => {
			setUnixTime(Math.floor(Date.now() / 1000));
		}, 60000);

		return () => {
			globalThis.clearInterval(timerId);
		};
	}, []);

	const selectedModel = useMemo<ModelOption>(() => {
		return modelOptions.find((model) => model.id === selectedModelId) ?? modelOptions[0];
	}, [selectedModelId]);

	const greeting = useMemo<string>(() => getGreetingFromUnixTime(unixTime), [unixTime]);

	const randomHeaderQuestion = useMemo<string>(() => {
		const index = Math.floor(Math.random() * headerQuestions.length);
		return headerQuestions[index];
	}, []);

	const visibleRecentChats = useMemo<RecentChat[]>(() => {
		if (showAllChats) {
			return recentChats;
		}

		return recentChats.slice(0, 8);
	}, [showAllChats]);

	const handleSendMessage = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();

		const trimmed = draft.trim();
		if (trimmed.length === 0) {
			return;
		}

		const currentTime = timeFormatter.format(new Date());
		const userMessage: ChatMessage = {
			id: Date.now(),
			role: "user",
			text: trimmed,
			time: currentTime,
		};

		const assistantMessage: ChatMessage = {
			id: Date.now() + 1,
			role: "assistant",
			text: composeAssistantReply(trimmed, selectedModel.label),
			time: currentTime,
		};

		setMessages((previous) => [...previous, userMessage, assistantMessage]);
		setDraft("");
		setIsAttachMenuOpen(false);
	};

	const handleAttachmentAction = (actionId: string): void => {
		const action = attachmentActions.find((item) => item.id === actionId);

		if (action === undefined) {
			setIsAttachMenuOpen(false);
			return;
		}

		setMessages((previous) => [
			...previous,
			{
				id: Date.now(),
				role: "assistant",
				text: `Aktion gestartet: ${action.label}.`,
				time: timeFormatter.format(new Date()),
			},
		]);

		setIsAttachMenuOpen(false);
	};

	const handleModelSelect = (modelId: string): void => {
		setSelectedModelId(modelId);
		setIsModelMenuOpen(false);
	};

	const handleServicePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
		const element = serviceScrollerRef.current;

		if (element === null) {
			return;
		}

		dragStateRef.current.active = true;
		dragStateRef.current.startY = event.clientY;
		dragStateRef.current.startScrollTop = element.scrollTop;
		setIsDraggingServices(true);
		element.setPointerCapture(event.pointerId);
	};

	const handleServicePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
		const element = serviceScrollerRef.current;
		const dragState = dragStateRef.current;

		if (element === null || !dragState.active) {
			return;
		}

		const dragDistance = event.clientY - dragState.startY;
		element.scrollTop = dragState.startScrollTop - dragDistance;
	};

	const handleServicePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
		const element = serviceScrollerRef.current;
		dragStateRef.current.active = false;
		setIsDraggingServices(false);

		if (element?.hasPointerCapture(event.pointerId) === true) {
			element.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div className="dashboard-root">
			<div className={`dashboard-shell${isSidebarOpen ? "" : " is-collapsed"}`}>
				<aside className="left-sidebar" aria-label="Sidebar controls">
					<div className="sidebar-top-row">
						<div className="brand-block">
							<span className="brand-orb" aria-hidden="true" />
							<div className="brand-copy">
								<p className="eyebrow">Control Deck</p>
								<h1>Chat Assistant</h1>
							</div>
						</div>

						<button
							type="button"
							className="sidebar-toggle"
							onClick={() => setIsSidebarOpen((previous) => !previous)}
							aria-label={isSidebarOpen ? "Sidebar einklappen" : "Sidebar ausklappen"}
						>
							{isSidebarOpen ? "<<" : ">>"}
						</button>
					</div>

					<ul className="nav-list" aria-label="Main navigation">
						{navigationItems.map((item, index) => (
							<li className={index === 0 ? "is-active" : ""} key={item}>
								{isSidebarOpen ? item : item.slice(0, 1)}
							</li>
						))}
					</ul>

					{isSidebarOpen ? (
						<>
							<section className="sidebar-card" aria-label="Letzte Chats">
								<p className="sidebar-section-title">Letzte Chats</p>
								<ul className="history-list">
									{visibleRecentChats.map((chat) => (
										<li key={chat.id}>
											<button type="button" className="history-item">
												<span>{chat.title}</span>
												<small>{chat.lastUpdate}</small>
											</button>
										</li>
									))}
								</ul>

								{recentChats.length > 8 ? (
									<button
										type="button"
										className="more-chats-btn"
										onClick={() => setShowAllChats((previous) => !previous)}
									>
										{showAllChats ? "Weniger anzeigen" : "Mehr anzeigen"}
									</button>
								) : null}
							</section>

							<section className="sidebar-card" aria-label="Services">
								<p className="sidebar-section-title">Services</p>
								<ul className="service-list">
									{serviceItems.map((service) => (
										<li key={service.id}>{service.title}</li>
									))}
								</ul>
							</section>
						</>
					) : null}
				</aside>

				<main className="main-stage">
					<header className="top-bar">
						<div className="greeting-block">
							<h2>{`${greeting}, Dominic`}</h2>
							<p className="header-question">{randomHeaderQuestion}</p>
						</div>

						<div className="profile-chip" aria-label="Signed in profile">
							<div className="profile-avatar" aria-hidden="true">
								DB
							</div>
							<div>
								<p className="profile-name">Dominic Bechtold</p>
								<p className="profile-role">Softwarearchitekt</p>
							</div>
						</div>
					</header>

					<div className="content-grid">
						<section className="chat-panel" aria-label="LLM chat window">
							<div className="chat-log">
								{messages.map((message) => (
									<article className={`bubble ${message.role}`} key={message.id}>
										<p>{message.text}</p>
										<span>{message.time}</span>
									</article>
								))}
							</div>

							<div className="chat-compose-wrap">
								<form className="chat-form" onSubmit={handleSendMessage}>
									<button
										type="button"
										className="attach-trigger"
										onClick={() => {
											setIsAttachMenuOpen((previous) => !previous);
											setIsModelMenuOpen(false);
										}}
										aria-expanded={isAttachMenuOpen}
										aria-controls="chat-attach-menu"
									>
										+
									</button>

									<input
										type="text"
										value={draft}
										onChange={(event) => setDraft(event.target.value)}
										placeholder="Type in message..."
										aria-label="Type in message"
									/>
									<button type="submit">Send</button>
								</form>

								{isAttachMenuOpen ? (
									<ul className="attach-menu" id="chat-attach-menu">
										{attachmentActions.map((action) => (
											<li key={action.id}>
												<button type="button" onClick={() => handleAttachmentAction(action.id)}>
													{action.label}
												</button>
											</li>
										))}
									</ul>
								) : null}
							</div>

							<div className="chat-model-bar" aria-label="Model settings">
								<span>Model</span>
								<div className="model-picker">
									<button
										type="button"
										className="model-picker-btn"
										onClick={() => {
											setIsModelMenuOpen((previous) => !previous);
											setIsAttachMenuOpen(false);
										}}
										aria-expanded={isModelMenuOpen}
									>
										{selectedModel.label}
										<span>{isModelMenuOpen ? "▴" : "▾"}</span>
									</button>

									{isModelMenuOpen ? (
										<ul className="model-picker-menu">
											{modelOptions.map((model) => (
												<li key={model.id}>
													<button type="button" onClick={() => handleModelSelect(model.id)}>
														{model.label}
													</button>
												</li>
											))}
										</ul>
									) : null}
								</div>
							</div>
						</section>

						<aside className="right-column" aria-label="Recommendation and weather area">
							<article className="news-card">
								<h3>Recommended News</h3>
								<ul className="news-grid">
									{recommendedNews.map((headline) => (
										<li className="news-item" key={headline.id}>
											<div className="news-thumb" aria-hidden="true">
												IMG
											</div>
											<div>
												<h4>{headline.title}</h4>
												<p>{headline.source}</p>
											</div>
										</li>
									))}
								</ul>
							</article>

							<article className="weather-card">
								<h3>Weather Snapshot</h3>
								<div className="weather-hero">
									<div className="weather-orb" aria-hidden="true" />
									<div>
										<p className="weather-kicker">Current weather</p>
										<span className="weather-temp">19C</span>
										<span className="weather-label">Partly Cloudy</span>
									</div>
								</div>

								<div className="weather-asset-placeholder">Asset placeholder</div>

								<dl>
									{weatherStats.map((item) => (
										<div key={item.label}>
											<dt>{item.label}</dt>
											<dd>{item.value}</dd>
										</div>
									))}
								</dl>
							</article>
						</aside>
					</div>

					<section className="service-strip" aria-label="Service library">
						<div className="strip-head">
							<h3>Services</h3>
						</div>

						<div
							className={`service-stack-scroll${isDraggingServices ? " is-dragging" : ""}`}
							ref={serviceScrollerRef}
							onPointerDown={handleServicePointerDown}
							onPointerMove={handleServicePointerMove}
							onPointerUp={handleServicePointerUp}
							onPointerCancel={handleServicePointerUp}
							onPointerLeave={handleServicePointerUp}
						>
							{serviceItems.map((service) => (
								<article className="service-card" key={service.id}>
									<div className="service-preview" style={{ borderColor: service.accent }}>
										{service.preview}
									</div>

									<div className="service-content">
										<h4>{service.title}</h4>
										<p>{service.description}</p>
										<ul>
											{service.highlights.map((highlight) => (
												<li key={`${service.id}-${highlight}`}>{highlight}</li>
											))}
										</ul>
									</div>
								</article>
							))}
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}
