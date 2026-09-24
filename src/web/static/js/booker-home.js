let currentUser = null;
let bookingModalTourID = null;
let bookingModalTourPrice = 0;


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

function getAvailableTours() {
    return sendRequest("/api/tours/available", {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    });
}

function displayValidTours() {
    const allToursPanel = document.getElementById("all-tours-panel");

    Promise.all([getAvailableTours(), getMyBookings(["accepted"])])
        .then(([toursResult, bookingsResult]) => {
            const bookedTourIDs = new Set(
                bookingsResult.bookings.map(b => b.tourID)
            );

            allToursPanel.innerHTML = "";
            toursResult.tours.forEach(tour => {
                const card = _createTourCard(tour, bookedTourIDs.has(tour.tourID));
                allToursPanel.appendChild(card);
            });
        });
}

function getMyBookings(includes_status) {
    const urlParams = new URLSearchParams();
    if (includes_status !== null && includes_status !== undefined) {
        includes_status.forEach(stat => urlParams.append("has_status", stat));
    }
    return sendRequest(`/api/me/bookings?${urlParams}`, {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    });
}

function updateBooking(bookingID, updates) {
    return sendRequest(`/api/me/bookings/${bookingID}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            },
            body: JSON.stringify(updates)
        }
    );
}

function _formatBookingDate(rawDate) {
    const d = new Date(rawDate);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function displayBookingHistory() {
    getMyBookings()
        .then(result => {
            const bookingHistory = result.bookings;
            const historyTable = document.getElementById("historyTable");
            historyTable.innerHTML = "";
            bookingHistory.forEach(booking => {
                const row = _createHistRow(booking);
                historyTable.appendChild(row);
            })
        })
}

function displayAcceptedBookings() {
    const myToursPanel = document.getElementById("my-tours-panel");
    getMyBookings(["accepted"])
        .then(result => {
            const myAcceptedBookings = result.bookings;
            myToursPanel.innerHTML = "";
            myAcceptedBookings.forEach(booking => {
                const bookedCard = _createBookedCard(booking);
                myToursPanel.appendChild(bookedCard);
            })
        });

}

function getCurrentUser() {
    return sendRequest("/api/me", {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    });
}

function updateCurrentUser(updates) {
    return sendRequest("/api/me",
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            },
            body: JSON.stringify(updates)
        }
    );
}

function submitUserChanges() {
    const newEmail = document.getElementById("account-email").value.trim() || null;
    const newNumber = document.getElementById("account-number").value.trim();
    const updates = {};
    if (newEmail !== currentUser.email)
        updates.email = newEmail;
    if (newNumber !== currentUser.number)
        updates.number = newNumber;
    if (Object.keys(updates).length === 0) {
        alert("No changes to save");
        return;
    }
    updateCurrentUser(updates)
        .then(user => {
            currentUser = user;
            alert("Profile updated");
        })
        .catch(err => alert(err.message));
}

function displayCurrentUser() {
    getCurrentUser()
        .then(user => {
            currentUser = user;
            document.getElementById("account-username").value = user.username;
            document.getElementById("account-email").value = user.email || '';
            document.getElementById("account-number").value = user.number;
        })
}


displayValidTours();
displayCurrentUser();
displayBookingHistory();
displayAcceptedBookings();

document.getElementById("modal-num-people").addEventListener("input", updateModalTotal);
document.getElementById("modal-cancel-btn").addEventListener("click", closeBookingModal);

document.getElementById("modal-submit-btn").addEventListener("click", function () {
    const numPeople = Number(document.getElementById("modal-num-people").value);
    if (!numPeople || numPeople < 1) return;

    submitBooking(bookingModalTourID, numPeople)
        .then(booking => {
            closeBookingModal();
            displayValidTours();
            displayAcceptedBookings();
            displayBookingHistory();

        })
        .catch(err => alert(err.message));
});

document.getElementById("account-panel").addEventListener("submit", function (event) {
    event.preventDefault();
    submitUserChanges();
});


// the widget creation functions are put at the bottom

function _createTourCard(tour, alreadyBooked) {
    const card = document.createElement("div");
    card.className = "tour-card";

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
    details.appendChild(name);

    const route = document.createElement("div");
    route.className = "tour-route";
    route.textContent = `${tour.source} \u2192 ${tour.destination}`;
    details.appendChild(route);

    const meta = document.createElement("div");
    meta.className = "tour-meta";
    const departDate = new Date(tour.start_time).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });
    meta.textContent = `${tour.day_length} days \u00B7 Departs ${departDate}`;
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

    const bookBtn = document.createElement("button");
    bookBtn.type = "button";
    bookBtn.className = "btn btn-primary";
    bookBtn.textContent = "Book";
    bookBtn.addEventListener("click", () => openBookingModal(tour));
    actionGroup.appendChild(bookBtn);

    const bookedLabel = document.createElement("span");
    bookedLabel.className = "already-booked-label";
    bookedLabel.textContent = "Already booked";
    bookedLabel.style.display = "none";
    actionGroup.appendChild(bookedLabel);

    if (alreadyBooked) {
        bookBtn.disabled = true;
        bookedLabel.style.display = "inline";
    }

    footer.appendChild(actionGroup);
    info.appendChild(footer);
    card.appendChild(info);

    return card;
}

function _createHistRow(booking) {
    const row = document.createElement("tr");

    const tourCell = document.createElement("td");
    tourCell.textContent = booking.tour_name;
    row.appendChild(tourCell);

    const dateCell = document.createElement("td");
    dateCell.textContent = _formatBookingDate(booking.booking_date);
    row.appendChild(dateCell);

    const peopleCell = document.createElement("td");
    peopleCell.textContent = booking.num_people;
    row.appendChild(peopleCell);

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge status-${booking.status}`;
    badge.textContent = booking.status;
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    return row;
}

function _createBookedCard(booking) {
    const bookingRow = document.createElement("div");
    bookingRow.className = "booking-row";

    const bookingInfo = document.createElement("div");
    const bookingTitle = document.createElement("div");
    bookingTitle.className = "booking-title";
    bookingTitle.textContent = booking.tour_name;
    bookingInfo.appendChild(bookingTitle);

    const bookingDetails = document.createElement("div");
    bookingDetails.className = "booking-meta";
    bookingDetails.textContent = `${booking.num_people} people \u00B7 Departs ${_formatBookingDate(booking.booking_date)}`;
    bookingInfo.appendChild(bookingDetails);

    bookingRow.appendChild(bookingInfo);
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-outline-danger";
    cancelBtn.textContent = "Cancel booking";
    cancelBtn.addEventListener("click", () => cancelSelectedBooking(booking, bookingRow));
    bookingRow.appendChild(cancelBtn);

    return bookingRow;
}

function openBookingModal(tour) {
    bookingModalTourID = tour.tourID;
    bookingModalTourPrice = Number(tour.price);

    document.getElementById("modal-username").value = currentUser.username || "";
    document.getElementById("modal-num-people").value = 1;
    updateModalTotal();

    document.getElementById("booking-modal-overlay").classList.add("is-open");
}

function closeBookingModal() {
    document.getElementById("booking-modal-overlay").classList.remove("is-open");
    bookingModalTourID = null;
}

function updateModalTotal() {
    const numPeople = Number(document.getElementById("modal-num-people").value) || 0;
    const total = numPeople * bookingModalTourPrice;
    document.getElementById("modal-total-price").textContent = `$${total.toFixed(2)}`;
}

function submitBooking(tourID, num_people) {
    return sendRequest("/api/me/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ tourID,  num_people })
    });
}

function cancelSelectedBooking(booking, bookingRow) {
    updateBooking(booking.bookingID, {status: "canceled"})
        .then(result => {
            bookingRow.remove();
            displayValidTours();
            displayAcceptedBookings();
            displayBookingHistory();
            alert("Booking canceled successfully");
        })
        .catch(err => alert(err.message));
}


// -------------------

// ============================================================
// SUPPORT THREADS (booker)
// ============================================================
function getMySupportThreads() {
    // Same endpoint the manager page calls - the backend should
    // return only this user's own threads (created_by = current
    // user) when a booker is asking, and everything when a
    // manager is asking.
    return sendRequest("/api/support/threads",
        {
            headers: {
                "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            },
        }
    );
}

function displayMySupportThreads() {
    const list = document.getElementById("threads-list");
    getMySupportThreads().then(result => {
        list.innerHTML = "";
        if (result.threads.length === 0) {
            const empty = document.createElement("p");
            empty.className = "booking-meta";
            empty.textContent = "You haven't started any support threads yet.";
            list.appendChild(empty);
            return;
        }
        result.threads.forEach(thread => list.appendChild(createBookerThreadRow(thread)));
    });
}

function createBookerThreadRow(thread) {
    const row = document.createElement("div");
    row.className = "booking-row";
    row.dataset.threadId = thread.threadID;

    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "booking-title";
    title.textContent = thread.tour_name || "General inquiry";
    info.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "booking-meta";
    meta.textContent = `Opened ${_formatBookingDate(thread.created_at)}`;
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
    viewBtn.addEventListener("click", () => openThreadViewModal(thread));
    row.appendChild(viewBtn);

    return row;
}

let viewingThreadID = null;

function openThreadViewModal(thread) {
    viewingThreadID = thread.threadID;
    document.getElementById("thread-view-title").textContent = thread.tour_name || "General inquiry";

    const isClosed = thread.status === "closed";
    document.getElementById("thread-view-reply-field").hidden = isClosed;
    document.getElementById("thread-view-reply-btn").hidden = isClosed;
    document.getElementById("thread-closed-note").hidden = !isClosed;
    document.getElementById("thread-view-reply-text").value = "";

    // TODO (backend): GET /api/support/threads/{threadID}/messages
    sendRequest(`/api/support/threads/${thread.threadID}/messages`,
        {
            headers: {
                "Authorization": `Bearer ${sessionStorage.getItem("token")}`
            },
        }
    )
        .then(result => {
            const box = document.getElementById("thread-view-messages");
            box.innerHTML = "";
            result.messages.forEach(msg => {
                const item = document.createElement("div");
                item.className = "thread-message";

                const meta = document.createElement("div");
                meta.className = "thread-message-meta";
                meta.textContent = `${msg.sender_username} \u00B7 ${_formatBookingDate(msg.sent_at)}`;
                item.appendChild(meta);

                const content = document.createElement("div");
                content.className = "thread-message-content";
                content.textContent = msg.content;
                item.appendChild(content);

                box.appendChild(item);
            });
            document.getElementById("thread-view-modal-overlay").classList.add("is-open");
        })
        .catch(err => alert(err.message));
}

function closeThreadViewModal() {
    document.getElementById("thread-view-modal-overlay").classList.remove("is-open");
    viewingThreadID = null;
}

document.getElementById("thread-view-done-btn").addEventListener("click", closeThreadViewModal);

document.getElementById("thread-view-reply-btn").addEventListener("click", function () {
    const content = document.getElementById("thread-view-reply-text").value.trim();
    if (!content) return;

    // TODO (backend): POST /api/support/threads/{threadID}/messages
    // - should reject this if the thread's status is 'closed'.
    sendRequest(`/api/support/threads/${viewingThreadID}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ content }),
    })
        .then(() => closeThreadViewModal())
        .catch(err => alert(err.message));
});


// ============================================================
// NEW THREAD MODAL
// ============================================================
function openNewThreadModal() {
    document.getElementById("new-thread-message").value = "";

    const tourSelect = document.getElementById("new-thread-tour");
    tourSelect.innerHTML = '<option value="">No specific tour</option>';
    sendRequest("/api/tours/available").then(result => {
        result.tours.forEach(tour => {
            const opt = document.createElement("option");
            opt.value = tour.tourID;
            opt.textContent = tour.tour_name;
            tourSelect.appendChild(opt);
        });
    });

    const managerSelect = document.getElementById("new-thread-manager");
    managerSelect.innerHTML = '<option value="">No preference</option>';
    // TODO (backend): GET /api/managers -> [{userID, username}, ...]
    sendRequest("/api/managers")
        .then(result => {
            result.managers.forEach(manager => {
                const opt = document.createElement("option");
                opt.value = manager.userID;
                opt.textContent = manager.username;
                managerSelect.appendChild(opt);
            });
        })
        .catch(() => {}); // optional field - fine if this list fails to load

    document.getElementById("new-thread-modal-overlay").classList.add("is-open");
}

function closeNewThreadModal() {
    document.getElementById("new-thread-modal-overlay").classList.remove("is-open");
}

document.getElementById("new-thread-btn").addEventListener("click", openNewThreadModal);
document.getElementById("new-thread-cancel-btn").addEventListener("click", closeNewThreadModal);

document.getElementById("new-thread-submit-btn").addEventListener("click", function () {
    const content = document.getElementById("new-thread-message").value.trim();
    if (!content) {
        alert("Please describe your issue before submitting.");
        return;
    }
    const tourID = document.getElementById("new-thread-tour").value || null;
    const assignedManager = document.getElementById("new-thread-manager").value || null;

    // TODO (backend): POST /api/support/threads - creates the
    // SupportThread row (created_by = current user, status =
    // 'open') AND its first SupportMessage row together.
    sendRequest("/api/support/threads", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({
            tourID: tourID ? Number(tourID) : null,
            assigned_manager: assignedManager ? Number(assignedManager) : null,
            content,
        }),
    })
        .then(() => {
            closeNewThreadModal();
            displayMySupportThreads();
        })
        .catch(err => alert(err.message));
});


// Add this alongside your other initial-load calls:
displayMySupportThreads();