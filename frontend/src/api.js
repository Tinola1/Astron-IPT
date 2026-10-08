// Thin fetch wrapper; Vite proxies /api to the backend in development.
export async function api(path) {
  const res = await fetch('/api' + path);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
