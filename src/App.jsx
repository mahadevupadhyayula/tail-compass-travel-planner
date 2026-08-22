import React, { useEffect, useMemo, useState } from "react";
import brandLogo from "./assets/tail-and-compass-logo.png";
import beagleLoader from "./assets/tail-compass-beagle-loader.svg";
import landingReference from "../Tail Compass Itinerary Mockups/01-landing-page.png";
import evidenceRishikesh from "./assets/evidence-rishikesh.png";
import evidenceShimlaTrain from "./assets/evidence-shimla-train.png";
import evidenceManali from "./assets/evidence-manali.png";
import evidenceAlibaug from "./assets/evidence-alibaug.png";

const stages = ["Meet your copilot", "Shape the journey", "Check the details", "Build the itinerary", "Review & share"];

const transportModes = [
  {
    id: "road", icon: "R", name: "Road travel", label: "Compass pick", time: "12 hr 40 min", fit: "Best overall fit",
    summary: "Door-to-door flexibility with calm breaks whenever Bruno needs them.",
    reasons: ["No carrier weight restriction", "Three pet-friendly rest stops", "Easiest for a high-energy dog"],
    policy: { status: "Ready", tone: "good", title: "No operator pet restriction", detail: "You control the vehicle and rest schedule. Keep vaccination records and plan a break every 2–3 hours." }
  },
  {
    id: "air", icon: "A", name: "Air travel", label: "Fastest", time: "1 hr 30 min", fit: "Possible with changes",
    summary: "Quickest journey, but Bruno’s combined weight requires cargo handling.",
    reasons: ["Air India has a published pet policy", "24 kg exceeds cabin allowance", "Crate and advance approval required"],
    policy: { status: "Action needed", tone: "warn", title: "Cargo travel is the likely route", detail: "Bruno is above the stated cabin band. Confirm crate dimensions, temperature restrictions and space with the airline before booking." }
  },
  {
    id: "rail", icon: "T", name: "Rail travel", label: "More space", time: "15 hr 15 min", fit: "Needs confirmation",
    summary: "A relaxed pace, subject to coupe availability and current railway rules.",
    reasons: ["More room than a flight", "Private coupe may be required", "Policy needs operator confirmation"],
    policy: { status: "Verify first", tone: "neutral", title: "Rail permission isn’t confirmed", detail: "Request a First AC coupe and verify the current pet process directly with Indian Railways before paying." }
  }
];

const stays = [
  { id: "garden", name: "Goa Garden House", area: "Assagao", price: "₹6,200 / night", score: "Strong match", note: "Private garden · large dogs welcomed", selected: true },
  { id: "casa", name: "Casa Maré", area: "Morjim", price: "₹7,800 / night", score: "Good match", note: "Beach access · pets up to 30 kg" }
];

const activities = [
  { id: "beach", name: "Sunrise walk at Morjim", meta: "Low crowds · 6:30 AM", tag: "Great for Bruno" },
  { id: "cafe", name: "Garden brunch", meta: "Outdoor seating · Assagao", tag: "Pet-welcoming" },
  { id: "trail", name: "Chapora riverside trail", meta: "Shaded route · 5:00 PM", tag: "Easy pace" }
];

const baseItinerary = [
  { day: "Day 1", date: "12 Dec", title: "The easy journey in", items: ["7:00 AM · Leave Hyderabad", "10:00 AM · Water and stretch break", "1:00 PM · Pet-friendly lunch stop", "7:30 PM · Check in at Goa Garden House"] },
  { day: "Day 2", date: "13 Dec", title: "Goa at Bruno’s pace", items: ["6:30 AM · Sunrise walk at Morjim", "9:30 AM · Garden brunch in Assagao", "1:00 PM · Rest at the stay", "5:00 PM · Chapora riverside trail"] },
  { day: "Day 3", date: "14 Dec", title: "A calm trip home", items: ["8:00 AM · Breakfast and packing", "10:30 AM · Check out", "1:00 PM · Shaded lunch break", "9:00 PM · Arrive in Hyderabad"] }
];

const initialTraveller = { name: "", email: "", ownerPhotoName: "", ownerPhotoPath: "", ownerPhotoUpload: null, petName: "", petPhotoName: "", petPhotoPath: "", petPhotoUpload: null, petType: "", breedChoice: "", breed: "", customBreed: "", weightBand: "", weight: "", vaccination: "", vaccinationDate: "", careProfile: "", from: "Hyderabad", to: "Goa", start: "2026-12-12", end: "2026-12-14", purpose: "relax" };

function preparePhotoUpload(file) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return Promise.reject(new Error("Choose a JPEG, PNG, or WebP photo."));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error("Each photo must be smaller than 10 MB."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
    reader.onerror = () => reject(new Error("The selected photo could not be read."));
    reader.readAsDataURL(file);
  });
}

async function readApiResponse(response, fallback) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(response.ok ? fallback : `The server endpoint is unavailable (${response.status}). Redeploy the latest backend changes.`);
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

function createPdf(lines) {
  const safe = value => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "-");
  const content = ["BT", "/F1 11 Tf", "52 780 Td", "15 TL", ...lines.flatMap((line, index) => index ? [`T* (${safe(line)}) Tj`] : [`(${safe(line)}) Tj`]), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n ").join("\n")}\n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function RecentItinerariesMenu() {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: "idle", items: [] });

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setState(current => ({ ...current, status: "loading" }));
    fetch("/api/recent-itineraries", { signal: controller.signal })
      .then(async response => {
        const result = await readApiResponse(response, "Could not load recent itineraries.");
        setState({ status: "ready", items: result.itineraries || [] });
      })
      .catch(error => {
        if (error.name !== "AbortError") setState({ status: "error", items: [] });
      });
    return () => controller.abort();
  }, [open, attempt]);

  return <div className={`recent-menu ${open ? "open" : ""}`}>
    <button className="recent-trigger" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>Recent itineraries <span>⌄</span></button>
    {open && <div className="recent-popover" role="dialog" aria-label="Recent itineraries">
      <div className="recent-popover-head"><div><span>RECENT JOURNEYS</span><h2>Freshly planned</h2></div><button type="button" aria-label="Close recent itineraries" onClick={() => setOpen(false)}>×</button></div>
      {state.status === "loading" && <p className="recent-message">Checking the latest plans…</p>}
      {state.status === "error" && <div className="recent-message"><strong>Couldn’t load recent plans.</strong><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
      {state.status === "ready" && !state.items.length && <p className="recent-message">No published itineraries yet. Curated journeys will appear here.</p>}
      {state.items.map(item => <article className="recent-card" key={item.id}>
        <div className="recent-route"><span>{item.travelMode || "trip"}</span><strong>{item.title}</strong></div>
        <p>{item.route}{item.petSummary ? ` · ${item.petSummary}` : ""}</p>
        <small>{item.dateLabel}{item.staySummary ? ` · ${item.staySummary}` : ""}</small>
      </article>)}
      <p className="recent-privacy">Only deliberately published summaries appear here. Traveler details and itinerary files remain private.</p>
    </div>}
  </div>;
}

function PublicHeader({ page, onHome, onStart, onEvidence }) {
  return <header className="public-header">
    <button className="public-brand" type="button" onClick={onHome} aria-label="Tails and Compass home"><span className="public-logo"><img src={brandLogo} alt="" /></span><span>Tails &amp; Compass</span></button>
    <nav aria-label="Main navigation"><button className={page === "landing" ? "active" : ""} type="button" onClick={onHome}>How it works</button><button className={page === "evidence" ? "active" : ""} type="button" onClick={onEvidence}>Evidence</button></nav>
    <div className="public-header-actions"><RecentItinerariesMenu /><button className="public-start" type="button" onClick={onStart}>Plan with your pet</button></div>
  </header>;
}

function MockupCrop({ source, className, alt }) {
  return <div className={`mockup-crop ${className}`}><img src={source} alt={alt} /></div>;
}

function LandingPage({ onStart, onEvidence }) {
  return <div className="public-page landing-page">
    <PublicHeader page="landing" onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })} onStart={onStart} onEvidence={onEvidence} />
    <main>
      <section className="landing-hero">
        <div className="landing-copy"><span className="landing-pill">● Dogs and cats · thoughtful trips together</span><h1>Which trips can you confidently take with your pet?</h1><p>Tails &amp; Compass turns pet policies, travel choices and your companion’s needs into one calm, guided plan.</p><div className="landing-actions"><button className="primary-button" type="button" onClick={onStart}>Tell us about your trip</button><button className="outline-button" type="button" onClick={onEvidence}>See the evidence</button></div></div>
        <MockupCrop source={landingReference} className="landing-hero-photo" alt="A dog and cat overlooking a mountain lake with their travel bag" />
      </section>
      <section className="landing-guidance"><div><span className="section-eyebrow">GUIDANCE, NOT GUESSWORK</span><h2>Start with your trip, not the paperwork.</h2><p>Share the people, pets and places involved. Compass then narrows the route, stay and activities before checking the details that matter.</p></div><div className="guidance-steps"><article><b>1</b><h3>Meet your copilot</h3><p>Add your name, email and optional photos of you and your pet.</p></article><article><b>2</b><h3>Shape the journey</h3><p>Describe the route, purpose, dates and preferred way to travel.</p></article><article><b>3</b><h3>Travel with clarity</h3><p>Review pet policies and receive a personalized itinerary.</p></article></div></section>
      <section className="landing-bottom-cta"><div><span>✦</span><div><h2>More joy. Less worry.</h2><p>A guided happy path for air, rail and road travel with dogs and cats.</p></div></div><button className="primary-button" type="button" onClick={onStart}>Start planning</button></section>
    </main>
  </div>;
}

const evidenceStories = [
  { image: evidenceShimlaTrain, title: "Miso’s first train ride", quote: "A quieter departure, a familiar carrier and planned platform breaks turned an uncertain rail day into a calm first journey.", place: "Shimla", type: "Rail journey", outcome: "Fewer stressful transitions" },
  { image: evidenceManali, title: "Bruno finds his mountain rhythm", quote: "Short walks, recovery time and a stay with outdoor space made the mountains rewarding without exhausting Bruno.", place: "Manali", type: "Road getaway", outcome: "A schedule built around rest" },
  { image: evidenceAlibaug, title: "A cooler weekend by the sea", quote: "Early walks and shaded afternoon plans kept the hottest hours quiet—and left sunset for the best shared moment.", place: "Alibaug", type: "Beach break", outcome: "Heat-aware daily planning" }
];

function EvidencePage({ onStart, onHome }) {
  return <div className="public-page evidence-page">
    <PublicHeader page="evidence" onHome={onHome} onStart={onStart} onEvidence={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    <main>
      <section className="evidence-intro"><div><span className="section-eyebrow">ILLUSTRATIVE TRAVEL STORIES</span><h1>Better trips begin before departure</h1><p>These demo journeys show what changes when a pet’s size, health, temperament and pace shape the plan from the beginning.</p><p className="evidence-disclaimer">Illustrative scenarios for the MVP—not customer testimonials or measured clinical outcomes.</p></div><article className="featured-story"><img className="evidence-photo" src={evidenceRishikesh} alt="A traveler and golden retriever walking beside the river in Rishikesh" /><div><span>FEATURED JOURNEY · ROAD</span><h2>A slower road to Rishikesh</h2><p>Rudi’s route traded one long push for a gentler arrival, with water breaks, a quiet riverside stay and walks outside the busiest hours.</p><strong className="story-outcome">Result: less rushing, more predictable rest</strong><button className="outline-button" type="button" onClick={onStart}>Plan a similar trip →</button></div></article></section>
      <section className="evidence-grid" aria-label="Illustrative pet travel stories">{evidenceStories.map(story => <article key={story.title}><img className="evidence-photo" src={story.image} alt={`${story.title} in ${story.place}`} /><div><small className="story-kicker">{story.place} · {story.type}</small><h2>{story.title}</h2><p>{story.quote}</p><strong>{story.outcome}</strong></div></article>)}</section>
      <section className="evidence-facts"><span className="section-eyebrow">WHAT TAILS &amp; COMPASS CHANGES</span><div><article><strong>Constraints surface early</strong><p>Size, vaccination, carrier and special-care details enter the decision before a route is shortlisted.</p></article><article><strong>The day follows the pet</strong><p>Rest windows, temperature, stimulation and walking preferences influence the itinerary—not just the destination.</p></article><article><strong>Policies become decisions</strong><p>Published transport and stay requirements are translated into clear checks before approval.</p></article></div></section>
      <section className="evidence-cta"><div><h2>Your next good story starts with a thoughtful plan.</h2><p>Tell Compass about your pet and the journey you have in mind.</p></div><button className="primary-button" type="button" onClick={onStart}>Tell us about your trip</button></section>
    </main>
  </div>;
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [step, setStep] = useState(0);
  const [traveller, setTraveller] = useState(initialTraveller);
  const [catalog, setCatalog] = useState({ source: "loading", transportOptions: [], stays: [], purposes: [], vaccinationRequirements: [] });
  const [mode, setMode] = useState("road");
  const [operatorId, setOperatorId] = useState("private-road");
  const [stay, setStay] = useState("garden-house");
  const [selectedActivities, setSelectedActivities] = useState(["beach", "cafe", "trail"]);
  const [reviewed, setReviewed] = useState(false);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState("idle");
  const [note, setNote] = useState("Keep each day unhurried and leave room for Bruno’s afternoon rest.");
  const [recordIds, setRecordIds] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [jobAccessToken, setJobAccessToken] = useState("");
  const [generationJob, setGenerationJob] = useState({ status: "idle", progress: 0, status_message: "" });

  useEffect(() => setEmail(traveller.email), [traveller.email]);

  const selectedMode = transportModes.find(item => item.id === mode);
  useEffect(() => {
    fetch("/api/catalog").then(response => response.json()).then(setCatalog).catch(() => setCatalog(current => ({ ...current, source: "unavailable" })));
  }, []);

  useEffect(() => {
    const jobId = recordIds.generationJobId;
    if (step !== 4 || !jobId || !jobAccessToken) return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const response = await fetch(`/api/generation-job?id=${encodeURIComponent(jobId)}&token=${encodeURIComponent(jobAccessToken)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not check itinerary progress.");
        if (cancelled) return;
        setGenerationJob(result);
        if (!["completed", "failed", "cancelled"].includes(result.status)) timer = window.setTimeout(poll, 2500);
      } catch (error) {
        if (!cancelled) setGenerationJob(current => ({ ...current, status: "poll_error", error_message: error.message }));
      }
    };
    poll();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [step, recordIds.generationJobId, jobAccessToken]);

  const catalogStays = catalog.stays.length ? catalog.stays : stays.map(item => ({ ...item, summary: item.note, verification_status: "DEMO" }));
  const selectedStay = catalogStays.find(item => item.id === stay) || catalogStays[0];
  const selectedOperator = catalog.transportOptions.find(item => item.id === operatorId);
  const purposeLabel = catalog.purposes.find(item => item.id === traveller.purpose)?.label || traveller.purpose;
  const chosenActivities = activities.filter(item => selectedActivities.includes(item.id));
  const itinerary = useMemo(() => baseItinerary.map((day, index) => index === 0
    ? { ...day, items: day.items.map(item => item.replace("Leave Hyderabad", `Leave ${traveller.from}`).replace("Goa Garden House", selectedStay.name)) }
    : day), [traveller.from, selectedStay]);

  const update = key => event => setTraveller(current => ({ ...current, [key]: event.target.value }));
  const go = next => { setStep(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { setScreen("landing"); setStep(0); setTraveller(initialTraveller); setMode("road"); setOperatorId("private-road"); setStay("garden-house"); setSelectedActivities(["beach", "cafe", "trail"]); setReviewed(false); setEmailState("idle"); setRecordIds({}); setSaveState("idle"); setSaveError(""); setJobAccessToken(""); setGenerationJob({ status: "idle", progress: 0, status_message: "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startPlanner = () => { setScreen("planner"); setStep(0); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const showEvidence = () => { setScreen("evidence"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggleActivity = id => setSelectedActivities(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  async function persistJourney(stage, nextStep) {
    setSaveState("saving");
    setSaveError("");
    try {
      const response = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          ids: recordIds,
          traveller,
          photos: { owner: traveller.ownerPhotoUpload, pet: traveller.petPhotoUpload },
          trip: { from: traveller.from, to: traveller.to, start: traveller.start, end: traveller.end, purpose: traveller.purpose },
          selections: { mode, operatorId, stayId: stay, activityIds: selectedActivities },
          itinerary: stage === "itinerary" || stage === "approved" ? { days: itinerary } : null,
          note
        })
      });
      const result = await readApiResponse(response, "Your journey could not be saved.");
      setRecordIds(current => ({ ...current, ...(result.ids || {}) }));
      if (result.ids?.ownerPhotoPath || result.ids?.petPhotoPath) {
        setTraveller(current => ({
          ...current,
          ownerPhotoPath: result.ids.ownerPhotoPath || current.ownerPhotoPath,
          petPhotoPath: result.ids.petPhotoPath || current.petPhotoPath,
          ownerPhotoUpload: result.ids.ownerPhotoPath ? null : current.ownerPhotoUpload,
          petPhotoUpload: result.ids.petPhotoPath ? null : current.petPhotoUpload
        }));
      }
      if (stage === "approved") {
        setJobAccessToken(result.jobAccessToken || "");
        setGenerationJob({ status: "queued", progress: 0, status_message: "Preparing your journey" });
      }
      setSaveState(result.persisted ? "supabase" : "local-demo");
      go(nextStep);
    } catch (error) {
      setSaveState("error");
      setSaveError(error.message || "Your journey could not be saved.");
    }
  }

  function sendEmail() {
    setEmailState("sending");
    window.setTimeout(() => setEmailState("sent"), 850);
  }

  function downloadPdf() {
    const lines = [
      `TAIL AND COMPASS - ${traveller.petName}'s ${traveller.to} itinerary`,
      `${traveller.from} to ${traveller.to} | ${traveller.start} to ${traveller.end}`,
      `Travel: ${selectedMode.name} | Stay: ${selectedStay.name}`,
      "",
      ...itinerary.flatMap(day => [day.day + " - " + day.title, ...day.items.map(item => "  " + item), ""]),
      "Note: " + note,
      "Demo itinerary - verify policies and availability before booking."
    ];
    const url = URL.createObjectURL(createPdf(lines));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tail-and-compass-${traveller.petName.toLowerCase()}-${traveller.to.toLowerCase()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (screen === "landing") return <LandingPage onStart={startPlanner} onEvidence={showEvidence} />;
  if (screen === "evidence") return <EvidencePage onStart={startPlanner} onHome={() => setScreen("landing")} />;

  return (
    <div className="concierge-app">
      <header className="topbar">
        <button className="wordmark" type="button" onClick={reset} aria-label="Tails and Compass home">
          <span className="logo-crop"><img src={brandLogo} alt="" /></span><span>Tails &amp; Compass<small>Pet travel, thoughtfully planned</small></span>
        </button>
        <div className="header-actions"><span className="saved"><i />{saveState === "saving" ? "Saving journey…" : saveState === "supabase" ? "Journey saved to Supabase" : saveState === "local-demo" ? "Demo journey saved locally" : saveState === "error" ? "Save needs attention" : "Journey not saved yet"}</span><RecentItinerariesMenu /><button className="quiet-button" type="button" onClick={reset}>Start over</button></div>
      </header>

      <main className="journey-shell">
        <JourneyRail step={step} />
        <section className="workspace" aria-live="polite">
          <div className="step-kicker"><span>Step {step + 1} of 5</span><b>{step < 4 ? "Compass is guiding this step" : "Ready when you are"}</b></div>
          {step === 0 && <MeetStep traveller={traveller} update={update} setTraveller={setTraveller} onNext={() => persistJourney("profile", 1)} />}
          {step === 1 && <ShapeStep traveller={traveller} update={update} mode={mode} setMode={value => { setMode(value); const first = catalog.transportOptions.find(item => item.mode === value); if (first) setOperatorId(first.id); }} operatorId={operatorId} setOperatorId={setOperatorId} catalog={catalog} catalogStays={catalogStays} stay={stay} setStay={setStay} selectedActivities={selectedActivities} toggleActivity={toggleActivity} onBack={() => go(0)} onNext={() => persistJourney("trip", 2)} />}
          {step === 2 && <CheckStep traveller={traveller} mode={selectedMode} operator={selectedOperator} stay={selectedStay} activities={chosenActivities} onBack={() => go(1)} onNext={() => persistJourney("itinerary", 3)} />}
          {step === 3 && <ItineraryStep traveller={{ ...traveller, purpose: purposeLabel }} mode={selectedMode} stay={selectedStay} itinerary={itinerary} note={note} setNote={setNote} reviewed={reviewed} setReviewed={setReviewed} onBack={() => go(2)} onNext={() => persistJourney("approved", 4)} />}
          {step === 4 && <ShareStep traveller={traveller} mode={selectedMode} stay={selectedStay} generationJob={generationJob} onRetry={() => persistJourney("approved", 4)} onBack={() => go(3)} />}
          {saveError && <p className="trust-line" role="alert">{saveError} Please try again.</p>}
          {!saveError && <p className="trust-line">Guided demo · Seeded recommendations · No booking or payment will be made</p>}
        </section>
      </main>
    </div>
  );
}

function JourneyRail({ step }) {
  return <aside className="journey-rail" aria-label="Trip planning progress">
    <p className="rail-label">Your journey</p>
    <ol>{stages.map((stage, index) => <li className={index === step ? "active" : index < step ? "done" : ""} key={stage}><span>{index < step ? "✓" : index + 1}</span><div><strong>{stage}</strong><small>{index === step ? "In progress" : index < step ? "Complete" : "Up next"}</small></div></li>)}</ol>
    <div className="rail-note"><span>✦</span><div><strong>Compass is with you</strong><p>I’ll explain every recommendation. You make every final choice.</p></div></div>
  </aside>;
}

function AssistantHeading({ eyebrow, title, accent, children }) {
  return <div className="assistant-intro"><div className="assistant-avatar">✦</div><div><p className="assistant-name">Compass · {eyebrow}</p><h1>{title} <em>{accent}</em></h1><p>{children}</p></div></div>;
}

function StepActions({ onBack, onNext, nextLabel, disabled }) {
  return <div className="step-actions">{onBack && <button className="back-button" type="button" onClick={onBack}>← Back</button>}<button className="primary-button" type="button" onClick={onNext} disabled={disabled}>{nextLabel}<span>→</span></button></div>;
}

function MeetStep({ traveller, update, setTraveller, onNext }) {
  const [profileStep, setProfileStep] = useState(0);
  const [photoPreview, setPhotoPreview] = useState("");
  const [petPhotoPreview, setPetPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const dogBreeds = ["Golden Retriever", "Labrador Retriever", "Beagle", "German Shepherd", "Indian Pariah Dog", "Shih Tzu", "Pomeranian", "Other"];
  const catBreeds = ["Domestic Shorthair", "Persian", "Siamese", "Maine Coon", "Bengal", "Ragdoll", "Indian Billi", "Other"];
  const breeds = traveller.petType === "Cat" ? catBreeds : dogBreeds;
  const weightBands = [
    { id: "small", label: "Small", range: "Up to 10 kg", weight: "8" },
    { id: "medium", label: "Medium", range: "10–20 kg", weight: "15" },
    { id: "large", label: "Large", range: "20–45 kg", weight: "24" }
  ];
  const chooseBreed = event => {
    const breedChoice = event.target.value;
    setTraveller(current => ({ ...current, breedChoice, breed: breedChoice === "Other" ? current.customBreed : breedChoice }));
  };
  const chooseWeight = band => setTraveller(current => ({ ...current, weightBand: band.id, weight: band.weight }));
  const choosePhoto = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const upload = await preparePhotoUpload(file);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(file));
      setTraveller(current => ({ ...current, ownerPhotoName: file.name, ownerPhotoUpload: upload }));
      setPhotoError("");
    } catch (error) {
      setPhotoError(error.message);
      event.target.value = "";
    }
  };
  const choosePetPhoto = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const upload = await preparePhotoUpload(file);
      if (petPhotoPreview) URL.revokeObjectURL(petPhotoPreview);
      setPetPhotoPreview(URL.createObjectURL(file));
      setTraveller(current => ({ ...current, petPhotoName: file.name, petPhotoUpload: upload }));
      setPhotoError("");
    } catch (error) {
      setPhotoError(error.message);
      event.target.value = "";
    }
  };
  const nextCard = () => setProfileStep(current => Math.min(current + 1, 5));
  const previousCard = () => setProfileStep(current => Math.max(current - 1, 0));

  return <>
    <AssistantHeading eyebrow="your AI concierge" title="Let’s get to know" accent="both of you.">I’ll ask one small question at a time. Each answer helps me narrow the next decision without making this feel like a long form.</AssistantHeading>
    <div className="profile-progress" aria-label={`Profile question ${profileStep + 1} of 6`}><span>Getting to know you · {profileStep + 1} of 6</span><div>{[0,1,2,3,4,5].map(index => <i className={index <= profileStep ? "filled" : ""} key={index} />)}</div></div>
    <div className="conversation-card guided-card" key={profileStep}>
      {profileStep === 0 && <div className="guided-question">
        <span className="chat-label">First, a little about you</span><h2>Who am I planning this journey with?</h2><p>Your email will be used for the itinerary handoff later. Your photo stays on this device in demo mode.</p>
        <div className="owner-grid"><label><span>Your name</span><input value={traveller.name} onChange={update("name")} /></label><label><span>Email address</span><input type="email" value={traveller.email} onChange={update("email")} /></label></div>
        <label className="photo-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} /><span className="photo-preview">{photoPreview ? <img src={photoPreview} alt="Your selected profile" /> : <b>+</b>}</span><span><strong>{traveller.ownerPhotoName || "Attach your photo (optional)"}</strong><small>Stored privately for personalised itinerary images</small></span></label>
        {photoError && <small className="error-copy" role="alert">{photoError}</small>}
        <StepActions onNext={nextCard} nextLabel="Meet my pet" disabled={!traveller.name || !/^\S+@\S+\.\S+$/.test(traveller.email)} />
      </div>}
      {profileStep === 1 && <div className="guided-question">
        <span className="chat-label">Now, your travel companion</span><h2>Who’s coming along, {traveller.name}?</h2><p>I support dog and cat journeys in this first happy path.</p>
        <label><span>Pet’s name</span><input value={traveller.petName} onChange={update("petName")} /></label>
        <div className="pet-type-grid">{["Dog", "Cat"].map(type => <button type="button" key={type} className={traveller.petType === type ? "pet-choice selected" : "pet-choice"} onClick={() => setTraveller(current => ({ ...current, petType: type, breedChoice: type === "Cat" ? "Domestic Shorthair" : "Golden Retriever", breed: type === "Cat" ? "Domestic Shorthair" : "Golden Retriever", vaccination: type === "Cat" ? "Rabies + FVRCP" : "Rabies + DHPP" }))}><span>{type === "Dog" ? "D" : "C"}</span><strong>{type}</strong><small>{type === "Dog" ? "Dog-friendly routes and policies" : "Carrier-aware, quieter options"}</small></button>)}</div>
        <label className="photo-upload pet-photo-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePetPhoto} /><span className="photo-preview">{petPhotoPreview ? <img src={petPhotoPreview} alt={`${traveller.petName || "Pet"} selected profile`} /> : <b>+</b>}</span><span><strong>{traveller.petPhotoName || `Attach ${traveller.petName ? `${traveller.petName}’s` : "your pet’s"} photo (optional)`}</strong><small>Stored privately for personalised itinerary images; generic imagery is used if omitted</small></span></label>
        {photoError && <small className="error-copy" role="alert">{photoError}</small>}
        <StepActions onBack={previousCard} onNext={nextCard} nextLabel="Choose a breed" disabled={!traveller.petName || !traveller.petType} />
      </div>}
      {profileStep === 2 && <div className="guided-question">
        <span className="chat-label">About {traveller.petName}</span><h2>What breed is {traveller.petName}?</h2><p>I’ll use this only where an operator or stay publishes a breed-specific rule.</p>
        <label><span>{traveller.petType} breed</span><select value={traveller.breedChoice} onChange={chooseBreed}><option value="" disabled>Select a breed</option>{breeds.map(breed => <option key={breed}>{breed}</option>)}</select></label>
        {traveller.breedChoice === "Other" && <label className="custom-breed"><span>Enter the breed</span><input autoFocus value={traveller.customBreed} onChange={event => setTraveller(current => ({ ...current, customBreed: event.target.value, breed: event.target.value }))} placeholder={`Your ${traveller.petType.toLowerCase()}’s breed`} /></label>}
        <StepActions onBack={previousCard} onNext={nextCard} nextLabel="Choose a size" disabled={!traveller.breed} />
      </div>}
      {profileStep === 3 && <div className="guided-question">
        <span className="chat-label">A simpler weight question</span><h2>Which size feels right for {traveller.petName}?</h2><p>Choose the closest range. You can refine the exact weight later if an operator needs it.</p>
        <div className="weight-grid">{weightBands.map(band => <button type="button" key={band.id} className={traveller.weightBand === band.id ? "weight-choice selected" : "weight-choice"} onClick={() => chooseWeight(band)}><span className={`pet-scale ${band.id}`}>●</span><strong>{band.label}</strong><small>{band.range}</small></button>)}</div>
        <div className="why-note"><span>Compass note</span><p>I’ll use an estimated {traveller.weight} kg for the demo match and clearly ask for an exact weight before any real booking action.</p></div>
        <StepActions onBack={previousCard} onNext={nextCard} nextLabel="Add vaccinations" disabled={!traveller.weightBand} />
      </div>}
      {profileStep === 4 && <div className="guided-question">
        <span className="chat-label">Health documents</span><h2>What are {traveller.petName}’s latest vaccinations?</h2><p>Travel and stay providers often ask for current certificates. I’ll flag recency, not make a medical judgment.</p>
        <div className="mini-grid"><label><span>Most recent vaccinations</span><input value={traveller.vaccination} onChange={update("vaccination")} placeholder={traveller.petType === "Cat" ? "e.g. Rabies + FVRCP" : "e.g. Rabies + DHPP"} /></label><label><span>Most recent date</span><input type="date" value={traveller.vaccinationDate} onChange={update("vaccinationDate")} /></label></div>
        <StepActions onBack={previousCard} onNext={nextCard} nextLabel="Set care profile" disabled={!traveller.vaccination || !traveller.vaccinationDate} />
      </div>}
      {profileStep === 5 && <div className="guided-question">
        <span className="chat-label">One last profile detail</span><h2>What kind of support does {traveller.petName} need?</h2><p>This changes accessibility, veterinary proximity and service-animal checks later in the journey.</p>
        <div className="care-grid">{[{id:"standard",label:"Standard travel needs",copy:"Regular breaks and pet-friendly access"},{id:"special_needs",label:"Special health or mobility needs",copy:"Medication, mobility or quieter pacing"},{id:"service_animal",label:"Service animal",copy:"Assistance-animal policy review"}].map(item => <button type="button" className={traveller.careProfile === item.id ? "care-choice selected" : "care-choice"} key={item.id} onClick={() => setTraveller(current => ({ ...current, careProfile: item.id }))}><span>{traveller.careProfile === item.id ? "✓" : ""}</span><div><strong>{item.label}</strong><small>{item.copy}</small></div></button>)}</div>
        <div className="profile-recap"><span>✦</span><p><strong>Profile ready:</strong> {traveller.petName} is a {traveller.weightBand} {traveller.petType.toLowerCase()} · {traveller.breed} · vaccination date {traveller.vaccinationDate}.</p></div>
        <StepActions onBack={previousCard} onNext={onNext} nextLabel={`Plan with ${traveller.petName}`} disabled={!traveller.careProfile} />
      </div>}
    </div>
  </>;
}

function ShapeStep({ traveller, update, mode, setMode, operatorId, setOperatorId, catalog, catalogStays, stay, setStay, selectedActivities, toggleActivity, onBack, onNext }) {
  return <>
    <AssistantHeading eyebrow="trip designer" title={`Great. Now let’s shape ${traveller.petName}’s`} accent="best journey.">I’ve used your route, dates and pet profile to rank three ways to travel. The recommendation updates when you change a choice.</AssistantHeading>
    <div className="conversation-card wide-card">
      <div className="section-label"><span>01</span><div><strong>Where and why?</strong><small>This sets the pace of the itinerary.</small></div></div>
      <div className="trip-grid"><label><span>From</span><input value={traveller.from} onChange={update("from")} /></label><label><span>Destination</span><input value={traveller.to} onChange={update("to")} /></label><label><span>Start</span><input type="date" value={traveller.start} onChange={update("start")} /></label><label><span>Return</span><input type="date" value={traveller.end} onChange={update("end")} /></label></div>
      <label className="full-field"><span>Purpose of the stay</span><select value={traveller.purpose} onChange={update("purpose")}>{(catalog.purposes.length ? catalog.purposes : [{id:"relax",label:"A relaxed coastal break"},{id:"family",label:"A family visit"},{id:"workation",label:"A quiet workation"},{id:"outdoor",label:"An outdoor adventure"},{id:"care",label:"A care-focused stay"}]).map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      <div className="assistant-nudge"><span>✦</span><p><strong>My read:</strong> For a {traveller.weightBand} {traveller.petType.toLowerCase()} with a {traveller.careProfile.replaceAll("_", " ")} profile, road travel currently gives you the most control and the fewest policy hurdles.</p></div>

      <div className="section-label spaced"><span>02</span><div><strong>How should you travel?</strong><small>Choose any option—you’re always in control.</small></div></div>
      <div className="option-stack">{transportModes.map(item => <button type="button" className={mode === item.id ? "recommendation selected" : "recommendation"} key={item.id} onClick={() => setMode(item.id)}><span className="mode-icon">{item.icon}</span><span className="recommendation-copy"><span className="rec-top"><strong>{item.name}</strong><i>{item.label}</i></span><small>{item.summary}</small><span className="reason-row">{item.reasons.slice(0,2).map(reason => <b key={reason}>✓ {reason}</b>)}</span></span><span className="rec-meta"><strong>{item.time}</strong><small>{item.fit}</small><i>{mode === item.id ? "Selected" : "Choose"}</i></span></button>)}</div>
      <div className="operator-choices"><p className="sub-label">Available {mode} options · {catalog.source?.replaceAll("-", " ")}</p>{catalog.transportOptions.filter(item => item.mode === mode).map(item => <button type="button" className={operatorId === item.id ? "operator-option selected" : "operator-option"} onClick={() => setOperatorId(item.id)} key={item.id}><span><strong>{item.operator}</strong><small>{item.summary}</small></span><span><b>{item.handling}</b><small>{item.verification_status || item.status}</small></span></button>)}</div>

      <div className="section-label spaced"><span>03</span><div><strong>Stay and things to do</strong><small>Seeded options chosen for this demo journey.</small></div></div>
      <div className="two-column"><div><p className="sub-label">Choose a stay</p>{catalogStays.map(item => <button type="button" className={stay === item.id ? "compact-option selected" : "compact-option"} key={item.id} onClick={() => setStay(item.id)}><span><strong>{item.name}</strong><small>{item.area} · {item.summary || item.note}</small></span><span><b>{item.verification_status || item.status || "DEMO"}</b><small>{item.max_weight_kg ? `Up to ${item.max_weight_kg} kg` : "No demo weight cap"}</small></span></button>)}</div><div><p className="sub-label">Choose activities</p>{activities.map(item => <label className="compact-option check-option" key={item.id}><input type="checkbox" checked={selectedActivities.includes(item.id)} onChange={() => toggleActivity(item.id)} /><span><strong>{item.name}</strong><small>{item.meta}</small></span><b>{item.tag}</b></label>)}</div></div>
      <StepActions onBack={onBack} onNext={onNext} nextLabel="Check every policy" />
    </div>
  </>;
}

function CheckStep({ traveller, mode, operator, stay, activities, onBack, onNext }) {
  const vaccinationAge = traveller.vaccinationDate ? Math.floor((Date.now() - new Date(`${traveller.vaccinationDate}T00:00:00Z`).getTime()) / 86400000) : null;
  const vaccinationCurrent = vaccinationAge !== null && vaccinationAge >= 0 && vaccinationAge <= 365;
  return <>
    <AssistantHeading eyebrow="policy guide" title="I checked the choices that matter for" accent={`${traveller.petName}.`}>Here’s the plain-English version. I’ve separated what looks ready from what still needs a human confirmation.</AssistantHeading>
    <div className="conversation-card wide-card">
      <div className="check-summary"><div><span>COMPASS CHECK</span><strong>2 ready · 1 confirmation</strong><p>No hidden blockers found for this demo route.</p></div><div className="readiness-ring"><strong>86</strong><small>ready score</small></div></div>
      <PolicyCard kicker={operator?.operator || mode.name} title={mode.policy.title} status={mode.policy.status} tone={mode.policy.tone} detail={operator?.summary || mode.policy.detail} facts={mode.reasons} />
      <PolicyCard kicker="Vaccination check" title={vaccinationCurrent ? "Vaccination date is within the demo window" : "Vaccination date needs confirmation"} status={vaccinationCurrent ? "Current" : "Action needed"} tone={vaccinationCurrent ? "good" : "warn"} detail={`${traveller.vaccination || "Vaccination details not provided"} · most recent date ${traveller.vaccinationDate || "not provided"}.`} facts={["Demo recency window: 365 days", "Airlines, railways and stays can require different certificates", "Always verify the operator’s current document rules"]} />
      <PolicyCard kicker={stay.name} title={`${traveller.petName}’s stay profile looks compatible`} status="Ready" tone="good" detail={`${stay.name} is demo-labelled for ${traveller.petType.toLowerCase()} stays. The live flow will compare the exact weight and care profile against the property’s verified limits.`} facts={["Pet type is supported in the demo catalog", "Care profile will be included in confirmation", "Restaurant access needs confirmation"]} />
      <PolicyCard kicker="Selected activities" title={`Your activity plan fits ${traveller.petName}’s pace`} status="Ready with care" tone="good" detail="Morning and evening outdoor slots avoid the warmest part of the day. Keep the afternoon rest window." facts={activities.map(item => item.name)} />
      <div className="decision-box"><span>✦</span><div><strong>My recommendation</strong><p>Keep {mode.name.toLowerCase()}, {stay.name}, and the three low-pressure activities. Confirm the stay’s restaurant rule before paying.</p></div><button type="button" onClick={onNext}>Accept this plan</button></div>
      <StepActions onBack={onBack} onNext={onNext} nextLabel="Build my itinerary" />
    </div>
  </>;
}

function PolicyCard({ kicker, title, status, tone, detail, facts }) {
  return <article className="policy-card"><div className={`policy-mark ${tone}`}>{tone === "good" ? "✓" : tone === "warn" ? "!" : "?"}</div><div className="policy-main"><div className="policy-head"><span>{kicker}</span><b className={tone}>{status}</b></div><h2>{title}</h2><p>{detail}</p><details><summary>Why Compass reached this result</summary><ul>{facts.map(fact => <li key={fact}>{fact}</li>)}</ul><small>Seeded demo evidence · Verify with the operator before booking</small></details></div></article>;
}

function ItineraryStep({ traveller, mode, stay, itinerary, note, setNote, reviewed, setReviewed, onBack, onNext }) {
  return <>
    <AssistantHeading eyebrow="itinerary maker" title={`Here’s a calmer ${traveller.to} plan, built around`} accent={`${traveller.petName}.`}>I kept travel on the edges, cooler outdoor time in the mornings and evenings, and a real rest window each day.</AssistantHeading>
    <div className="conversation-card wide-card">
      <div className="plan-header"><div><span>YOUR DRAFT</span><h2>{traveller.to} · 3 days with {traveller.petName}</h2><p>{mode.name} · {stay.name} · {traveller.purpose}</p><small className="image-mode">{traveller.ownerPhotoName && traveller.petPhotoName ? "Personalised itinerary imagery from your selected photos" : `Generic ${traveller.petType.toLowerCase()} + ${mode.name.toLowerCase()} itinerary imagery`}</small></div><span className="draft-pill">Ready to review</span></div>
      <div className="itinerary-list">{itinerary.map((day, index) => <article className="day-plan" key={day.day}><div className="day-number"><strong>0{index + 1}</strong><span>{day.date}</span></div><div><p>{day.day}</p><h3>{day.title}</h3><ul>{day.items.map(item => <li key={item}><span />{item}</li>)}</ul></div><button type="button" aria-label={`Edit ${day.day}`}>Edit</button></article>)}</div>
      <label className="review-note"><span>A note for Compass</span><textarea value={note} onChange={event => setNote(event.target.value)} /><small>This note will travel with the itinerary when the n8n workflow is connected.</small></label>
      <label className="review-confirm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span><strong>I’ve reviewed this itinerary</strong><small>I understand policies and availability should be reconfirmed before booking.</small></span></label>
      <StepActions onBack={onBack} onNext={onNext} nextLabel="Approve" disabled={!reviewed} />
    </div>
  </>;
}

function ShareStep({ traveller, mode, stay, generationJob, onRetry, onBack }) {
  const [showItinerary, setShowItinerary] = useState(false);
  const waiting = ["queued", "processing", "generating_images", "rendering_pdf"].includes(generationJob.status);
  const completed = generationJob.status === "completed" && Boolean(generationJob.htmlViewerUrl);
  const failed = generationJob.status === "failed" || generationJob.status === "poll_error";
  const pdfUrl = generationJob.pdfDownloadUrl || "";
  const downloadName = `tail-and-compass-${traveller.petName}-${traveller.to}.pdf`;
  return <>
    <AssistantHeading eyebrow="ready to share" title={waiting ? "Compass is preparing" : completed ? "Your personalized journey is" : "Your journey is reviewed and"} accent={waiting ? "your journey." : "ready to go."}>{waiting ? "I’m creating the imagery and laying out your itinerary. You can stay right here while the Beagle keeps watch." : "I’ve packaged the choices, policy notes and itinerary into one clean travel plan."}</AssistantHeading>
    <div className="conversation-card wide-card">
      {waiting && <div className="generation-wait" role="status"><img src={beagleLoader} alt="Beagle wagging its tail while your itinerary is prepared" /><div><span>{generationJob.progress || 0}% complete</span><h2>{generationJob.status_message || "Preparing your journey"}</h2><div className="generation-progress"><i style={{ width: `${generationJob.progress || 0}%` }} /></div><p>You can keep this page open. The itinerary will appear automatically.</p></div></div>}
      {failed && <div className="generation-failed" role="alert"><span>!</span><div><h2>Compass hit a snag</h2><p>{generationJob.error_message || "The personalized itinerary could not be completed."}</p><button className="primary-button" type="button" onClick={onRetry}>Try again</button></div></div>}
      <div className="success-panel"><span>✓</span><div><small>APPROVED ITINERARY</small><h2>{traveller.petName}’s {traveller.to} escape</h2><p>{traveller.from} → {traveller.to} · {mode.name} · {stay.name}</p></div></div>
      {!showItinerary && <div className={`personalized-itinerary-gate ${completed ? "ready" : "pending"}`}>
        {completed ? <iframe title={`${traveller.petName} personalized itinerary preview`} src={generationJob.htmlViewerUrl} sandbox="" tabIndex="-1" aria-hidden="true" /> : <div className="itinerary-placeholder"><strong>TAIL &amp; COMPASS</strong><span>Your personalized itinerary is being prepared</span></div>}
        <div className="itinerary-gate-overlay">
          <span>PERSONALIZED ITINERARY</span>
          <h2>{traveller.petName}’s journey is ready</h2>
          <p>Open the complete travel plan or save a PDF copy.</p>
          <div className="itinerary-gate-actions">
            <button className="primary-button" type="button" onClick={() => setShowItinerary(true)} disabled={!completed}>View personalized itinerary</button>
            <a className={`outline-button ${pdfUrl ? "" : "disabled"}`} href={pdfUrl || undefined} download={downloadName} aria-disabled={!pdfUrl}>Download itinerary</a>
          </div>
        </div>
      </div>}
      {showItinerary && completed && <div className="personalized-itinerary-viewer">
        <div className="itinerary-viewer-bar"><div><span>PERSONALIZED ITINERARY</span><strong>{traveller.petName}’s {traveller.to} escape</strong></div><a className={`floating-download ${pdfUrl ? "" : "disabled"}`} href={pdfUrl || undefined} download={downloadName} aria-disabled={!pdfUrl}>Download PDF ↓</a></div>
        <iframe title={`${traveller.petName} personalized itinerary`} src={generationJob.htmlViewerUrl} sandbox="" />
      </div>}
      {completed && <div className="next-note"><span>✦</span><p><strong>Your personalized itinerary is ready.</strong> The private download link is temporary; refresh the page flow if you need a new one later.</p></div>}
      <StepActions onBack={onBack} />
    </div>
  </>;
}
