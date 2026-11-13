import { describe, it } from "node:test";
import assert from "node:assert/strict";

function createEdoreczeniaItem(receivedAt) {
  // 14 pełnych dni od momentu doręczenia awizo na adres ADE
  const fictionDeadline = new Date(receivedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    receivedAt,
    fictionDeadline,
    isDeliveredByFiction: (now) => now.getTime() >= fictionDeadline.getTime(),
    canAutoGenerateUpd: () => false, // Żelazny zakaz autogenerowania UPD wg Audytu A10
    calculateProceduralDeadline: (baseDate, limitDays) => {
      return new Date(baseDate.getTime() + limitDays * 24 * 60 * 60 * 1000);
    },
  };
}

describe("e-Doręczenia (ADE) - Reguły bezpieczeństwa i fikcja doręczenia", () => {
  it("blokuje automatyczne kwitowanie odbioru i wystawianie UPD bez zgody użytkownika", () => {
    const item = createEdoreczeniaItem(new Date("2026-11-01T10:00:00Z"));
    assert.equal(item.canAutoGenerateUpd(), false);
  });

  it("prawidłowo wylicza 14-dniowy termin fikcji doręczenia", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const item = createEdoreczeniaItem(received);

    const expectedDeadline = new Date("2026-11-15T10:00:00Z");
    assert.equal(item.fictionDeadline.toISOString(), expectedDeadline.toISOString());
  });

  it("weryfikuje stan fikcji doręczenia przed i po upływie 14 dni", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const item = createEdoreczeniaItem(received);

    const day10 = new Date("2026-11-11T10:00:00Z");
    assert.equal(item.isDeliveredByFiction(day10), false);

    const day14 = new Date("2026-11-15T10:00:00Z");
    assert.equal(item.isDeliveredByFiction(day14), true);

    const day15 = new Date("2026-11-16T10:00:00Z");
    assert.equal(item.isDeliveredByFiction(day15), true);
  });

  it("prawidłowo liczy bieg procesowy (7 dni na zażalenie) od momentu UPD lub fikcji", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const item = createEdoreczeniaItem(received);

    // Manualne odebranie w 3. dniu
    const manualUpdDate = new Date("2026-11-04T12:00:00Z");
    const appealDeadlineFromManual = item.calculateProceduralDeadline(manualUpdDate, 7);
    assert.equal(appealDeadlineFromManual.toISOString(), "2026-11-11T12:00:00.000Z");

    // Odbiór przez fikcję po 14 dniach
    const appealDeadlineFromFiction = item.calculateProceduralDeadline(item.fictionDeadline, 7);
    assert.equal(appealDeadlineFromFiction.toISOString(), "2026-11-22T10:00:00.000Z");
  });
});
