export function ChatSkeletonMessage() {
  return (
    <article
      className="chat-message bubble assistant skeleton-bubble"
      aria-label="Assistant response loading"
    >
      <div className="skeleton-text-block">
        <div className="skeleton-line skeleton-line-lg" />
        <div className="skeleton-line skeleton-line-md" />
        <div className="skeleton-line skeleton-line-sm" />
      </div>
      <span className="skeleton-time" />
    </article>
  );
}
