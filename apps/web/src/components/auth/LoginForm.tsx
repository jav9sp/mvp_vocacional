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
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(17,24,39,0.15)]"
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(17,24,39,0.15)]"
        />
      </label>

      <button disabled={loading} type="submit" className="btn btn-primary">
        {loading ? "Entrando..." : "Entrar"}
      </button>

      {error && <p className="text-danger">{error}</p>}
    </form>
  );
}
