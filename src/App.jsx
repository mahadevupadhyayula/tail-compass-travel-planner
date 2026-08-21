import React, { useState } from "react";
import { defaultAccommodationId, demoPet, demoTrip, places, samplePolicy, transportOptions } from "./demoData";
import { placesFor } from "./data/activities.js";
import { buildItineraryPlan } from "./engine/itinerary.js";
import { buildReadiness, evaluateExtractedPolicy, evaluatePolicy } from "./readiness";
import { extractPolicyFromService } from "./policyClient";

import TopBar from "./components/TopBar";
import Hero from "./components/Hero";
import StepNav from "./components/StepNav";
import TripForm from "./components/TripForm";
import TravelOptions from "./components/TravelOptions";
import TripStatus from "./components/TripStatus";
import CompassCheck from "./components/CompassCheck";
import ItineraryStep from "./components/ItineraryStep";
import LandingSections from "./components/LandingSections";
import PrepareStep from "./components/PrepareStep";

const freshTrip = () => ({ ...demoTrip, transport: "Compare options" });

// Holds all shared state and wires the five steps together.
// Screen markup lives in src/components — keep this file about state and flow.
export default function App() {
  const [step, setStep] = useState(0);
  const [pet, setPetState] = useState(demoPet);
  const [trip, setTripState] = useState(freshTrip);
  const [selectedStay, setSelectedStay] = useState(defaultAccommodationId);
  const [readiness, setReadiness] = useState(null);
  const [itineraryDraft, setItineraryDraft] = useState(null);
  const [policyText, setPolicyText] = useState(samplePolicy);
  const [policyResult, setPolicyResult] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [policyFile, setPolicyFile] = useState(null);
  const [fileNotice, setFileNotice] = useState("");

  const setPet = key => value => setPetState(current => ({ ...current, [key]: value }));
  const setTrip = key => value => setTripState(current => ({ ...current, [key]: value }));

  // The plan is regenerated from THIS trip — dates, destination and transport —
  // never from a stored template.
  const plan = (stay = selectedStay) => {
    const stayRecord = places.find(place => place.id === stay);
    const template = buildItineraryPlan({
      trip,
      stay: stayRecord,
      places: placesFor(trip.to),
      transportMode: trip.transport === "Compare options" ? "Car" : trip.transport
    });
    return buildReadiness(pet, places, template, stay, trip.to);
  };
  const currentItinerary = itineraryDraft || readiness?.itinerary || [];
  const transport = transportOptions.find(option => option.mode === trip.transport);

  const startDemo = () => {
    setPetState(demoPet);
    setTripState(freshTrip());
    setSelectedStay(defaultAccommodationId);
    setStep(1);
  };
  const generate = () => {
    setReadiness(plan());
    setItineraryDraft(null);
    setPolicyResult(null);
    setStep(2);
  };
  const switchStay = id => {
    setSelectedStay(id);
    setReadiness(plan(id));
    setItineraryDraft(null);
  };
  const reset = () => {
    setPetState(demoPet);
    setTripState(freshTrip());
    setSelectedStay(defaultAccommodationId);
    setReadiness(null);
    setItineraryDraft(null);
    setStep(0);
  };

  // Plain-text policy files are read in the browser. Anything else is honest about
  // not being parsed rather than silently doing nothing.
  async function handlePolicyFile(file) {
    setPolicyFile(file);
    setPolicyResult(null);
    if (!file) return setFileNotice("");
    const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
    if (!isText) return setFileNotice(`We can't read ${file.name} in this MVP. Open it, copy the pet policy text, and paste it above.`);
    try {
      const text = await file.text();
      setPolicyText(text.slice(0, 20000));
      setFileNotice(`Loaded ${file.name}. Check the text above, then extract.`);
    } catch {
      setFileNotice(`We couldn't read ${file.name}. Please paste the text instead.`);
    }
  }

  async function analysePolicy() {
    setIsExtracting(true);
    try {
      setPolicyResult(evaluateExtractedPolicy(pet, await extractPolicyFromService(policyText)));
    } catch {
      setPolicyResult({
        ...evaluatePolicy(pet, policyText),
        extraction_source: "fallback",
        fallback_notice: "AI extraction is unavailable, so we’re using local extraction."
      });
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="app">
      <TopBar onReset={reset} planning={step > 0} />
      <main>
        <Hero />
        <StepNav step={step} />

        {step === 0 && (
          <TripForm pet={pet} setPet={setPet} trip={trip} setTrip={setTrip} onDemo={startDemo} onNext={() => setStep(1)} />
        )}

        {step === 1 && (
          <TravelOptions pet={pet} trip={trip} setPet={setPet} setTrip={setTrip} onBack={() => setStep(0)} onNext={generate} />
        )}

        {step === 2 && readiness && (
          <TripStatus
            pet={pet}
            trip={trip}
            readiness={readiness}
            transport={transport}
            onSwitchStay={switchStay}
            onViewItinerary={() => setStep(3)}
          >
            <CompassCheck
              pet={pet}
              policyText={policyText}
              setPolicyText={setPolicyText}
              policyResult={policyResult}
              isExtracting={isExtracting}
              policyFile={policyFile}
              fileNotice={fileNotice}
              onFileSelected={handlePolicyFile}
              onAnalyse={analysePolicy}
              onUseDemo={() => { setPolicyText(samplePolicy); setPolicyResult(null); }}
            />
          </TripStatus>
        )}

        {step === 3 && readiness && (
          <ItineraryStep
            pet={pet}
            trip={trip}
            itinerary={currentItinerary}
            setItinerary={updater => setItineraryDraft(current => updater(current || readiness.itinerary))}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && readiness && (
          <PrepareStep pet={pet} trip={trip} itinerary={currentItinerary} onBack={() => setStep(3)} onReset={reset} />
        )}

        {step === 0 && <LandingSections onDemo={startDemo} />}
      </main>
      <footer>Tail Compass MVP · Source-aware demo data only · Not a booking or legal guarantee.</footer>
    </div>
  );
}
