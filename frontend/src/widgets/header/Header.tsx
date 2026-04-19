import { type PointerEvent, useMemo, useRef, useState } from "react";

import type { CompanyStoryItem } from "../../features/chat/types/chat";
import { userProfile } from "../../shared/data/userProfile";

interface HeaderProps {
  greeting: string;
  randomHeaderQuestion: string;
  hasStartedChat: boolean;
  showChatBrand: boolean;
  profileRole: string;
  storiesLabel: string;
  storyNewsLabel: string;
  storyCloseLabel: string;
  companyStories: CompanyStoryItem[];
  onOpenProfile: () => void;
}

const storyGradients = [
  "linear-gradient(145deg, #a785ff 0%, #7e48ff 100%)",
  "linear-gradient(145deg, #b192ff 0%, #8352ff 100%)",
  "linear-gradient(145deg, #ba9eff 0%, #8a5dff 100%)",
  "linear-gradient(145deg, #9d79ff 0%, #7340ff 100%)",
  "linear-gradient(145deg, #c3a9ff 0%, #8861ff 100%)",
];

const resolveStoryGradient = (storyId: string): string => {
  let seed = 0;
  for (let index = 0; index < storyId.length; index += 1) {
    seed += storyId.charCodeAt(index);
  }

  return storyGradients[seed % storyGradients.length] ?? storyGradients[0];
};

export function Header({
  greeting,
  randomHeaderQuestion,
  hasStartedChat,
  showChatBrand,
  profileRole,
  storiesLabel,
  storyNewsLabel,
  storyCloseLabel,
  companyStories,
  onOpenProfile,
}: HeaderProps) {
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isStoryStripDragging, setIsStoryStripDragging] = useState<boolean>(false);
  const storyStripRef = useRef<HTMLDivElement | null>(null);
  const storyDragStateRef = useRef<{
    pointerId: number | null;
    startClientX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({
    pointerId: null,
    startClientX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const activeStory = useMemo(() => {
    if (activeStoryId === null) {
      return null;
    }

    return companyStories.find((story) => story.id === activeStoryId) ?? null;
  }, [activeStoryId, companyStories]);

  const finishStoryStripDrag = (event?: PointerEvent<HTMLDivElement>): void => {
    const storyStrip = storyStripRef.current;

    if (
      storyStrip !== null &&
      event !== undefined &&
      storyDragStateRef.current.pointerId !== null &&
      storyStrip.hasPointerCapture(event.pointerId)
    ) {
      storyStrip.releasePointerCapture(event.pointerId);
    }

    setIsStoryStripDragging(false);
    storyDragStateRef.current.pointerId = null;
    globalThis.setTimeout(() => {
      storyDragStateRef.current.moved = false;
    }, 40);
  };

  const handleStoryStripPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest(".home-story-btn") !== null
    ) {
      return;
    }

    const storyStrip = storyStripRef.current;
    if (storyStrip === null) {
      return;
    }

    storyDragStateRef.current.pointerId = event.pointerId;
    storyDragStateRef.current.startClientX = event.clientX;
    storyDragStateRef.current.startScrollLeft = storyStrip.scrollLeft;
    storyDragStateRef.current.moved = false;
    setIsStoryStripDragging(true);
    storyStrip.setPointerCapture(event.pointerId);
  };

  const handleStoryStripPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isStoryStripDragging) {
      return;
    }

    const storyStrip = storyStripRef.current;
    if (storyStrip === null) {
      return;
    }

    const offset = event.clientX - storyDragStateRef.current.startClientX;
    if (Math.abs(offset) > 6) {
      storyDragStateRef.current.moved = true;
    }

    storyStrip.scrollLeft = storyDragStateRef.current.startScrollLeft - offset;
  };

  const handleStoryOpen = (storyId: string): void => {
    if (storyDragStateRef.current.moved) {
      return;
    }

    setActiveStoryId(storyId);
  };

  return (
    <>
      <header className={`top-bar ${hasStartedChat ? "chat-active" : ""}`}>
        <div className="greeting-block">
          <div>
            <h2 className="greeting-heading">
              {hasStartedChat && showChatBrand && (
                <span className="brand-logo-combined">
                  AURA
                </span>
              )}
              {!hasStartedChat && `${greeting}, ${userProfile.firstName}`}
            </h2>
            {!hasStartedChat && (
              <p className="header-question">{randomHeaderQuestion}</p>
            )}
          </div>

          {!hasStartedChat ? (
            <div
              ref={storyStripRef}
              className={`home-story-strip${isStoryStripDragging ? " is-dragging" : ""}`}
              aria-label={storiesLabel}
              onPointerDown={handleStoryStripPointerDown}
              onPointerMove={handleStoryStripPointerMove}
              onPointerUp={(event) => finishStoryStripDrag(event)}
              onPointerCancel={(event) => finishStoryStripDrag(event)}
              onPointerLeave={(event) => finishStoryStripDrag(event)}
            >
              {companyStories.map((story) => {
                const isActive = story.id === activeStoryId;

                return (
                  <button
                    key={story.id}
                    type="button"
                    className={`home-story-btn${isActive ? " is-active" : ""}`}
                    title={story.company}
                    aria-label={story.company}
                    onClick={() => handleStoryOpen(story.id)}
                  >
                    <span
                      className="home-story-avatar"
                      style={{ background: resolveStoryGradient(story.id) }}
                      aria-hidden="true"
                    >
                      {story.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={`profile-chip profile-chip-btn ${hasStartedChat ? "is-compact" : ""}`}
          aria-label="Open profile"
          onClick={onOpenProfile}
        >
          <div>
            <div
              className="profile-avatar"
              aria-hidden="true"
              title={userProfile.fullName}
            >
              {userProfile.initials}
            </div>
          </div>
          {!hasStartedChat && (
            <div>
              <p className="profile-name">{userProfile.fullName}</p>
              <p className="profile-role">{profileRole}</p>
            </div>
          )}
        </button>
      </header>

      {!hasStartedChat && activeStory !== null ? (
        <div
          className="story-news-overlay"
          role="presentation"
          onClick={() => setActiveStoryId(null)}
        >
          <section
            className="story-news-modal"
            aria-label={`${activeStory.company} ${storyNewsLabel}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="story-news-header">
              <div className="story-news-title-wrap">
                <span
                  className="home-story-avatar"
                  style={{ background: resolveStoryGradient(activeStory.id) }}
                  aria-hidden="true"
                >
                  {activeStory.shortLabel}
                </span>
                <div>
                  <h3>{activeStory.company}</h3>
                  <p>{storyNewsLabel}</p>
                </div>
              </div>

              <button
                type="button"
                className="story-news-close-btn"
                onClick={() => setActiveStoryId(null)}
              >
                {storyCloseLabel}
              </button>
            </header>

            <ul className="story-news-feed">
              {activeStory.updates.map((update, index) => (
                <li key={`${activeStory.id}-${index}`} className="story-news-item">
                  <span>{activeStory.company}</span>
                  <p>{update}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </>
  );
}
