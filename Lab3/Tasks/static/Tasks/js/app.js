const API_URL = "/api/tasks/";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const taskList = document.getElementById("task-list");
const message = document.getElementById("message");
const totalCount = document.getElementById("total-count");
const completedCount = document.getElementById("completed-count");
const emptyState = document.getElementById("empty-state");
const filterButtons = document.querySelectorAll("[data-filter]");

let tasks = [];
let currentFilter = "all";


function showMessage(text) {
    message.textContent = text;
}


function clearMessage() {
    message.textContent = "";
}


function getCookie(name) {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const value = cookie.trim();

        if (value.startsWith(name + "=")) {
            return decodeURIComponent(
                value.substring(name.length + 1)
            );
        }
    }
    return null;
}


async function apiRequest(url, options = {}) {
    const headers = {...(options.headers || {})
    };

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    if (options.method && options.method !== "GET") {
        const csrfToken = getCookie("csrftoken");

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        }
    }

    const response = await fetch(url, {...options, headers});
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
        throw new Error(
            data?.error || `Błąd HTTP: ${response.status}`
        );
    }
    return data;
}

async function loadTasks() {
    try {
        tasks = await apiRequest(API_URL);
        renderTasks();
    } catch (error) {
        showMessage("Nie udało się pobrać zadań: " + error.message);
    }
}


function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = tasks.filter(task => {
        if (currentFilter === "active") {
            return !task.completed;
        }

        if (currentFilter === "completed") {
            return task.completed;
        }

        return true;
    });

    visibleTasks.forEach(task => {
        const item = document.createElement("li");

        item.className = "task-item";

        if (task.completed) {
            item.classList.add("is-completed");
        }

        const checkbox = document.createElement("button");

        checkbox.type = "button";
        checkbox.textContent = task.completed ? "✓" : "○";
        checkbox.setAttribute(
            "aria-label",
            task.completed
                ? "Oznacz jako aktywne"
                : "Oznacz jako ukończone"
        );

        checkbox.addEventListener("click", () => {
            toggleTask(task);
        });

        const title = document.createElement("span");

        title.className = "task-title";
        title.textContent = task.title;

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Usuń";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        item.append(checkbox, title, deleteButton);
        taskList.appendChild(item);
    });

    totalCount.textContent = tasks.length;

    completedCount.textContent = tasks.filter(
        task => task.completed
    ).length;

    emptyState.classList.toggle(
        "hidden",
        visibleTasks.length > 0
    );
}


async function addTask(event) {
    event.preventDefault();
    clearMessage();

    const title = titleInput.value.trim();

    if (!title) {
        showMessage("Wpisz treść zadania.");
        titleInput.focus();
        return;
    }

    try {
        await apiRequest(API_URL, {
            method: "POST",
            body: JSON.stringify({ title })
        });

        titleInput.value = "";
        currentFilter = "all";
        updateFilters();

        await loadTasks();

    } catch (error) {
        showMessage("Nie udało się dodać zadania: " + error.message);
    }
}


async function toggleTask(task) {
    clearMessage();

    try {
        await apiRequest(`${API_URL}${task.id}/`, {
            method: "PATCH",
            body: JSON.stringify({
                completed: !task.completed
            })
        });

        await loadTasks();

    } catch (error) {
        showMessage("Nie udało się zmienić statusu: " + error.message);
    }
}


async function deleteTask(taskId) {
    clearMessage();

    try {
        await apiRequest(`${API_URL}${taskId}/`, {
            method: "DELETE"
        });

        await loadTasks();

    } catch (error) {
        showMessage("Nie udało się usunąć zadania: " + error.message);
    }
}


function updateFilters() {
    filterButtons.forEach(button => {
        const selected = button.dataset.filter === currentFilter;

        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}


form.addEventListener("submit", addTask);

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        updateFilters();
        renderTasks();
    });
});


loadTasks();