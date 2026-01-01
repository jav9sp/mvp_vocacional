import { clearAuth } from "../../lib/auth";

export default function LogoutButton() {
  function onLogout() {
    clearAuth();
    window.location.href = "/login";
  }

  return (
    <button onClick={onLogout} type="button" className="btn btn-secondary">
      Cerrar sesión
    </button>
  );
}
