/**
 * Thin wrapper around fetch that attaches the JWT and handles auth
 * failures consistently across every page that calls the API.
 */
async function apiRequest(path, { method = "GET", body = null } = {}) {
  const token = localStorage.getItem("nova_token");

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 401) {
    localStorage.removeItem("nova_token");
    window.location.href = "login.html";
    return null;
  }

  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    const message = (data && data.detail) || "Something went wrong.";
    throw new Error(message);
  }

  return data;
}

function requireAuth() {
  if (!localStorage.getItem("nova_token")) {
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("nova_token");
  window.location.href = "login.html";
}
