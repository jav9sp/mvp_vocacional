import { useEffect, useState } from "react";
import { clearAuth, getUser } from "../../lib/auth";
import { requireAuth } from "../../lib/guards";

export default function StudentTopbar() {
  const [name, setName] = useState("");

  useEffect(() => {
    const ok = requireAuth("student");
    if (!ok) return;
    const u = getUser();
    setName(u?.name ?? "");
  }, []);

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-border bg-white/60 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="text-sm text-muted">
          {name ? (
            <>
              Hola, <span className="font-semibold text-fg">{name}</span>
            </>
          ) : (
            "Estudiante"
          )}
        </div>
        <button className="btn btn-secondary" onClick={logout} type="button">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
