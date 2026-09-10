requireAuth();

const grid = document.getElementById("project-grid");
const emptyState = document.getElementById("empty-state");
const modal = document.getElementById("create-modal");
const openModalBtn = document.getElementById("open-create-modal");
const closeModalBtn = document.getElementById("close-create-modal");
const createForm = document.getElementById("create-project-form");
const modalError = document.getElementById("modal-error");

async function loadUser() {
  try {
    const user = await apiRequest("/me");
    if (user) document.getElementById("user-name").textContent = user.name;
  } catch (err) {
    // Non-fatal — the greeting just won't show a name.
  }
}

async function loadProjects() {
  try {
    const projects = await apiRequest("/projects");
    renderProjects(projects || []);
  } catch (err) {
    grid.innerHTML = `<p class="load-error">Couldn't load projects: ${err.message}</p>`;
  }
}

function renderProjects(projects) {
  if (projects.length === 0) {
    grid.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  emptyState.style.display = "none";

  grid.innerHTML = projects
    .map(
      (p) => `
    <a class="project-card" href="project.html?id=${p.id}">
      <h3>${escapeHtml(p.name)}</h3>
      <p>${p.description ? escapeHtml(p.description) : "No description yet."}</p>
      <div class="project-card-footer">
        <span>View board</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  `
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

openModalBtn.addEventListener("click", () => {
  modal.classList.add("open");
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.remove("open");
  modalError.style.display = "none";
  createForm.reset();
});

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  modalError.style.display = "none";

  const name = document.getElementById("project-name").value.trim();
  const description = document.getElementById("project-description").value.trim();

  try {
    await apiRequest("/projects", {
      method: "POST",
      body: { name, description: description || null },
    });
    modal.classList.remove("open");
    createForm.reset();
    loadProjects();
  } catch (err) {
    modalError.textContent = err.message;
    modalError.style.display = "block";
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

loadUser();
loadProjects();
