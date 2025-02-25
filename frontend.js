// Check if session ID is already stored
let sessionId = localStorage.getItem("session_id");

if (!sessionId) {
    // If no session ID, request one from the backend
    fetch("/get-session/", { method: "POST" })
        .then((response) => response.json())
        .then((data) => {
            sessionId = data.session_id;
            localStorage.setItem("session_id", sessionId); // Store session ID
        });
}

// Function to upload a file
function uploadFile(file) {
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("file", file);

    fetch("/upload/", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => console.log("File uploaded:", data));
}
