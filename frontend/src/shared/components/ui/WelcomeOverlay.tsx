import { useEffect, useMemo, useState } from "react";

interface WelcomeOverlayProps {
  userName: string;
  isLeaving: boolean;
  onSkip: () => void;
  titlePrefix: string;
  kicker: string;
  subtitle: string;
  subline: string;
  skipLabel: string;
}

export function WelcomeOverlay({
  userName,
  isLeaving,
  onSkip,
  titlePrefix,
  kicker,
  subtitle,
  subline,
  skipLabel,
}: WelcomeOverlayProps) {
  const [typedGreeting, setTypedGreeting] = useState<string>("");

  const normalizedPrefix = useMemo(() => {
    return titlePrefix.trim();
  }, [titlePrefix]);

  const fullGreeting = useMemo(() => {
    if (normalizedPrefix.length === 0) {
      return userName;
    }

    return `${normalizedPrefix} ${userName}`;
  }, [normalizedPrefix, userName]);

  useEffect(() => {
    setTypedGreeting("");

    let charIndex = 0;

    const intervalId = globalThis.setInterval(() => {
      charIndex += 1;
      setTypedGreeting(fullGreeting.slice(0, charIndex));

      if (charIndex >= fullGreeting.length) {
        globalThis.clearInterval(intervalId);
      }
    }, 132);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [fullGreeting]);

  const hasSubtitle = subtitle.trim().length > 0;
  const hasSubline = subline.trim().length > 0;

  return (
    <div className={`welcome-overlay${isLeaving ? " is-leaving" : ""}`}>
      <button type="button" className="welcome-skip-btn" onClick={onSkip}>
        {skipLabel}
      </button>

      <div className="welcome-core">
        <p className="welcome-kicker">{kicker}</p>
        <h1 className="welcome-stream-title">
          <span className="welcome-stream-shell">
            <span className="welcome-stream-prefix">{typedGreeting}</span>
            <span className="welcome-type-caret" aria-hidden="true" />
          </span>
        </h1>
        {hasSubtitle ? <p className="welcome-subtitle">{subtitle}</p> : null}
        {hasSubline ? <p className="welcome-subline">{subline}</p> : null}
      </div>
    </div>
  );
}
