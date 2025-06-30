let parsedEvents = [];
let filteredEvents = [];
let calendarMeta = { name: "", timezone: "" };

// Keep track of current sort directions for each field

let currentSortField = "";
let currentSortDirection = "asc";

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
      <table id="eventsTable" class="table table-striped table-hover table-bordered align-middle text-nowrap small">
        <thead class="table-light">
          <tr>
            <th class="col-hidden sortable th-size-medium" data-field="uid" onclick="sortBy('uid')">UID<span class="sort-arrow"></th>
            <th class="sortable th-size-medium" data-field="summary" onclick="sortBy('summary')">Summary<span class="sort-arrow"></th>
            <th class="sortable th-size-medium" data-field="location" onclick="sortBy('location')">Location<span class="sort-arrow"></th>
            <th class="sortable th-size-small" data-field="startDate.formatedDate" onclick="sortBy('startDate.formatedDate')">Start Date<span class="sort-arrow"></th>
            <th class="sortable th-size-small" data-field="startDate.formatedTime" onclick="sortBy('startDate.formatedTime')">Start Time<span class="sort-arrow"></th>
            <th class="sortable th-size-small" data-field="endDate.formatedDate" onclick="sortBy('endDate.formatedDate')">End Date<span class="sort-arrow"></th>
            <th class="sortable th-size-small" data-field="endDate.formatedTime" onclick="sortBy('endDate.formatedTime')">End Time<span class="sort-arrow"></th>
            <th class="sortable th-size-large" data-field="description" onclick="sortBy('description')">Description<span class="sort-arrow"></th>
            <th class="col-hidden th-size-small sortable" data-field="status" onclick="sortBy('status')">Status<span class="sort-arrow"></th>
            <th class="col-hidden th-size-small sortable" data-field="sequence" onclick="sortBy('sequence')">Seq<span class="sort-arrow"></th>
            <th class="col-hidden th-size-small sortable" data-field="transparency" onclick="sortBy('transparency')">Transparency<span class="sort-arrow"></th>
            <th class="col-hidden th-size-small sortable" data-field="formatedCreatedDate.date" onclick="sortBy('formatedCreatedDate.date')">Created<span class="sort-arrow"></th>
            <th class="col-hidden th-size-small sortable" data-field="formatedModifiedDate.date" onclick="sortBy('formatedModifiedDate.date')">Modified<span class="sort-arrow"></th>
          </tr>
        </thead>
        <tbody>`;

  filteredEvents.forEach(ev => {
    html += `<tr>
        <td class="col-hidden hidden">${ev.uid}</td>
        <td>
       

          ${buildCellDataExpandable(ev.summary)}
        </td>
        <td>
          ${buildCellDataExpandable(ev.location)}
        </td>
        <td>${ev.startDate.formatedDate}</td><td>${ev.startDate.formatedTime}</td>
        <td>${ev.endDate.formatedDate}</td><td>${ev.endDate.formatedTime}</td>
        <td>
          ${buildCellDataExpandable(ev.description)}
        </td>
        <td class="col-hidden hidden">${ev.status}</td>
        <td class="col-hidden hidden">${ev.sequence}</td>
        <td class="col-hidden hidden">${ev.transparency}</td>
        <td class="col-hidden hidden">${ev.creationDate.formatedDate}</td>
        <td class="col-hidden hidden">${ev.modifyDate.formatedDate}</td>
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


function buildCellDataExpandable(cellContent) {
  if (!cellContent || cellContent.length <= 30) {
    return `<div style="white-space: pre-line;">${cellContent}</div>`;
  }
  return `
  
          <details>
            <summary>${cellContent.length > 30 ? cellContent.slice(0, 30) : cellContent}</summary>
            <div style="white-space: pre-line;">${cellContent.slice(30)}</div>
          </details>
          
          
          `;
}

const sortDirections = {}; // track sort direction per field

function sortBy(field) {
  // Toggle the sort direction for the current field
  sortDirections[field] = !sortDirections[field];

  const keys = field.split(".");

  filteredEvents.sort((a, b) => {
    let valA = keys.reduce((obj, key) => (obj ? obj[key] : ""), a);
    let valB = keys.reduce((obj, key) => (obj ? obj[key] : ""), b);

    valA = valA == null ? "" : valA;
    valB = valB == null ? "" : valB;

    if (field.includes("formatedDate")) {
      valA = parseDateString(valA);
      valB = parseDateString(valB);

      if (valA < valB) return sortDirections[field] ? -1 : 1;
      if (valA > valB) return sortDirections[field] ? 1 : -1;
      return 0;
    }

    if (field.includes("formatedTime")) {
      if (valA < valB) return sortDirections[field] ? -1 : 1;
      if (valA > valB) return sortDirections[field] ? 1 : -1;
      return 0;
    }

    return sortDirections[field]
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  renderTable();
  updateSortIndicators(field);
}


function updateSortIndicators(currentField) {
  document.querySelectorAll("th.sortable").forEach(th => {
    const field = th.dataset.field;
    th.classList.remove("asc", "desc");

    if (field === currentField) {
      th.classList.add(sortDirections[field] ? "asc" : "desc");
    }
  });
}

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
  document.querySelectorAll(".col-hidden").forEach(el => {
    el.classList.add("hidden");
  });
}

function showHiddenColumns() {
  document.querySelectorAll(".col-hidden").forEach(el => {
    el.classList.remove("hidden");
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

document.getElementById('icsFile').addEventListener('change', handleFile);
document.getElementById("downloadBtn").addEventListener("click", downloadCSV);