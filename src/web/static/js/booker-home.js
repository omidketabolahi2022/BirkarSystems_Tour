let currentUser = null;
let bookingModalTourID = null;
let bookingModalTourPrice = 0;

function logoutBooker() {
    sessionStorage.removeItem("token");
    currentUser = null;
    window.location.replace("/auth");
}

function getAvailableTours() {
    return fetch("/api/tours/available", {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`failed to get current user with status ${response.status}`);
            }
            return response.json();
        })
}

function displayValidTours() {
    const allToursPanel = document.getElementById("all-tours-panel");

    Promise.all([getAvailableTours(), getMyAcceptedBookings()])
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

function getMyBookings() {
    return fetch("/api/me/bookings", {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`failed to get current user with status ${response.status}`);
            }
            return response.json();
        })
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

function getMyAcceptedBookings() {
    return fetch("/api/me/bookings?has_status=accepted", {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`failed to get current user with status ${response.status}`);
            }
            return response.json();
        })
}

function displayAcceptedBookings() {
    const myToursPanel = document.getElementById("my-tours-panel");
    getMyAcceptedBookings()
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
    return fetch("/api/me", {
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`failed to get current user with status ${response.status}`);
            }
            return response.json();
        })
}

function displayCurrentUser() {
    getCurrentUser()
        .then(user => {
            currentUser = user;
            document.getElementById("account-username").value = user.username;
            document.getElementById("account-email").value = user.email;
            document.getElementById("account-number").value = user.number;
        })
}


displayValidTours();
displayCurrentUser();
displayBookingHistory();
displayAcceptedBookings();


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
    bookBtn.dataset.tourId = tour.tourID;
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
    return fetch("/api/me/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ tourID,  num_people })
    }).then(response => {
        if (!response.ok) {
            throw new Error(`booking failed with status ${response.status}`);
        }
        return response.json();
    });
}

function markTourAsBooked(tourID) {
    const bookBtn = document.querySelector(`button[data-tour-id="${tourID}"]`);
    if (!bookBtn) return;
    bookBtn.disabled = true;
    bookBtn.parentElement.querySelector(".already-booked-label").style.display = "inline";
}

document.getElementById("modal-num-people").addEventListener("input", updateModalTotal);
document.getElementById("modal-cancel-btn").addEventListener("click", closeBookingModal);

document.getElementById("modal-submit-btn").addEventListener("click", function () {
    const numPeople = Number(document.getElementById("modal-num-people").value);
    if (!numPeople || numPeople < 1) return;

    submitBooking(bookingModalTourID, numPeople)
        .then(() => {
            markTourAsBooked(bookingModalTourID);
            closeBookingModal();
        })
        .catch(err => alert(err.message));
});