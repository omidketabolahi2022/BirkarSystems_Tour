function sendRequest(url, data) {
    return fetch(url, data)
        .then(response => {
            if (!response.ok) {
                const err = new Error(`failed with status ${response.status}`);
                err.status = response.status;
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

function signupBooker(username, password, email, number, role = "booker") {
    return sendRequest("/api/signup",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({username, password, email, number, role})
    }
    );
}

function confirmSignup() {
    const username = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const number = document.getElementById("signup-number").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const confirmPassword = document.getElementById("signup-confirm").value.trim();
    const singupStatus = document.getElementById("signup-status");
    if (password !== confirmPassword) {
        singupStatus.textContent = "Passwords do not match";
        singupStatus.classList.remove("alert-success");
        singupStatus.classList.add("alert-error");
        singupStatus.hidden = false;
        return;
    }
    signupBooker(username, password, email, number)
        .then(result => {
            singupStatus.textContent = "Signup successful!";
            singupStatus.classList.remove("alert-error");
            singupStatus.classList.add("alert-success");
            singupStatus.hidden = false;
        })
        .catch(err => {
            singupStatus.textContent = `Signup failed: ${err.message}`;
            singupStatus.classList.remove("alert-success");
            singupStatus.classList.add("alert-error");
            singupStatus.hidden = false;
        })

}

function loginBooker(username, password) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    return sendRequest("/api/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData
        }
    );
}

function confirmLogin() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const loginStatus = document.getElementById("login-status");
    sessionStorage.removeItem("token");
    loginBooker(username, password)
        .then(result => {
            sessionStorage.setItem("token", result.access_token);
            loginStatus.textContent = "Login successful!";
            loginStatus.classList.remove("alert-error");
            loginStatus.classList.add("alert-success");
            loginStatus.hidden = false;
            if (result.role === "manager")
                window.location.href = "/manager-home";
            else
                window.location.href = "/booker-home";
        })
        .catch(err => {
            loginStatus.textContent = `Login failed: ${err.message}`;
            loginStatus.classList.remove("alert-success");
            loginStatus.classList.add("alert-error");
            loginStatus.hidden = false;
        })

}



document.getElementById("signup-form").addEventListener("submit", function (event) {
    event.preventDefault();
    confirmSignup();
});


document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    confirmLogin();
});