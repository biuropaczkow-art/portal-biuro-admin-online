import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("e-Doręczenia Client & Backend Integration (ADE)", () => {
  let client;

  beforeEach(async () => {
    client = await import("../lib/edoreczenia-client.ts");
    if (client.resetLocalEdoreczeniaState) {
      client.resetLocalEdoreczeniaState();
    }
  });

  it("prawidłowo ładuje listę przesyłek z bezpiecznym fallbackiem offline/demo", async () => {
    const messages = await client.fetchEdoreczeniaMessages();

    assert.equal(Array.isArray(messages), true);
    assert.ok(messages.length >= 3, "Lista powinna zawierać pakiety testowe ADE");
    assert.equal(typeof messages.isBackendOnline, "boolean");

    const awizo = messages.find((m) => m.id === "EDO-2026-11-09-001");
    assert.ok(awizo, "Powinno istnieć pismo US w Nysie");
    assert.equal(awizo.status, "AWIZO_OCZEKUJE");
    assert.equal(awizo.sender, "Urząd Skarbowy w Nysie");
    assert.equal(awizo.proceduralDaysLimit, 7);
  });

  it("manualne odebranie i wygenerowanie UPD aktualizuje stan pism i rejestruje osobę podpisującą", async () => {
    const messageId = "EDO-2026-11-09-001";
    const signer = "Jarosław Konik (Doradca Podatkowy)";

    const result = await client.signEdoreczeniaUpd(messageId, signer);

    assert.equal(result.success, true);
    assert.ok(result.message);
    assert.equal(result.message.status, "ODEBRANE_UPD");
    assert.equal(result.message.signedBy, signer);
    assert.ok(result.message.updGeneratedAt);

    // Weryfikacja odświeżonej listy pism
    const refreshed = await client.fetchEdoreczeniaMessages();
    const updated = refreshed.find((m) => m.id === messageId);
    assert.equal(updated.status, "ODEBRANE_UPD");
    assert.equal(updated.signedBy, signer);
  });

  it("blokuje ponowne generowanie UPD dla pisma już wcześniej odebranego", async () => {
    // Pismo EDO-2026-11-04-042 ma status ODEBRANE_UPD
    const result = await client.signEdoreczeniaUpd("EDO-2026-11-04-042");

    assert.equal(result.success, false);
    assert.match(result.error, /zostało już wcześniej/i);
  });

  it("żelazna reguła: blokuje wystawienie UPD po ziszczeniu się fikcji doręczenia (art. 42 ust. 2 UDE)", async () => {
    // Pismo EDO-2026-10-15-089 ma status FIKCJA_DORECZENIA
    const result = await client.signEdoreczeniaUpd("EDO-2026-10-15-089");

    assert.equal(result.success, false);
    assert.match(result.error, /fikcja doręczenia/i);
  });

  it("prawidłowo zgłasza błąd w przypadku nieistniejącego identyfikatora pisma", async () => {
    const result = await client.signEdoreczeniaUpd("NON-EXISTENT-ID");

    assert.equal(result.success, false);
    assert.match(result.error, /nie odnaleziono/i);
  });

  it("pobiera stan zbliżających się fikcji doręczeń i terminów procesowych przez getEdoreczeniaDeadlines()", async () => {
    const deadlines = await client.getEdoreczeniaDeadlines();

    assert.equal(typeof deadlines.success, "boolean");
    assert.equal(typeof deadlines.isBackendOnline, "boolean");
    assert.equal(Array.isArray(deadlines), true);
    assert.ok(deadlines.length > 0);

    const fictionAlert = deadlines.find((d) => d.id === "EDO-2026-11-09-001");
    assert.ok(fictionAlert);
    assert.equal(fictionAlert.alertType, "UPCOMING_FICTION");
    assert.equal(typeof fictionAlert.daysRemaining, "number");
    assert.equal(typeof fictionAlert.hoursRemaining, "number");
    assert.ok(["INFO", "WARNING", "CRITICAL"].includes(fictionAlert.severity));
  });

  it("konfiguracja URL zwraca właściwy endpoint mikroserwisu", () => {
    const url = client.getEdoreczeniaApiUrl();
    assert.ok(typeof url === "string" && url.length > 0);
    assert.match(url, /^https?:\/\//);
  });
});
