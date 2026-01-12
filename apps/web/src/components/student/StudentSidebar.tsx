import { clearAuth, getUser } from "../../lib/auth";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/student/tests", label: "Mis tests" },
  { href: "/student/result", label: "Resultados" }, // si aplica (puedes condicionar)
];

export default function StudentSidebar() {
  const user = typeof window !== "undefined" ? getUser() : null;

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white font-black">
          V
        </div>
        <div>
          <div className="font-extrabold leading-tight">Vocacional</div>
          <div className="text-xs text-muted">Estudiante</div>
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        {NAV.map((it) => {
          const active = path === it.href;
          return (
            <a
              key={it.href}
              href={it.href}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-semibold",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-border bg-white hover:bg-slate-50",
              ].join(" ")}>
              {it.label}
            </a>
          );
        })}
      </div>

      <div className="mt-auto pt-6">
        {user?.name && (
          <div className="mb-2 text-xs text-muted">
            Sesión:{" "}
            <span className="font-semibold text-slate-900">{user.name}</span>
          </div>
        )}
        <button
          className="btn btn-secondary w-full"
          onClick={logout}
          type="button">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
