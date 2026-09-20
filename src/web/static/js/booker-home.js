// on entrance we need to load All tours
// on entrance we need to load My bookings (with status = accepted)
// on entrance we need to load the User profile (username, email, etc) + all booking (whether failed, accepted, or canceled)

function logoutBooker() {
    sessionStorage.removeItem("token");
    window.location.replace("/auth");
}

function getValidTours() {
    return fetch("http://127.0.0.1:8000/api/getValidTours", {
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
    route.textContent = `${tour.source} \u2192 ${tour.destination}`; // \u2192 is the "→" arrow
    details.appendChild(route);

    const meta = document.createElement("div");
    meta.className = "tour-meta";
    const departDate = new Date(tour.start_time).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });
    meta.textContent = `${tour.day_length} days \u00B7 Departs ${departDate}`; // \u00B7 is "·"
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


function displayValidTours() {
    const allToursPanel = document.getElementById("all-tours-panel");
    getValidTours()
        .then(result => {
            const validTours = result.validTours;
            allToursPanel.innerHTML = "";
            validTours.forEach(tour => {
                const card = _createTourCard(tour);
                allToursPanel.appendChild(card);
            });
        });
}

function getMyBookings() {
    return fetch("http://127.0.0.1:8000/api/getMyBookings", {
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

function _createHistRow(booking) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${booking.tour_name}</td>
        <td>${_formatBookingDate(booking.booking_date)}</td>
        <td>${booking.num_people}</td>
        <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
    `;
    return row;
}

function displayBookingHistory() {
    getMyBookings()
        .then(result => {
            const bookingHistory = result.myBookings;
            const historyTable = document.getElementById("historyTable");
            historyTable.innerHTML = "";
            bookingHistory.forEach(booking => {
                const row = _createHistRow(booking);
                historyTable.appendChild(row);
            })
        })
}

function getMyAcceptedBookings() {
    return fetch("http://127.0.0.1:8000/api/getMyAcceptedBookings", {
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

function getCurrentUser() {
    return fetch("http://127.0.0.1:8000/api/me", {
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
// getMyAcceptedBookings();
