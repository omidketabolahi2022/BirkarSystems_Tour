let currentUser = null;
let editingTourID = null;
let openThreadID = null;

function logout() {
    sessionStorage.removeItem("token");
    currentUser = null;
    window.location.replace("/auth");
}

function sendRequest(url, data) {
    return fetch(url, data)
        .then(response => {
            if (!response.ok) {
                const err = new Error(`failed with status ${response.status}`);
                err.status = response.status;
                if (response.status === 401) {
                    logout();
                    alert("Token is invalid");
                }
                return response.json()
                    .catch(() => ({}))
                    .then(body => {
                        if (body.detail)
                            err.message = body.detail;
                        throw err;
                    }); 
            }
            return response.json();
        })
}

function _formatDate(rawDate) {
    return new Date(rawDate).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function _toDatetimeLocalValue(rawDate) {
    const d = new Date(rawDate);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


function getAllTours() {
    return sendRequest("/api/tours");
}

function displayAllTours() {
    const panel = document.getElementById("all-tours-panel");
    getAllTours()
        .then(result => {
            panel.innerHTML = "";
            result.tours.forEach(tour => {
                panel.appendChild(_createTourCard(tour));
            });
        });
}

function updateTour(tourID, updates) {
    return sendRequest(`/api/tours/${tourID}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify(updates),
    });
}

function toggleTourCancel(tour, card) {
    const newStatus = tour.status === "canceled" ? "pending" : "canceled";
    updateTour(tour.tourID, {status: newStatus})
        .then(updatedTour => {
            const freshCard = _createTourCard(updatedTour);
            card.replaceWith(freshCard);
        })
        .catch(err => alert(err.message));
}

function openEditTourModal(tour) {
    editingTourID = tour.tourID;
    document.getElementById("edit-tour-name").value = tour.tour_name;
    document.getElementById("edit-start-time").value = _toDatetimeLocalValue(tour.start_time);
    document.getElementById("edit-day-length").value = tour.day_length;
    document.getElementById("edit-capacity").value = tour.capacity;
    // document.getElementById("edit-price").value = tour.price;
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
        // price: Number(document.getElementById("edit-price").value),
    };

    updateTour(editingTourID, updates)
        .then(() => {
            closeEditTourModal();
            displayAllTours();
        })
        .catch(err => alert(err.message));
});

function createTour(newTour) {
    return sendRequest("/api/tours", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify(newTour),
    })
}


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
    createTour(newTour)
        .then(() => {
            alert("Tour created successfully.");
            displayAllTours();
            document.getElementById("create-tour-form").reset();
        })
        .catch(err => alert(err.message));
});


function getSupportThreads() {
    return sendRequest("/api/support/threads",
        {
            headers: {
                "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            },
        }
    );
}

function displaySupportThreads() {
    const list = document.getElementById("threads-list");
    getSupportThreads()
        .then(result => {
            list.innerHTML = "";
            result.threads.forEach(thread => {
                list.appendChild(_createThreadRow(thread));
            });
        });
}

function openThreadModal(thread) {
    openThreadID = thread.threadID;
    document.getElementById("thread-modal-title").textContent =
        thread.tour_name ? `${thread.creator_username} \u00B7 ${thread.tour_name}` : thread.creator_username;
    document.getElementById("thread-reply-text").value = "";

    const closeBtn = document.getElementById("thread-close-btn");
    closeBtn.disabled = thread.status === "closed";
    closeBtn.textContent = thread.status === "closed" ? "Thread closed" : "Close thread";

    sendRequest(`/api/support/threads/${thread.threadID}/messages`,
        {
            headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            }
        }
    )
        .then(result => {
            const messagesBox = document.getElementById("thread-messages");
            messagesBox.innerHTML = "";
            result.messages.forEach(msg => {
                const item = document.createElement("div");
                item.className = "thread-message";

                const meta = document.createElement("div");
                meta.className = "thread-message-meta";
                meta.textContent = `${msg.sender_username} \u00B7 ${_formatDate(msg.sent_at)}`;
                item.appendChild(meta);

                const content = document.createElement("div");
                content.className = "thread-message-content";
                content.textContent = msg.content;
                item.appendChild(content);

                messagesBox.appendChild(item);
            });
            document.getElementById("thread-modal-overlay").classList.add("is-open");
        })
        .catch(err => alert(err.message));
}

function closeThreadModal() {
    document.getElementById("thread-modal-overlay").classList.remove("is-open");
    openThreadID = null;
}

document.getElementById("thread-done-btn").addEventListener("click", closeThreadModal);

document.getElementById("thread-reply-btn").addEventListener("click", function () {
    const content = document.getElementById("thread-reply-text").value.trim();
    if (!content) return;

    sendRequest(`/api/support/threads/${openThreadID}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ content }),
    })
        .then(() => {
            closeThreadModal();
            displaySupportThreads();
        })
        .catch(err => alert(err.message));
});

document.getElementById("thread-close-btn").addEventListener("click", function () {
    sendRequest(`/api/support/threads/${openThreadID}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: "closed" }),
    })
        .then(() => {
            closeThreadModal();
            displaySupportThreads();
        })
        .catch(err => alert(err.message));
});


displayAllTours();
displaySupportThreads();


// the widget creation functions are put at the bottom

function _createThreadRow(thread) {
    const row = document.createElement("div");
    row.className = "booking-row";
    row.dataset.threadId = thread.threadID;

    const info = document.createElement("div");

    const title = document.createElement("div");
    title.className = "booking-title";
    title.textContent = thread.tour_name
        ? `${thread.creator_username} \u00B7 ${thread.tour_name}`
        : thread.creator_username;
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


function _createTourCard(tour) {
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

    if (tour.status === "passed") {
        editBtn.disabled = true;
        cancelBtn.disabled = true;
    }
    if (tour.status === "canceled") {
        editBtn.disabled = true;
    }

    footer.appendChild(actionGroup);
    info.appendChild(footer);
    card.appendChild(info);

    return card;
}
