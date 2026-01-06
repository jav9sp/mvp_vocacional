type StateCardProps = {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
};

export default function StateCard({
  title,
  message,
  backHref,
  backLabel = "Volver",
}: StateCardProps) {
  return (
    <div className="space-y-3">
      {backHref && (
        <a href={backHref} className="text-sm text-slate-600 hover:underline">
          ← {backLabel}
        </a>
      )}

      <div className="card">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
