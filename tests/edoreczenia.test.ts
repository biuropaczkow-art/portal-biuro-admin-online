import { describe, it, expect } from "vitest";

interface EdoreczeniaLogic {
  receivedAt: Date;
  fictionDeadline: Date;
  isDeliveredByFiction: (now: Date) => boolean;
  canAutoGenerateUpd: () => boolean;
  calculateProceduralDeadline: (updOrFictionDate: Date, limitDays: number) => Date;
}

function createEdoreczeniaItem(receivedAt: Date): EdoreczeniaLogic {
  // 14 pełnych dni od momentu doręczenia awizo na adres ADE
  const fictionDeadline = new Date(receivedAt.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    receivedAt,
    fictionDeadline,
    isDeliveredByFiction: (now: Date) => now.getTime() >= fictionDeadline.getTime(),
    canAutoGenerateUpd: () => false, // Żelazny zakaz autogenerowania UPD wg Audytu A10
    calculateProceduralDeadline: (baseDate: Date, limitDays: number) => {
      return new Date(baseDate.getTime() + limitDays * 24 * 60 * 60 * 1000);
    },
  };
}

describe("e-Doręczenia (ADE) - Reguły bezpieczeństwa i fikcja doręczenia", () => {
  it("blokuje automatyczne kwitowanie odbioru i wystawianie UPD bez zgody użytkownika", () => {
    const item = createEdoreczeniaItem(new Date("2026-11-01T10:00:00Z"));
    expect(item.canAutoGenerateUpd()).toBe(false);
  });

  it("prawidłowo wylicza 14-dniowy termin fikcji doręczenia", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const item = createEdoreczeniaItem(received);

    const expectedDeadline = new Date("2026-11-15T10:00:00Z");
    expect(item.fictionDeadline.toISOString()).toBe(expectedDeadline.toISOString());
  });

  it("weryfikuje stan fikcji doręczenia przed i po upływie 14 dni", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const item = createEdoreczeniaItem(received);

    const day10 = new Date("2026-11-11T10:00:00Z");
    expect(item.isDeliveredByFiction(day10)).toBe(false);

    const day14 = new Date("2026-11-15T10:00:00Z");
    expect(item.isDeliveredByFiction(day14)).toBe(true);

    const day15 = new Date("2026-11-16T10:00:00Z");
    expect(item.isDeliveredByFiction(day15)).toBe(true);
  });

  it("prawidłowo liczy bieg procesowy (7 dni na zażalenie) od momentu UPD lub fikcji", () => {
    const received = new Date("2026-11-01T10:00:00Z");
    const item = createEdoreczeniaItem(received);

    // Manualne odebranie w 3. dniu
    const manualUpdDate = new Date("2026-11-04T12:00:00Z");
    const appealDeadlineFromManual = item.calculateProceduralDeadline(manualUpdDate, 7);
    expect(appealDeadlineFromManual.toISOString()).toBe("2026-11-11T12:00:00.000Z");

    // Odbiór przez fikcję po 14 dniach
    const appealDeadlineFromFiction = item.calculateProceduralDeadline(item.fictionDeadline, 7);
    expect(appealDeadlineFromFiction.toISOString()).toBe("2026-11-22T10:00:00.000Z");
  });
});
