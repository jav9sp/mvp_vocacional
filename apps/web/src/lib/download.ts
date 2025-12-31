export async function downloadFile(url: string, filename: string) {
  const token = localStorage.getItem("auth_token") || "";
  console.log("[download] url:", url);
  console.log("[download] filename:", filename);
  console.log("[download] token present:", Boolean(token));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("[download] status:", res.status);
  console.log("[download] content-type:", res.headers.get("content-type"));

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[download] error body:", text);
    throw new Error(`Descarga falló (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  console.log("[download] blob size:", blob.size);

  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
