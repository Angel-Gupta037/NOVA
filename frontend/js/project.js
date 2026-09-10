requireAuth();

const params = new URLSearchParams(window.location.search);
const projectId = params.get("id");

if (!projectId) {
  window.location.href = "dashboard.html";
}

let currentProject = null;
let currentTasks = [];

const STATUS_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

// ---------- Loading ----------

async function loadProject() {
  try {
    currentProject = await apiRequest(`/projects/${projectId}`);
    if (!currentProject) return;
    renderProjectHeader(currentProject);
    renderMembers(currentProject.members || []);
    populateAssigneeSelect(currentProject.members || []);
  } catch (err) {
    document.getElementById("project-title").textContent = "Couldn't load project";
    document.getElementById("project-description").textContent = err.message;
  }
}

async function loadTasks() {
  try {
    currentTasks = (await apiRequest(`/projects/${projectId}/tasks`)) || [];
    renderBoard(currentTasks);
    renderProgress(currentTasks);
  } catch (err) {
    console.error(err);
  }
}

// ---------- Rendering ----------

function renderProjectHeader(project) {
  document.getElementById("project-title").textContent = project.name;
  document.getElementById("project-description").textContent =
    project.description || "No description yet.";
}

function renderMembers(members) {
  const strip = document.getElementById("members-strip");
  strip.innerHTML = members
    .map(
      (m) => `
    <span class="member-chip">
      <span class="avatar">${initials(m.user.name)}</span>
      ${escapeHtml(m.user.name)}
      <span class="role-tag">${m.role}</span>
    </span>
  `
    )
    .join("");
}

function populateAssigneeSelect(members) {
  const select = document.getElementById("task-assignee");
  select.innerHTML =
    `<option value="">Unassigned</option>` +
    members
      .map((m) => `<option value="${m.user.id}">${escapeHtml(m.user.name)}</option>`)
      .join("");
}

function renderBoard(tasks) {
  STATUS_COLUMNS.forEach(({ key }) => {
    const columnTasks = tasks.filter((t) => t.status === key);
    const list = document.getElementById(`column-${key}`);
    document.getElementById(`count-${key}`).textContent = columnTasks.length;

    if (columnTasks.length === 0) {
      list.innerHTML = `<p class="column-empty">No tasks here yet.</p>`;
      return;
    }

    list.innerHTML = columnTasks
      .map(
        (t) => `
      <div class="task-card" draggable="true" data-task-id="${t.id}">
        <h4>${escapeHtml(t.title)}</h4>
        <div class="task-card-meta">
          <span>${t.due_date ? formatDate(t.due_date) : "No due date"}</span>
          ${
            t.assignee_id
              ? `<span class="task-card-assignee"><span class="avatar">${initials(
                  assigneeName(t.assignee_id)
                )}</span></span>`
              : ""
          }
        </div>
      </div>
    `
      )
      .join("");
  });

  attachDragHandlers();
  attachCardClickHandlers();
}

function renderProgress(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("progress-fill").style.width = `${pct}%`;
  document.getElementById("progress-label").textContent =
    total === 0 ? "No tasks yet" : `${done} of ${total} tasks done (${pct}%)`;
}

// ---------- Helpers ----------

function assigneeName(userId) {
  const member = (currentProject?.members || []).find((m) => m.user.id === userId);
  return member ? member.user.name : "?";
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Drag and drop status change ----------

function attachDragHandlers() {
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.taskId);
    });
  });

  STATUS_COLUMNS.forEach(({ key }) => {
    const column = document.getElementById(`column-${key}`).closest(".board-column");

    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      column.classList.remove("drag-over");
      const taskId = e.dataTransfer.getData("text/plain");

      try {
        await apiRequest(`/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          body: { status: key },
        });
        loadTasks();
      } catch (err) {
        alert(`Couldn't move task: ${err.message}`);
      }
    });
  });
}

function attachCardClickHandlers() {
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("click", () => openTaskModal(card.dataset.taskId));
  });
}

// ---------- Task modal (create + edit) ----------

const taskModal = document.getElementById("task-modal");
const taskForm = document.getElementById("task-form");
const taskModalTitle = document.getElementById("task-modal-title");
const taskModalError = document.getElementById("task-modal-error");
const deleteTaskBtn = document.getElementById("delete-task-btn");
let editingTaskId = null;

function openTaskModal(taskId = null) {
  taskModalError.style.display = "none";
  editingTaskId = taskId;

  if (taskId) {
    const task = currentTasks.find((t) => String(t.id) === String(taskId));
    taskModalTitle.textContent = "Edit task";
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-assignee").value = task.assignee_id || "";
    document.getElementById("task-status").value = task.status;
    deleteTaskBtn.style.display = "inline-flex";
  } else {
    taskModalTitle.textContent = "New task";
    taskForm.reset();
    document.getElementById("task-status").value = "todo";
    deleteTaskBtn.style.display = "none";
  }

  taskModal.classList.add("open");
}

document.getElementById("open-task-modal").addEventListener("click", () => openTaskModal());

document.getElementById("close-task-modal").addEventListener("click", () => {
  taskModal.classList.remove("open");
});

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  taskModalError.style.display = "none";

  const payload = {
    title: document.getElementById("task-title").value.trim(),
    description: document.getElementById("task-description").value.trim() || null,
    assignee_id: document.getElementById("task-assignee").value || null,
    status: document.getElementById("task-status").value,
  };
  if (payload.assignee_id) payload.assignee_id = parseInt(payload.assignee_id, 10);

  try {
    if (editingTaskId) {
      await apiRequest(`/projects/${projectId}/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: payload,
      });
    } else {
      delete payload.status; // create always starts as todo, server default
      await apiRequest(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: payload,
      });
    }
    taskModal.classList.remove("open");
    loadTasks();
  } catch (err) {
    taskModalError.textContent = err.message;
    taskModalError.style.display = "block";
  }
});

deleteTaskBtn.addEventListener("click", async () => {
  if (!editingTaskId) return;
  if (!confirm("Delete this task? This can't be undone.")) return;

  try {
    await apiRequest(`/projects/${projectId}/tasks/${editingTaskId}`, { method: "DELETE" });
    taskModal.classList.remove("open");
    loadTasks();
  } catch (err) {
    taskModalError.textContent = err.message;
    taskModalError.style.display = "block";
  }
});

// ---------- Add member modal ----------

const memberModal = document.getElementById("member-modal");
const memberForm = document.getElementById("member-form");
const memberModalError = document.getElementById("member-modal-error");

document.getElementById("open-member-modal").addEventListener("click", () => {
  memberModalError.style.display = "none";
  memberForm.reset();
  memberModal.classList.add("open");
});

document.getElementById("close-member-modal").addEventListener("click", () => {
  memberModal.classList.remove("open");
});

memberForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  memberModalError.style.display = "none";

  const email = document.getElementById("member-email").value.trim();

  try {
    await apiRequest(`/projects/${projectId}/members`, {
      method: "POST",
      body: { email, role: "member" },
    });
    memberModal.classList.remove("open");
    loadProject();
  } catch (err) {
    memberModalError.textContent = err.message;
    memberModalError.style.display = "block";
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

// ---------- Init ----------

(async () => {
  await loadProject();
  await loadTasks();
})();
