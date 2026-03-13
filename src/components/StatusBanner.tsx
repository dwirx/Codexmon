type StatusBannerProps = {
  title: string;
  message: string;
  tone?: "error" | "neutral";
};

export function StatusBanner({
  title,
  message,
  tone = "error",
}: StatusBannerProps) {
  return (
    <section className={`status-banner status-banner--${tone}`}>
      <p className="status-banner__title">{title}</p>
      <p className="status-banner__message">{message}</p>
    </section>
  );
}
