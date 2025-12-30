import { useState } from "react";
import { api } from "../../lib/api";
import { setAuth } from "../../lib/auth";

type LoginResp = {
  ok: boolean;
  token: string;
  user: { id: number; role: "admin" | "student"; name: string; email: string };
};

export default function LoginForm() {
  const [email, setEmail] = useState("student1@demo.cl");
  const [password, setPassword] = useState("Student123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const resp = await api<LoginResp>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setAuth(resp.token, resp.user);

      // redirige por rol
      window.location.href = resp.user.role === "admin" ? "/admin" : "/student";
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label>
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%" }}
        />
      </label>
      <button disabled={loading} type="submit">
        {loading ? "Entrando..." : "Entrar"}
      </button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </form>
  );
}
