import { useEffect, useState } from "react";
import { clearAuth, getUser } from "../../lib/auth";
import { api } from "../../lib/api";

type NavItem = { href: string; label: string };

const BASE_ITEMS: NavItem[] = [
  { href: "/student", label: "Inicio" },
  { href: "/student/test", label: "Test" },
];

export default function StudentNavbar() {
  const [userName, setUserName] = useState<string>("");
  const [canSeeResult, setCanSeeResult] = useState(false);
  const [loading, setLoading] = useState(true);

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    const user = getUser();
    if (user?.name) setUserName(user.name);

    // decidir si mostrar Resultado
    api<{ status: string }>("/me/result")
      .then((res) => {
        if (res.status === "finished") {
          setCanSeeResult(true);
        }
      })
      .catch(() => {
        // fail-safe: no mostramos Resultado
        setCanSeeResult(false);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearAuth();
    window.location.href = "/login";
  }

  const items: NavItem[] = canSeeResult
    ? [...BASE_ITEMS, { href: "/student/result", label: "Resultado" }]
    : BASE_ITEMS;

  return (
    <nav
      style={{
        borderBottom: "1px solid #eee",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <b>Vocacional</b>

        <div style={{ display: "flex", gap: 12 }}>
          {items.map((it) => {
            const active = path === it.href;
            return (
              <a
                key={it.href}
                href={it.href}
                style={{
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: active ? "#111" : "transparent",
                  color: active ? "#fff" : "#111",
                  opacity: loading ? 0.6 : 1,
                }}>
                {it.label}
              </a>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {userName && <span style={{ color: "#555" }}>{userName}</span>}
        <button onClick={logout} type="button">
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
