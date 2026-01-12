import { useEffect, useMemo, useState } from "react";
import { clearAuth, getUser } from "../../lib/auth";
import { api } from "../../lib/api";

type NavItem = { href: string; label: string };

const BASE_ITEMS: NavItem[] = [{ href: "/student", label: "Inicio" }];

export default function StudentNavbar() {
  const [userName, setUserName] = useState<string>("");
  const [testStatus, setTestStatus] = useState<
    "loading" | "not_finished" | "finished"
  >("loading");
  const [loading, setLoading] = useState(true);

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    const user = getUser();
    if (user?.name) setUserName(user.name);

    api<{ status: string }>("/me")
      .then((res) => {
        setTestStatus(res.status === "finished" ? "finished" : "not_finished");
      })
      .catch(() => {
        setTestStatus("not_finished");
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  const items: NavItem[] = useMemo(() => {
    const list: NavItem[] = [...BASE_ITEMS];
    if (testStatus === "finished")
      list.push({ href: "/student/result", label: "Resultados" });
    else list.push({ href: "/student/test", label: "Test" });
    return list;
  }, [testStatus]);

  return (
    <nav className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Left */}
        <div className="flex items-center gap-4">
          <a href="/student" className="font-extrabold tracking-tight text-lg">
            Vocacional
          </a>

          <div
            className={`flex items-center gap-2 ${
              loading ? "opacity-60" : "opacity-100"
            }`}>
            {items.map((it) => {
              const active = path === it.href || path.startsWith(it.href + "/");
              return (
                <a
                  key={it.href}
                  href={it.href}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-sm transition",
                    "border-border",
                    active
                      ? "bg-primary text-white"
                      : "bg-white hover:bg-surface",
                  ].join(" ")}>
                  {it.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden sm:inline text-sm text-muted">
              {userName}
            </span>
          )}
          <button onClick={logout} type="button" className="btn btn-secondary">
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
