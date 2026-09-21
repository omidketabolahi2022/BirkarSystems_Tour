function logoutBooker() {
    sessionStorage.removeItem("token");
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
    getAvailableTours()
        .then(result => {
            const validTours = result.tours;
            allToursPanel.innerHTML = "";
            validTours.forEach(tour => {
                const card = _createTourCard(tour);
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

function _createTourCard(tour) {
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

    const bookBtn = document.createElement("button");
    bookBtn.type = "button";
    bookBtn.className = "btn btn-primary";
    bookBtn.textContent = "Book";
    bookBtn.addEventListener("click", () => bookTour(tour.tourID));
    footer.appendChild(bookBtn);

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
