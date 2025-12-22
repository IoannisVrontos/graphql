document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("errorMsg");

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            errorMsg.textContent = data.error || "Login failed.";
            return;
        }

        localStorage.setItem("jwt", data.token);
        window.location.href = "/profile";
    } catch (err) {
        errorMsg.textContent = "Network error. Please try again.";
    }
});