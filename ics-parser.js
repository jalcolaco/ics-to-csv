let parsedEvents = [];
let filteredEvents = [];
let calendarMeta = { name: "", timezone: "" };

document.getElementById('icsFile').addEventListener('change', handleFile);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const content = e.target.result;
    parseICS(unfoldICS(content));
    setDefaultDateFilters();
    applyFilters();
  };
  reader.readAsText(file);
}

function parseICS(data) {
  parsedEvents = [];

  const nameMatch = data.match(/X-WR-CALNAME:(.+)/);
  const tzMatch = data.match(/X-WR-TIMEZONE:(.+)/);
  calendarMeta.name = nameMatch ? nameMatch[1].trim() : "Unknown";
  calendarMeta.timezone = tzMatch ? tzMatch[1].trim() : "UTC";

  const events = data.split("BEGIN:VEVENT");
  events.shift();

  for (const rawEvent of events) {
    const content = rawEvent.split("END:VEVENT")[0];

    const get = (key) => {
      const match = content.match(new RegExp(`${key}(?:;[^\\n]*)?:([^\r\n]+)`));
      return match ? match[1].replace(/\\,/g, ",").replace(/\\n/g, "\n").trim() : "";
    };

    function formatDate(dt) {
      if (!dt) return { formatedDate: "", iso: "", formatedTime: "" };

      let dateObj;
      if (dt.endsWith('Z')) {
        const isoString = dt.replace(/(\d{8}T\d{6})Z/, (_, p1) =>
          `${p1.slice(0, 4)}-${p1.slice(4, 6)}-${p1.slice(6, 8)}T${p1.slice(9, 11)}:${p1.slice(11, 13)}:${p1.slice(13, 15)}Z`
        );
        dateObj = new Date(isoString);
      } else {
        const isoString = dt.replace(/(\d{8}T\d{6})/, (_, p1) =>
          `${p1.slice(0, 4)}-${p1.slice(4, 6)}-${p1.slice(6, 8)}T${p1.slice(9, 11)}:${p1.slice(11, 13)}:${p1.slice(13, 15)}`
        );
        dateObj = new Date(isoString);
      }

      if (isNaN(dateObj)) return { formatedDate: "", iso: "", formatedTime: "" };

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();

      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');

      return {
        formatedDate: `${day}-${month}-${year}`,
        iso: dateObj.toISOString().slice(0, 10),
        formatedTime: `${hours}:${minutes}`
      };
    }

    const ev = {
      summary: get("SUMMARY"),
      location: get("LOCATION"),
      startDate: formatDate(get("DTSTART")),
      endDate: formatDate(get("DTEND")),
      uid: get("UID"),
      creationDate: formatDate(get("CREATED")),
      modifyDate: formatDate(get("LAST-MODIFIED")),
      status: get("STATUS"),
      sequence: get("SEQUENCE"),
      transparency: get("TRANSP"),
      rawDescription: get("DESCRIPTION"),
      description: get("DESCRIPTION").replace(/\n/g, "<br>").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
    };

    parsedEvents.push(ev);
  }
}

function unfoldICS(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

function applyFilters() {
  const from = document.getElementById("filterFrom").value;
  const to = document.getElementById("filterTo").value;

  filteredEvents = parsedEvents.filter(ev => {
    const eventDate = ev.startDate.iso;
    if (from && eventDate < from) return false;
    if (to && eventDate > to) return false;
    return true;
  });

  renderTable();
}

function renderTable() {
  const info = `<h3>Calendar: ${calendarMeta.name}</h3>
      <!--<p>Timezone: ${calendarMeta.timezone}</p>-->
        `;
  document.getElementById("calendarInfo").innerHTML = info;

  if (filteredEvents.length === 0) {
    document.getElementById("output").innerHTML = "<p>No events found.</p>";
    document.getElementById("downloadBtn").style.display = "none";
    return;
  }

  let html = `
      <div class="table-responsive">
      <table id="eventsTable" class="table table-striped table-hover table-bordered">
        <thead class="table-light">
          <tr>
            <th class="row-details sortable" style="min-width: 100px" onclick="sortBy('uid')">UID</th>
            <th class="sortable" style="min-width: 200px" onclick="sortBy('summary')">Summary</th>
            <th class="sortable" style="min-width: 200px" onclick="sortBy('location')">Location</th>
            <th class="sortable" style="min-width: 75px" onclick="sortBy('startDate.formatedDate')">Start Date</th>
            <th class="sortable" style="min-width: 75px" onclick="sortBy('startDate.formatedTime')">Start Time</th>
            <th class="sortable" style="min-width: 75px" onclick="sortBy('endDate.formatedDate')">End Date</th>
            <th class="sortable" style="min-width: 75px" onclick="sortBy('endDate.formatedTime')">End Time</th>
            <th class="sortable" style="min-width: 400px" onclick="sortBy('description')">Description</th>
            <th class="row-details sortable" style="min-width: 100px" onclick="sortBy('status')">Status</th>
            <th class="row-details sortable" style="min-width: 100px" onclick="sortBy('sequence')">Seq</th>
            <th class="row-details sortable" style="min-width: 100px" onclick="sortBy('transparency')">Transparency</th>
            <th class="row-details sortable" style="min-width: 100px" onclick="sortBy('formatedCreatedDate.date')">Created</th>
            <th class="row-details sortable" style="min-width: 100px" onclick="sortBy('formatedModifiedDate.date')">Modified</th>
          </tr>
        </thead>
        <tbody>`;

  filteredEvents.forEach(ev => {
    html += `<tr>
          <td class="row-details">${ev.uid}</td>
          <td>${ev.summary}</td>
          <td>${ev.location}</td>
          <td>${ev.startDate.formatedDate}</td><td>${ev.startDate.formatedTime}</td>
          <td>${ev.endDate.formatedDate}</td><td>${ev.endDate.formatedTime}</td>
          <td>${ev.description}</td>
          <td class="row-details">${ev.status}</td>
          <td class="row-details">${ev.sequence}</td>
          <td class="row-details">${ev.transparency}</td>
          <td class="row-details">${ev.creationDate.formatedDate}</td>
          <td class="row-details">${ev.modifyDate.formatedDate}</td>
        </tr>`;
  });

  html += "</tbody></table></div>";
  document.getElementById("output").innerHTML = html;
  document.getElementById("downloadBtn").style.display = "inline-block";

  // If the "Show hidden columns" checkbox is unchecked, hide those columns by default
  if (!document.getElementById("toggleHiddenCols").checked) {
    hideHiddenColumns();
  }
}

// Keep track of current sort directions for each field
const sortDirections = {};

function sortBy(field) {
  // Toggle the sort direction: if undefined or false, set to true (asc), else toggle
  sortDirections[field] = !sortDirections[field];

  const keys = field.split(".");

  filteredEvents.sort((a, b) => {
    let valA = keys.reduce((obj, key) => (obj ? obj[key] : ""), a);
    let valB = keys.reduce((obj, key) => (obj ? obj[key] : ""), b);

    // Normalize null/undefined to empty string for string comparison
    valA = valA == null ? "" : valA;
    valB = valB == null ? "" : valB;

    // For date strings in dd-mm-yyyy format, convert to Date objects for comparison
    if (field.toLowerCase().includes("date")) {
      valA = parseDateString(valA);
      valB = parseDateString(valB);

      if (valA < valB) return sortDirections[field] ? -1 : 1;
      if (valA > valB) return sortDirections[field] ? 1 : -1;
      return 0;
    }

    // For time strings (hh:mm), just compare strings (lex order)
    if (field.toLowerCase().includes("time")) {
      if (valA < valB) return sortDirections[field] ? -1 : 1;
      if (valA > valB) return sortDirections[field] ? 1 : -1;
      return 0;
    }

    // Default string comparison
    return sortDirections[field]
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  renderTable();
}

// Helper to parse dd-mm-yyyy date string into Date object
function parseDateString(str) {
  const parts = str.split("-");
  if (parts.length !== 3) return new Date(0); // fallback to epoch date
  const [day, month, year] = parts;
  return new Date(`${year}-${month}-${day}`); // ISO format for Date constructor
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setDefaultDateFilters() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  document.getElementById("filterFrom").value = toLocalDateString(firstDay);
  document.getElementById("filterTo").value = toLocalDateString(lastDay);
}

function toggleHiddenColumns() {
  const checkbox = document.getElementById("toggleHiddenCols");
  if (checkbox.checked) {
    showHiddenColumns();
  } else {
    hideHiddenColumns();
  }
}

function hideHiddenColumns() {
  document.querySelectorAll(".row-details").forEach(el => {
    el.style.display = "none";
  });
}

function showHiddenColumns() {
  document.querySelectorAll(".row-details").forEach(el => {
    el.style.display = "";
  });
}

function downloadCSV() {
  const headers = [
    "UID",
    "Summary",
    "Location",
    "Start Date", "Start Time",
    "End Date", "End Time",
    "Description",
    //"Status", "Sequence", "Transparency",
    "Created Date", "Modified Date"
  ];

  function escapeCSV(text) {
    if (text == null) return '""';
    // Replace all " with ""
    let escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }


  const rows = [headers, ...filteredEvents.map(ev => [
    escapeCSV(ev.uid),
    escapeCSV(ev.summary),
    escapeCSV(ev.location),
    ev.startDate.formatedDate,
    ev.startDate.formatedTime,
    ev.endDate.formatedDate,
    ev.endDate.formatedTime,
    escapeCSV(ev.rawDescription),
    //escapeCSV(ev.status),
    //escapeCSV(ev.sequence),
    //escapeCSV(ev.transparency),
    ev.creationDate.formatedDate,
    ev.modifyDate.formatedDate
  ])];

  const csvContent = rows.map(e => e.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "calendar_events.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("downloadBtn").addEventListener("click", downloadCSV);