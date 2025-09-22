let currentData = {};
let testData = {}; // store loaded JSON data

document.addEventListener("DOMContentLoaded", () => {
  // Load data.json first
  fetch(chrome.runtime.getURL("data.json"))
    .then(response => response.json())
    .then(json => {
      testData = json;
      currentData = generateAllData();
    });

  // Refresh data when clicking Generate
  document.getElementById("generateBtn").addEventListener("click", () => {
    currentData = generateAllData();
    /*alert("✅ New test data generated!");*/
  });

  // Fill all fields
  document.getElementById("fillFieldsBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        alert("⚠️ Cannot run on this page. Please open a normal website with form fields.");
        return;
      }

      Object.keys(fieldsMap).forEach((label) => {
        let value = currentData[fieldsMap[label]];
        if (value === undefined || value === null) value = "";
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectValueInPage,
          args: [label, String(value)]
        });
      });
    });
  });

  // Yes button clicker
  document.getElementById("yesBtn").addEventListener("click", () => {
    clickButtonsOnPage("yes");
  });

  // No button clicker
  document.getElementById("noBtn").addEventListener("click", () => {
    clickButtonsOnPage("no");
  });
});

// ---------------------------
// Inject into page
// ---------------------------
function injectValueInPage(label, value) {
  let targetInput = null;

  // ---------------------------
  // Try normal <label> lookup
  // ---------------------------
  const allLabels = document.querySelectorAll("label");
  for (const lbl of allLabels) {
    if (lbl.innerText.trim().toLowerCase().includes(label.toLowerCase())) {
      if (lbl.htmlFor) {
        targetInput = document.getElementById(lbl.htmlFor);
      } else {
        targetInput = lbl.querySelector("input, textarea, select");
      }
      if (targetInput) break;
    }
  }

  // ---------------------------
  // Try span-based XPath style lookup
  // ---------------------------
  if (!targetInput) {
    const span = Array.from(document.querySelectorAll("span"))
      .find(sp => sp.innerText.trim().toLowerCase() === label.toLowerCase());
    if (span) {
      targetInput = span.closest("div")?.querySelector("input, textarea, select");
    }
  }

  if (!targetInput) return;

  targetInput.focus();
  targetInput.click();

  // ---------------------------
  // lf-select dropdown
  // ---------------------------
  const customDropdown = targetInput.closest("lf-select");
  if (customDropdown) {
    customDropdown.click();
    setTimeout(() => {
      const panel = document.querySelector("lf-dropdown-panel");
      if (!panel) return;
      const option = Array.from(panel.querySelectorAll("span"))
        .find(sp => sp.innerText.trim().toLowerCase() === value.toLowerCase());
      if (option) {
        option.scrollIntoView({ block: "center" });
        option.click();
      }
    }, 200);
    return;
  }

  // ---------------------------
  // Normal <select>
  // ---------------------------
  if (targetInput.tagName === "SELECT") {
    for (const opt of targetInput.options) {
      if (opt.text.toLowerCase() === value.toLowerCase() || opt.value.toLowerCase() === value.toLowerCase()) {
        targetInput.value = opt.value;
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        setTimeout(() => targetInput.dispatchEvent(new Event("change", { bubbles: true })), 500);
        return;
      }
    }
  }

  // ---------------------------
  // Amount fields
  // ---------------------------
  if (["Gross Annual Income", "Net worth", "Amount with Application", "Premium Amount for DCA"].includes(label)) {
    targetInput.value = value;
    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    targetInput.blur();
    return;
  }

  // ---------------------------
  // Normal input/textarea
  // ---------------------------
  const lastValue = targetInput.value;
  targetInput.value = value;
  const event = new Event("input", { bubbles: true });
  const tracker = targetInput._valueTracker;
  if (tracker) tracker.setValue(lastValue);
  targetInput.dispatchEvent(event);
  targetInput.dispatchEvent(new Event("change", { bubbles: true }));
  targetInput.blur();
}

// ---------------------------
// Click all Yes/No buttons
// ---------------------------
function clickButtonsOnPage(choice) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      alert("⚠️ Cannot run on this page.");
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (choice) => {
        const buttons = document.querySelectorAll("button, button span");
        buttons.forEach(btn => {
          const text = btn.innerText.trim().toLowerCase();
          if (text === choice.toLowerCase()) {
            const buttonEl = btn.tagName.toLowerCase() === "button" ? btn : btn.closest("button");
            if (buttonEl) {
              buttonEl.scrollIntoView({ behavior: "smooth", block: "center" });
              buttonEl.click();
              console.log(`✅ Clicked: ${text}`);
            }
          }
        });
      },
      args: [choice]
    });
  });
}

// ---------------------------
// Field map
// ---------------------------
const fieldsMap = {
  "Birth Date": "birthDate",
  "Date of Birth": "birthDate",
  "Gender": "gender",
  "First Name": "firstName",
  "Middle Name": "middleName",
  "Last Name": "lastName",
  "Email": "email",
  "Primary Address Line 1": "addr1",
  "Primary Address Line 2": "addr2",
  "Address Line 1": "addr1",
  "Address Line1": "addr1",
  "Address Line 2": "addr2",
  "Address Line2": "addr2",
  "City": "city",
  "State": "state",
  "Zip Code": "zip",
  "Social Security Number": "ssn",
  "SSN/Tax ID": "taxId",
  "SSN": "taxId",
  "Account No.": "acct",
  "Routing No.": "routing",
  "Primary Phone": "primaryPhone",
  "Phone": "primaryPhone",
  "Alternate Phone": "alternatePhone",
  "Arbor": "arbor",
  "Gross Annual Income": "grossAnnualIncome",
  "Net worth": "netWorth",
  "Percentage": "percentage",
  "Copy Address": "copyAddress",
  "Home Phone": "homePhone",
  "Trust Name": "trustName",
  "Tax ID Number": "taxIdNumber",
  "Date Established": "dateEstablished",
  "Trustee Name": "trusteeName",
  "Telephone Number": "telephoneNumber",
  "Corporation Name": "corporationName",
  "Officer Name": "officerName",
  "Position": "position",
  "Name": "genericName",
  "Driver's License Number": "driversLicence",
  "Certificate #": "certificateNumber",
  "Routing Number": "routing",
  "Amount with Application": "amount",
  "Requested Effective Date": "currentDate",
  "Parent/Guardian for Juvenile Insured": "parentGuardian",
  "Green Card #": "greenCard",
  "Premium Amount for DCA": "premiumAmountDCA",
  "Date Premium Expected to be Received": "currentDate"
};

// ---------------------------
// Random helpers
// ---------------------------
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ---------------------------
// Generate Functions
// ---------------------------
function generateBirthDate(mode = "random") {
  if (mode.toLowerCase() === "today") {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  }
  const year = randInt(1970, 2000);
  const month = String(randInt(1, 12)).padStart(2, "0");
  const day = String(randInt(1, 28)).padStart(2, "0");
  return `${month}/${day}/${year}`;
}

function generateGender() { return rand(["Male","Female"]); }
function generateZip() { return String(randInt(10000, 99999)); }
function generateSSN() { return `${randInt(100,999)}-${randInt(10,99)}-${randInt(1000,9999)}`; }
function generateAccountNumber() { return String(randInt(10000000, 99999999)); }
function generateRoutingNumber() { return rand(testData.routingNumbers); }
function generatePhone() { return `(${randInt(100,999)}) ${randInt(100,999)}-${randInt(1000,9999)}`; }
function generateDriversLicense() { return rand(testData.driversLicenseNumbers); }
function generateCertificateNumber() { return rand(testData.certificateNumbers); }
function generateAmount() { return (randInt(1000, 10000) + 0.00).toFixed(2); }

function generateAllData() {
  const first = rand(testData.firstNames);
  const middle = rand(testData.middleNames);
  const last = rand(testData.lastNames);

  return {
    birthDate: generateBirthDate(),
    gender: generateGender(),
    firstName: first,
    middleName: middle,
    lastName: last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    addr1: `${randInt(100,999)} ${rand(testData.streets)}`,
    addr2: `Apt ${randInt(1,99)}`,
    city: rand(testData.cities),
    state: rand(testData.states),
    zip: generateZip(),
    ssn: generateSSN(),
    acct: generateAccountNumber(),
    routing: testData.routingNumbers,
    primaryPhone: generatePhone(),
    alternatePhone: generatePhone(),
    arbor: "Arbor Test",
    grossAnnualIncome: generateAmount(),
    netWorth: generateAmount(),
    amount: generateAmount(),
    taxId: generateSSN(),
    percentage: "100%",
    copyAddress: "Yes",
    homePhone: generatePhone(),
    trustName: "Family Trust",
    taxIdNumber: generateSSN(),
    dateEstablished: `${randInt(1,12)}/${randInt(1,28)}/${randInt(1990,2020)}`,
    trusteeName: `${rand(testData.firstNames)} ${rand(testData.lastNames)}`,
    telephoneNumber: generatePhone(),
    corporationName: `${rand(testData.lastNames)} Corp`,
    officerName: `${rand(testData.firstNames)} ${rand(testData.lastNames)}`,
    position: rand(["CEO","Manager","Treasurer","Secretary"]),
    genericName: `${rand(testData.firstNames)} ${rand(testData.lastNames)}`,
    driversLicence: generateDriversLicense(),
    certificateNumber: generateCertificateNumber(),
    currentDate: generateBirthDate("today"),
    parentGuardian: `${first} ${last} Parent`,
    greenCard: `GreenCard${String(randInt(10000000, 99999999))}`,
    premiumAmountDCA: `${String(randInt(100000, 999999))}`
  };
}
