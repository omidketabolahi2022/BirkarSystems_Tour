function signupBooker(username, password, email, number, role = "booker") {
    return fetch("/api/signup",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({username, password, email, number, role})
    }
    )
        .then(response => {
            if (!response.ok) {
                throw new Error(`new user submission failed with status ${response.status}`);
            }
            return response.json();
        });
}

function confirmSignup() {
    const username = document.getElementById("signup-username").value;
    const email = document.getElementById("signup-email").value;
    const number = document.getElementById("signup-number").value;
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm").value;
    const singupStatus = document.getElementById("signup-status");
    if (password !== confirmPassword) {
        singupStatus.textContent = "Passwords do not match";
        singupStatus.classList.remove("alert-success");
        singupStatus.classList.add("alert-error");
        return;
    }
    signupBooker(username, password, email, number)
        .then(result => {
            singupStatus.textContent = "Signup successful!";
            singupStatus.classList.remove("alert-error");
            singupStatus.classList.add("alert-success");
        })
        .catch(err => {
            singupStatus.textContent = err.message;
            singupStatus.classList.remove("alert-success");
            singupStatus.classList.add("alert-error");
        })

}



document.getElementById("signup-form").addEventListener("submit", function (event) {
    event.preventDefault();
    confirmSignup();
});