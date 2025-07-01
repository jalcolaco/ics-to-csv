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
        enableCalendarFeatures();
    }
}

function enableCalendarFeatures() {
    if (!accessToken) {
        console.warn("Access token is not available. Please authorize first.");
        return;
    }

    document.getElementById("fetch_calendars")?.classList.remove("d-none");
    document.getElementById("fetch_events")?.classList.remove("d-none");

    document.getElementById("fetch_calendars")?.addEventListener("click", listCalendars);
    document.getElementById("fetch_events")?.addEventListener("click", listUpcomingEvents);

    listCalendars();
    listUpcomingEvents();

}

function listUpcomingEvents() {
    fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log("Raw API response:", data);
        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        if (!data.items || data.items.length === 0) {
            console.warn("No events found or missing permissions.");
            return;
        }

        console.log("Events:", data.items);
    })
    .catch(err => {
        console.error("Error fetching events", err);
    });
}

function listCalendars() {
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (!data.items) {
            console.warn("No calendars found or missing permissions.");
            return;
        }

        console.log("Calendars:", data.items);
        data.items.forEach(cal => {
            console.log(`📅 ${cal.summary} (${cal.id})`);
        });
    })
    .catch(err => {
        console.error("Error fetching calendars", err);
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
