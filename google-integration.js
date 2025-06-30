let tokenClient = null;
let accessToken = null;
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function getClientId() {
    const params = new URLSearchParams(window.location.search);
    let clientId = params.get("clientId");
    if (clientId) sessionStorage.setItem("clientId", clientId);
    return clientId || sessionStorage.getItem("clientId") || "";
}

function initGoogleAuth(clientId) {
    if (!clientId) {
        console.error("Client ID is required.");
        return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        prompt: 'consent',
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            listUpcomingEvents();
        },
    });
}

function handleAuthClick() {
    if (!tokenClient) {
        const clientId = getClientId();
        initGoogleAuth(clientId);
    }

    if (!accessToken) {
        tokenClient?.requestAccessToken();
    } else {
        listUpcomingEvents();
    }
}

function listUpcomingEvents() {
    fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (!data?.items?.length) {
            console.warn("No events found or missing permissions.");
            return;
        }
        console.log("Events:", data.items);
    })
    .catch(err => {
        console.error("Error fetching events", err);
        accessToken = null;
    });
}

window.onload = () => {
    const clientId = getClientId();

    if (clientId) {
        document.getElementById("authorize_button")?.classList.remove("d-none");
        document.getElementById("authorize_button")?.addEventListener("click", handleAuthClick);
        initGoogleAuth(clientId); // Preload auth client
    } else {
        console.warn("Google Client ID is missing from URL or sessionStorage.");
    }
};
