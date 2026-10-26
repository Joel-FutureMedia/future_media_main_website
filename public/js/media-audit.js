(function () {
  const form = document.querySelector("#mediaAuditForm");
  if (!form) return;

  const localHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const API_BASE = localHost ? "http://localhost:8980" : (form.dataset.api || "http://localhost:8980");

  const tilesEl = document.querySelector("#auditTiles");
  const extraLocation = document.querySelector("#auditLocationExtra");
  const extraCampaign = document.querySelector("#auditOtherCampaign");
  const detailsEl = document.querySelector("#auditDetails");
  const kickerEl = document.querySelector("#auditKicker");
  const titleEl = document.querySelector("#auditTitle");
  const hintEl = document.querySelector("#auditHint");
  const errorEl = document.querySelector("#auditError");
  const progressEl = document.querySelector("#auditProgress");
  const backBtn = document.querySelector("#auditBack");
  const nextBtn = document.querySelector("#auditNext");
  const skipBtn = document.querySelector("#auditSkip");
  const doneEl = document.querySelector("#auditDone");
  const townSelect = document.querySelector("#namibiaTown");
  const otherInput = document.querySelector("#locationOther");
  const otherLabel = document.querySelector("#auditOtherLabel");
  const townLabel = document.querySelector("#auditTownLabel");
  const campaignOther = document.querySelector("#campaignTypeOther");

  const state = {
    businessDescription: [],
    locationCountry: "",
    namibiaTown: "",
    locationOther: "",
    campaignType: "",
    campaignTypeOther: "",
    primaryAudience: "",
    currentAdvertising: [],
    advertiseTimeline: "",
    advertisingBudget: "",
    skippedBudget: false
  };

  const steps = [
    {
      key: "business",
      kicker: "Step 1 of 7",
      title: "Which of these best describes your business?",
      hint: "Select all that apply.",
      type: "multi",
      field: "businessDescription",
      exclusive: "Not sure yet",
      options: [
        "Brand awareness",
        "Product Launch",
        "Promotions & specials",
        "Event promotion",
        "Retail / In-store",
        "Digital",
        "Not sure yet"
      ]
    },
    {
      key: "location",
      kicker: "Step 2 of 7",
      title: "Where are you located?",
      hint: "Choose Namibia for a town dropdown, South Africa, or another country.",
      type: "single",
      field: "locationCountry",
      options: ["Namibia", "South Africa", "Other country"]
    },
    {
      key: "campaign",
      kicker: "Step 3 of 7",
      title: "What type of campaign are you planning?",
      hint: "Single select only.",
      type: "single",
      field: "campaignType",
      options: [
        "Retail",
        "FMCG",
        "Financial Services",
        "Government/Parastatal",
        "Media Agency",
        "Hospitality",
        "Healthcare",
        "Professional Services",
        "Other"
      ]
    },
    {
      key: "audience",
      kicker: "Step 4 of 7",
      title: "Who are you trying to reach?",
      hint: "Pick your primary audience.",
      type: "single",
      field: "primaryAudience",
      options: [
        "Mass market consumers",
        "Working adults (Middle income)",
        "Affluent consumers (High income)",
        "Youth & Young Adults (18-25)",
        "Families & households",
        "Business owners & decision makers",
        "Not sure yet"
      ]
    },
    {
      key: "current",
      kicker: "Step 5 of 7",
      title: "What advertising do you currently do?",
      hint: "Select all that apply, or “Nothing Yet” if you’re just starting out.",
      type: "multi",
      field: "currentAdvertising",
      exclusive: "Nothing Yet",
      options: [
        "Radio",
        "TV",
        "Social media",
        "Influencer marketing",
        "Online Display or Search Ads",
        "Billboards / DOOH",
        "Print",
        "Nothing Yet"
      ]
    },
    {
      key: "when",
      kicker: "Step 6 of 7",
      title: "When are you looking to advertise?",
      hint: "Choose the timing that fits best.",
      type: "single",
      field: "advertiseTimeline",
      options: [
        "As soon as possible",
        "Within 1-3 months",
        "3-6 months' time",
        "Planning for next year",
        "Not sure yet"
      ]
    },
    {
      key: "budget",
      kicker: "Step 7 of 7",
      title: "What’s your approximate advertising budget?",
      hint: "This helps us recommend the right solutions. You can skip this if you prefer.",
      type: "single",
      field: "advertisingBudget",
      optional: true,
      options: [
        "Under N$20,000",
        "N$20,000 – N$50,000",
        "N$50,000 – N$150,000",
        "N$150,000+",
        "Prefer not to say"
      ]
    },
    {
      key: "details",
      kicker: "Your details",
      title: "How should we reach you?",
      hint: "We’ll use this to send your media audit. Location is already captured from step 2.",
      type: "details"
    }
  ];

  let index = 0;

  function selectedFor(step) {
    return state[step.field];
  }

  function isOn(step, option) {
    const value = selectedFor(step);
    return Array.isArray(value) ? value.includes(option) : value === option;
  }

  function setError(message) {
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function updateLocationExtras() {
    const namibia = state.locationCountry === "Namibia";
    const otherCountry = state.locationCountry === "Other country";
    extraLocation.hidden = !(namibia || otherCountry);
    if (extraLocation.hidden) return;

    townSelect.hidden = !namibia;
    townLabel.hidden = !namibia;
    const showOtherTown = namibia && townSelect.value === "Other town";
    const showOtherCountry = otherCountry;
    otherInput.hidden = !(showOtherTown || showOtherCountry);
    otherLabel.hidden = otherInput.hidden;
    otherInput.placeholder = showOtherCountry ? "Enter your country" : "Enter your town";
    otherLabel.textContent = showOtherCountry ? "Other country" : "Other town";
    if (namibia) townLabel.textContent = "Namibia town";
  }

  function renderProgress() {
    progressEl.innerHTML = steps.map((step, i) => {
      const cls = i === index ? "on" : i < index ? "done" : "";
      const label = step.type === "details" ? "You" : String(i + 1);
      return `<span class="${cls}" aria-current="${i === index ? "step" : "false"}">${label}</span>`;
    }).join("");
  }

  function render() {
    const step = steps[index];
    kickerEl.textContent = step.kicker;
    titleEl.textContent = step.title;
    hintEl.textContent = step.hint;
    setError("");
    backBtn.hidden = index === 0;
    skipBtn.hidden = step.key !== "budget";
    nextBtn.textContent = step.type === "details" ? "Submit" : "Next";
    nextBtn.disabled = false;

    const showTiles = step.type !== "details";
    tilesEl.hidden = !showTiles;
    detailsEl.hidden = showTiles;
    extraCampaign.hidden = !(step.key === "campaign" && state.campaignType === "Other");
    if (step.key === "location") updateLocationExtras();
    else extraLocation.hidden = true;

    if (showTiles) {
      tilesEl.replaceChildren();
      step.options.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "audit-tile" + (isOn(step, option) ? " on" : "");
        button.dataset.option = option;
        button.textContent = option;
        tilesEl.appendChild(button);
      });
    }

    renderProgress();
  }

  function choose(step, option) {
    if (step.type === "multi") {
      const current = new Set(state[step.field]);
      if (step.exclusive && option === step.exclusive) {
        state[step.field] = current.has(option) ? [] : [option];
      } else {
        current.delete(step.exclusive);
        if (current.has(option)) current.delete(option);
        else current.add(option);
        state[step.field] = [...current];
      }
    } else {
      state[step.field] = state[step.field] === option ? "" : option;
      if (step.key === "budget") state.skippedBudget = false;
    }
    if (step.key === "location") {
      if (state.locationCountry !== "Namibia") townSelect.value = "";
      if (state.locationCountry !== "Namibia" && state.locationCountry !== "Other country") {
        otherInput.value = "";
        state.locationOther = "";
      }
    }
    render();
  }

  function locationValue() {
    if (state.locationCountry === "Namibia") {
      const town = townSelect.value === "Other town" ? otherInput.value.trim() : townSelect.value;
      return town;
    }
    if (state.locationCountry === "Other country") {
      return otherInput.value.trim();
    }
    return "";
  }

  function validate() {
    const step = steps[index];
    if (step.type === "multi") {
      if (!state[step.field].length) return "Please choose at least one option.";
      return "";
    }
    if (step.key === "location") {
      if (!state.locationCountry) return "Please choose where you are located.";
      if (state.locationCountry === "Namibia") {
        if (!townSelect.value) return "Please choose a Namibian town.";
        if (townSelect.value === "Other town" && !otherInput.value.trim()) return "Please enter your town.";
      }
      if (state.locationCountry === "Other country" && !otherInput.value.trim()) {
        return "Please enter your country.";
      }
      return "";
    }
    if (step.key === "campaign") {
      if (!state.campaignType) return "Please choose a campaign type.";
      if (state.campaignType === "Other" && !campaignOther.value.trim()) {
        return "Please tell us what type of campaign you are planning.";
      }
      return "";
    }
    if (step.key === "budget") return "";
    if (step.type === "single" && !state[step.field]) return "Please choose an option to continue.";
    if (step.type === "details") {
      const name = field("name");
      const email = field("email");
      const telephone = field("telephone");
      const company = field("company");
      const campaignName = field("campaignName");
      if (!name) return "Name is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
      if (!telephone) return "Telephone is required.";
      if (!company) return "Company you represent is required.";
      if (!campaignName) return "Campaign name is required.";
    }
    return "";
  }

  function field(id) {
    return (document.getElementById(id)?.value || "").trim();
  }

  function payload() {
    const locationTown = locationValue();
    const location = state.locationCountry === "Namibia"
      ? `${locationTown}, Namibia`
      : state.locationCountry === "South Africa"
        ? "South Africa"
        : locationTown;
    return {
      name: field("name"),
      email: field("email"),
      telephone: field("telephone"),
      company: field("company"),
      campaignName: field("campaignName"),
      additionalDetails: field("additionalDetails"),
      location,
      locationCountry: state.locationCountry,
      locationTown,
      otherTown: state.locationCountry === "Namibia" && townSelect.value === "Other town" ? otherInput.value.trim() : "",
      otherCountry: state.locationCountry === "Other country" ? otherInput.value.trim() : "",
      businessDescription: state.businessDescription,
      campaignType: state.campaignType,
      campaignTypeOther: state.campaignType === "Other" ? campaignOther.value.trim() : "",
      primaryAudience: state.primaryAudience,
      currentAdvertising: state.currentAdvertising,
      advertiseTimeline: state.advertiseTimeline,
      advertisingBudget: state.skippedBudget ? "" : state.advertisingBudget
    };
  }

  async function submit() {
    nextBtn.disabled = true;
    nextBtn.textContent = "Sending…";
    try {
      const response = await fetch(`${API_BASE}/api/media-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload())
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not submit your media audit. Please try again.");
      }
      form.hidden = true;
      doneEl.hidden = false;
      doneEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setError(error.message || "Could not submit your media audit. Please try again.");
      nextBtn.disabled = false;
      nextBtn.textContent = "Submit";
    }
  }

  function goNext() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    if (steps[index].type === "details") {
      submit();
      return;
    }
    index += 1;
    render();
  }

  tilesEl.addEventListener("click", event => {
    const button = event.target.closest(".audit-tile");
    if (!button) return;
    choose(steps[index], button.dataset.option);
  });

  townSelect.addEventListener("change", () => {
    state.namibiaTown = townSelect.value;
    if (townSelect.value !== "Other town") otherInput.value = "";
    updateLocationExtras();
    setError("");
  });

  otherInput.addEventListener("input", () => {
    state.locationOther = otherInput.value;
    setError("");
  });

  campaignOther.addEventListener("input", () => setError(""));

  backBtn.addEventListener("click", () => {
    if (index === 0) return;
    index -= 1;
    render();
  });

  nextBtn.addEventListener("click", goNext);

  skipBtn.addEventListener("click", () => {
    state.advertisingBudget = "";
    state.skippedBudget = true;
    index += 1;
    render();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    goNext();
  });

  render();
})();
