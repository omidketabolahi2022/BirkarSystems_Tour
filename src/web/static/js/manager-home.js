// ============================================================
// SHARED REQUEST WRAPPER
// (Same as booker-home.js - if you haven't already, consider
// pulling this one function into its own common.js that both
// pages load, the same way base.css/shared.css are shared.)
// ============================================================
function sendRequest(url, options = {}) {
    const token = sessionStorage.getItem("token");
    const headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`,
    };
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(url, { ...options, headers })
        .then(response => {
            if (response.status === 401) {
                alert("Your session has expired. Please log in again.");
                logoutBooker();
                return new Promise(() => {}); // abandon this chain - a redirect is happening
            }
            if (!response.ok) {
                return response.json()
                    .catch(() => ({}))
                    .then(body => {
                        throw new Error(body.detail || `Request failed with status ${response.status}`);
                    });
            }
            return response.json();
        });
}

function logoutBooker() {
    sessionStorage.removeItem("token");
    window.location.replace("/auth");
}

function _formatDate(rawDate) {
    return new Date(rawDate).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" - this trims
// whatever ISO string the API sends down to that shape.
function _toDatetimeLocalValue(rawDate) {
    const d = new Date(rawDate);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


// ============================================================
// ALL TOURS (manage)
// ============================================================
function getAllToursForManager() {
    // Reuses the /api/tours endpoint already built for the
    // booker page, just asking for every tour instead of only
    // the bookable ones.
    return sendRequest("/api/tours");
    // return sendRequest("/api/tours?bookable_only=false");
}

function displayAllToursForManager() {
    const panel = document.getElementById("all-tours-panel");
    getAllToursForManager()
        .then(result => {
            panel.innerHTML = "";
            result.tours.forEach(tour => {
                panel.appendChild(createManagerTourCard(tour));
            });
        });
}

function createManagerTourCard(tour) {
    const card = document.createElement("div");
    card.className = "tour-card";
    card.dataset.tourId = tour.tourID;

    const banner = document.createElement("div");
    banner.className = "tour-banner";
    banner.textContent = "Banner image";
    card.appendChild(banner);

    const info = document.createElement("div");
    info.className = "tour-info";
    const details = document.createElement("div");

    const name = document.createElement("div");
    name.className = "tour-name";
    name.textContent = tour.tour_name;

    const statusBadge = document.createElement("span");
    statusBadge.className = `status-badge status-${tour.status}`;
    statusBadge.textContent = tour.status;
    name.appendChild(statusBadge);
    details.appendChild(name);

    const route = document.createElement("div");
    route.className = "tour-route";
    route.textContent = `${tour.source} \u2192 ${tour.destination}`;
    details.appendChild(route);

    const meta = document.createElement("div");
    meta.className = "tour-meta";
    meta.textContent = `${tour.day_length} days \u00B7 Departs ${_formatDate(tour.start_time)}`;
    details.appendChild(meta);

    info.appendChild(details);

    const footer = document.createElement("div");
    footer.className = "tour-info-footer";

    const price = document.createElement("span");
    price.className = "tour-price";
    price.textContent = `$${Number(tour.price).toFixed(2)}`;
    footer.appendChild(price);

    const actionGroup = document.createElement("div");
    actionGroup.className = "tour-action-group";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-outline-neutral";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditTourModal(tour));
    actionGroup.appendChild(editBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-outline-danger";
    cancelBtn.textContent = tour.status === "canceled" ? "Uncancel" : "Cancel";
    cancelBtn.addEventListener("click", () => toggleTourCancel(tour, card));
    actionGroup.appendChild(cancelBtn);

    // A tour that already happened isn't meaningfully editable
    // or cancelable anymore.
    if (tour.status === "passed") {
        editBtn.disabled = true;
        cancelBtn.disabled = true;
    }
    // A canceled tour can be un-canceled, but not edited while
    // it's canceled.
    if (tour.status === "canceled") {
        editBtn.disabled = true;
    }

    footer.appendChild(actionGroup);
    info.appendChild(footer);
    card.appendChild(info);

    return card;
}

function toggleTourCancel(tour, card) {
    const newStatus = tour.status === "canceled" ? "pending" : "canceled";

    // TODO (backend): PATCH /api/tours/{tourID} - update the
    // Tour row's status. Consider rejecting the "pending" case
    // server-side if start_time has already passed, so a stale
    // tour can't be un-canceled back into looking bookable.
    // sendRequest(`/api/tours/${tour.tourID}`, {
    //     method: "PATCH",
    //     body: JSON.stringify({ status: newStatus }),
    // })
    //     .then(updatedTour => {
    //         // Simplest correct thing: just re-render this one
    //         // card from the fresh server response, rather than
    //         // hand-patching each button/badge individually.
    //         const freshCard = createManagerTourCard(updatedTour);
    //         card.replaceWith(freshCard);
    //     })
    //     .catch(err => alert(err.message));
}

// ============================================================
// EDIT TOUR MODAL
// ============================================================
let editingTourID = null;

function openEditTourModal(tour) {
    editingTourID = tour.tourID;
    document.getElementById("edit-tour-name").value = tour.tour_name;
    document.getElementById("edit-start-time").value = _toDatetimeLocalValue(tour.start_time);
    document.getElementById("edit-day-length").value = tour.day_length;
    document.getElementById("edit-capacity").value = tour.capacity;
    document.getElementById("edit-price").value = tour.price;
    document.getElementById("edit-tour-modal-overlay").classList.add("is-open");
}

function closeEditTourModal() {
    document.getElementById("edit-tour-modal-overlay").classList.remove("is-open");
    editingTourID = null;
}

document.getElementById("edit-tour-cancel-btn").addEventListener("click", closeEditTourModal);

document.getElementById("edit-tour-submit-btn").addEventListener("click", function () {
    const updates = {
        tour_name: document.getElementById("edit-tour-name").value.trim(),
        start_time: document.getElementById("edit-start-time").value,
        day_length: Number(document.getElementById("edit-day-length").value),
        capacity: Number(document.getElementById("edit-capacity").value),
        price: Number(document.getElementById("edit-price").value),
    };

    // TODO (backend): PATCH /api/tours/{tourID} - same endpoint
    // as the cancel/uncancel toggle above, just a different body.
    // sendRequest(`/api/tours/${editingTourID}`, {
    //     method: "PATCH",
    //     body: JSON.stringify(updates),
    // })
    //     .then(() => {
    //         closeEditTourModal();
    //         displayAllToursForManager(); // simplest way to reflect the change everywhere
    //     })
    //     .catch(err => alert(err.message));
});


// ============================================================
// CREATE TOUR
// ============================================================
document.getElementById("create-tour-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const newTour = {
        tour_name: document.getElementById("create-tour-name").value.trim(),
        source: document.getElementById("create-source").value.trim(),
        destination: document.getElementById("create-destination").value.trim(),
        start_time: document.getElementById("create-start-time").value,
        day_length: Number(document.getElementById("create-day-length").value),
        capacity: Number(document.getElementById("create-capacity").value),
        price: Number(document.getElementById("create-price").value),
        description: document.getElementById("create-description").value.trim() || null,
    };

    // TODO (backend): POST /api/tours - create a new Tour row.
    // Status isn't sent from here; the backend should default
    // new tours to 'pending'.
    // sendRequest("/api/tours", {
    //     method: "POST",
    //     body: JSON.stringify(newTour),
    // })
    //     .then(() => {
    //         alert("Tour created successfully.");
    //         document.getElementById("create-tour-form").reset();
    //     })
    //     .catch(err => alert(err.message));
});


// ============================================================
// SUPPORT THREADS
// ============================================================
function getSupportThreads() {
    // TODO (backend): GET /api/support/threads - every thread
    // the manager should see (assigned to them, or unclaimed).
    // return sendRequest("/api/support/threads");
}

function displaySupportThreads() {
    const list = document.getElementById("threads-list");
    getSupportThreads()
        .then(result => {
            list.innerHTML = "";
            result.threads.forEach(thread => {
                list.appendChild(createThreadRow(thread));
            });
        });
}

function createThreadRow(thread) {
    const row = document.createElement("div");
    row.className = "booking-row"; // reusing the shared generic row look
    row.dataset.threadId = thread.threadID;

    const info = document.createElement("div");

    const title = document.createElement("div");
    title.className = "booking-title";
    title.textContent = thread.tour_name
        ? `${thread.username} \u00B7 ${thread.tour_name}`
        : thread.username;
    info.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "booking-meta";
    meta.textContent = `Opened ${_formatDate(thread.created_at)}`;
    info.appendChild(meta);

    row.appendChild(info);

    const badge = document.createElement("span");
    badge.className = `status-badge status-${thread.status}`;
    badge.textContent = thread.status;
    row.appendChild(badge);

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "btn btn-outline-neutral";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => openThreadModal(thread));
    row.appendChild(viewBtn);

    return row;
}

let openThreadID = null;

function openThreadModal(thread) {
    openThreadID = thread.threadID;
    document.getElementById("thread-modal-title").textContent =
        thread.tour_name ? `${thread.username} \u00B7 ${thread.tour_name}` : thread.username;
    document.getElementById("thread-reply-text").value = "";

    const closeBtn = document.getElementById("thread-close-btn");
    closeBtn.disabled = thread.status === "closed";
    closeBtn.textContent = thread.status === "closed" ? "Thread closed" : "Close thread";

    // TODO (backend): GET /api/support/threads/{threadID}/messages
    // sendRequest(`/api/support/threads/${thread.threadID}/messages`)
    //     .then(result => {
    //         const messagesBox = document.getElementById("thread-messages");
    //         messagesBox.innerHTML = "";
    //         result.messages.forEach(msg => {
    //             const item = document.createElement("div");
    //             item.className = "thread-message";

    //             const meta = document.createElement("div");
    //             meta.className = "thread-message-meta";
    //             meta.textContent = `${msg.sender_username} \u00B7 ${_formatDate(msg.sent_at)}`;
    //             item.appendChild(meta);

    //             const content = document.createElement("div");
    //             content.className = "thread-message-content";
    //             content.textContent = msg.content;
    //             item.appendChild(content);

    //             messagesBox.appendChild(item);
    //         });
    //         document.getElementById("thread-modal-overlay").classList.add("is-open");
    //     })
    //     .catch(err => alert(err.message));
}

function closeThreadModal() {
    document.getElementById("thread-modal-overlay").classList.remove("is-open");
    openThreadID = null;
}

document.getElementById("thread-done-btn").addEventListener("click", closeThreadModal);

document.getElementById("thread-reply-btn").addEventListener("click", function () {
    const content = document.getElementById("thread-reply-text").value.trim();
    if (!content) return;

    // TODO (backend): POST /api/support/threads/{threadID}/messages
    // sendRequest(`/api/support/threads/${openThreadID}/messages`, {
    //     method: "POST",
    //     body: JSON.stringify({ content }),
    // })
    //     .then(() => {
    //         closeThreadModal();
    //         displaySupportThreads();
    //     })
    //     .catch(err => alert(err.message));
});

document.getElementById("thread-close-btn").addEventListener("click", function () {
    // TODO (backend): PATCH /api/support/threads/{threadID}
    // sendRequest(`/api/support/threads/${openThreadID}`, {
    //     method: "PATCH",
    //     body: JSON.stringify({ status: "closed" }),
    // })
    //     .then(() => {
    //         closeThreadModal();
    //         displaySupportThreads();
    //     })
    //     .catch(err => alert(err.message));
});


// ============================================================
// INITIAL LOAD
// ============================================================
displayAllToursForManager();
displaySupportThreads();
