/**
 * Handles both the login form and the signup form. Each page only has
 * one of these two forms in its HTML, so each listener attaches only
 * if its form actually exists on the current page.
 */

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

function showError(message) {
  const errorBanner = document.getElementById("error-banner");
  errorBanner.textContent = message;
  errorBanner.style.display = "block";
}

function clearError() {
  const errorBanner = document.getElementById("error-banner");
  errorBanner.style.display = "none";
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // /login expects form-encoded data (OAuth2PasswordRequestForm), not JSON.
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.detail || "Something went wrong. Try again.");
        return;
      }

      localStorage.setItem("nova_token", data.access_token);
      window.location.href = "dashboard.html";
    } catch (err) {
      showError("Couldn't reach the server. Check your connection.");
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.detail || "Something went wrong. Try again.");
        return;
      }

      localStorage.setItem("nova_token", data.access_token);
      window.location.href = "dashboard.html";
    } catch (err) {
      showError("Couldn't reach the server. Check your connection.");
    }
  });
}
