import { useEffect, useState } from "react";
import { clearAuth, getUser } from "../../lib/auth";
import { api } from "../../lib/api";

type NavItem = { href: string; label: string };

const BASE_ITEMS: NavItem[] = [{ href: "/student", label: "Inicio" }];

export default function StudentNavbar() {
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<
    "loading" | "not_finished" | "finished"
  >("loading");

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    const user = getUser();
    if (user?.name) setUserName(user.name);

    // decidir si mostrar Resultado
    api<{ status: string }>("/me/result")
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

  const items: NavItem[] = (() => {
    const list: NavItem[] = [...BASE_ITEMS];

    if (testStatus === "finished") {
      list.push({ href: "/student/result", label: "Resultados" });
    } else {
      list.push({ href: "/student/test", label: "Test" });
    }

    return list;
  })();

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
            const active = path === it.href || path.startsWith(it.href + "/");
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
