import { getToken, getUser } from "./auth";

export function requireAuth(allowedRole?: "admin" | "student") {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = "/login";
    return null;
  }
  if (allowedRole && user.role !== allowedRole) {
    window.location.href = user.role === "admin" ? "/admin" : "/student";
    return null;
  }
  return { token, user };
}
