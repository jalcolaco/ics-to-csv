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

            if (!accessToken) {
                console.error("Access token was not received.");
                return;
            }

            enableCalendarFeatures(); // ✅ Now runs after token is received
        },
    });

    tokenClient.requestAccessToken(); // Always request, since callback handles flow
}

function handleAuthClick() {
    const clientId = getClientId();
    initGoogleAuth(clientId);
}

function enableCalendarFeatures() {
    if (!accessToken) {
        console.warn("Access token is not available. Please authorize first.");
        return;
    }

    document.getElementById("authorize_button")?.classList.add("d-none");

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

function listEventsFromCalendarThisMonth(calendarId) {
  const now = new Date();

  // Start of the current month (00:00:00 on the 1st day)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // Start of the next month (to use as exclusive upper bound)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Convert to ISO string (RFC3339 format)
  const timeMin = startOfMonth.toISOString();
  const timeMax = startOfNextMonth.toISOString();

  fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=50&orderBy=startTime&singleEvents=true&timeMin=${timeMin}&timeMax=${timeMax}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (!data.items) {
      console.warn("No events found or missing permissions.");
      return;
    }

    console.log(`Events from calendar "${calendarId}" in the current month:`, data.items);
    // display or process events here
  })
  .catch(err => console.error("Error fetching events", err));
}


window.onload = () => {
    const clientId = getClientId();

    if (clientId) {

        if (!tokenClient) {
            document.getElementById("authorize_button")?.classList.remove("d-none");
            document.getElementById("authorize_button")?.addEventListener("click", handleAuthClick);
        } else {
            enableCalendarFeatures();
        }
    } else {
        console.warn("Google Client ID is missing from URL or sessionStorage.");
    }
};
