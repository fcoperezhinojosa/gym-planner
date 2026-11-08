import { describe, expect, it } from "vitest";
import { propagate, applyToAll, nextSet } from "../src/lib/sets";
import { normalizeSlot, resolveDay, weekIndexFor } from "../src/lib/schedule";
import { addDays, isoWeekday, startOfWeek, todayISO, daysInMonth, addMonths } from "../src/lib/dates";
import { estimateKcal, metFor } from "../src/lib/kcal";
import { aggregateEnergy, basalKcal, energyVerdict, periodStart } from "../src/lib/energy";
import { epley1RM, suggestWeight, weekStreak } from "../src/lib/stats";

describe("propagate", () => {
  it("3x12 → cambiar una a 16 cambia todas", () => {
    const sets = [12, 12, 12].map((w) => ({ reps: 10, weightKg: w }));
    expect(propagate(sets, 0, "weightKg", 16).map((s) => s.weightKg)).toEqual([16, 16, 16]);
  });
  it("no rompe una pirámide", () => {
    const sets = [12, 14, 16].map((w) => ({ reps: 10, weightKg: w }));
    expect(propagate(sets, 0, "weightKg", 13).map((s) => s.weightKg)).toEqual([13, 14, 16]);
  });
  it("no toca series completadas", () => {
    const sets = [
      { reps: 10, weightKg: 16, completed: true },
      { reps: 10, weightKg: 16, completed: false },
      { reps: 10, weightKg: 16, completed: false },
    ];
    expect(propagate(sets, 2, "weightKg", 14).map((s) => s.weightKg)).toEqual([16, 14, 14]);
  });
  it("funciona con reps", () => {
    const sets = [10, 10, 8].map((r) => ({ reps: r, weightKg: 20 }));
    expect(propagate(sets, 1, "reps", 12).map((s) => s.reps)).toEqual([12, 12, 8]);
  });
  it("applyToAll y nextSet", () => {
    const sets = [{ reps: 8, weightKg: 10 }, { reps: 8, weightKg: 12 }];
    expect(applyToAll(sets, "weightKg", 20).map((s) => s.weightKg)).toEqual([20, 20]);
    expect(nextSet(sets)).toEqual({ reps: 8, weightKg: 12, completed: false });
  });
});

describe("dates", () => {
  it("weekday y semanas", () => {
    expect(isoWeekday("2026-11-02")).toBe(1); // lunes
    expect(isoWeekday("2026-11-08")).toBe(7);
    expect(startOfWeek("2026-11-05")).toBe("2026-11-02");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // cambio de hora
    expect(daysInMonth("2028-02-10")).toBe(29);
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
  });
  it("hoy en Madrid", () => {
    expect(todayISO(new Date("2026-11-02T23:30:00Z"), "Europe/Madrid")).toBe("2026-11-03");
  });
});

describe("schedule", () => {
  const plan = { startDate: "2026-11-04", cycleWeeks: 2 }; // miércoles
  it("semana A/B alterna por semanas naturales", () => {
    expect(weekIndexFor("2026-11-02", plan)).toBe(0); // lunes de la misma semana
    expect(weekIndexFor("2026-11-08", plan)).toBe(0);
    expect(weekIndexFor("2026-11-09", plan)).toBe(1);
    expect(weekIndexFor("2026-11-16", plan)).toBe(0);
    expect(weekIndexFor("2026-10-26", plan)).toBe(1); // antes del inicio
  });
  it("resuelve plan y excepciones", () => {
    const plan = { startDate: "2026-11-02", cycleWeeks: 2 };
    const days = [
      { weekIndex: 0, weekday: 1, kind: "workout" as const, routineId: 1, activityType: null, extraActivities: ["walking"], label: null },
      { weekIndex: 1, weekday: 1, kind: "workout" as const, routineId: 2, activityType: null, extraActivities: [], label: null },
      { weekIndex: 0, weekday: 4, kind: "activity" as const, routineId: null, activityType: "padel", extraActivities: [], label: null },
    ];
    expect(resolveDay("2026-11-02", plan, days).routineId).toBe(1);
    expect(resolveDay("2026-11-02", plan, days).extraActivities).toEqual(["walking"]);
    expect(resolveDay("2026-11-03", plan, days).extraActivities).toEqual([]);
    expect(resolveDay("2026-11-09", plan, days).routineId).toBe(2);
    expect(resolveDay("2026-11-05", plan, days).activityType).toBe("padel");
    expect(resolveDay("2026-11-03", plan, days).kind).toBe("rest");
    const ov = [{ date: "2026-11-05", kind: "rest" as const, routineId: null, activityType: null, extraActivities: [], label: "Lesión" }];
    const r = resolveDay("2026-11-05", plan, days, ov);
    expect(r.kind).toBe("rest");
    expect(r.source).toBe("override");
    expect(resolveDay("2026-11-05", null, []).source).toBe("none");
    expect(resolveDay("2026-10-26", plan, days).source).toBe("none"); // antes del inicio
  });
  it("normaliza varias actividades en un día", () => {
    const base = { routineId: null, label: null };
    // Descanso + extras → la primera extra pasa a ser la principal
    expect(normalizeSlot({ ...base, kind: "rest", activityType: null, extraActivities: ["walking", "elliptical"] })).toMatchObject({
      kind: "activity",
      activityType: "walking",
      extraActivities: ["elliptical"],
    });
    // Sin duplicados ni repetir la principal
    expect(normalizeSlot({ ...base, kind: "activity", activityType: "padel", extraActivities: ["padel", "walking", "walking"] }).extraActivities).toEqual(["walking"]);
    // Gimnasio + actividades
    expect(normalizeSlot({ ...base, kind: "workout", routineId: 1, activityType: null, extraActivities: ["walking"] }).extraActivities).toEqual(["walking"]);
    expect(normalizeSlot({ ...base, kind: "rest", activityType: null, extraActivities: [] }).extraActivities).toEqual([]);
  });
});

describe("kcal y stats", () => {
  it("MET", () => {
    expect(estimateKcal(5, 75, 60)).toBe(375);
    expect(estimateKcal(metFor("padel", "moderate"), 75, 90)).toBe(731);
    expect(estimateKcal(5, 0, 60)).toBe(0);
  });
  it("1RM y sugerencias", () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 10)).toBe(133.3);
    const done = [{ reps: 10, weightKg: 16, completed: true }, { reps: 10, weightKg: 16, completed: true }];
    expect(suggestWeight(done, 10)).toBe(18.5);
    expect(suggestWeight([{ reps: 8, weightKg: 16, completed: true }], 10)).toBeNull();
  });
  it("racha", () => {
    expect(weekStreak([{ done: 4, planned: 4 }, { done: 3, planned: 4 }, { done: 4, planned: 4 }, { done: 1, planned: 4 }])).toBe(1);
    expect(weekStreak([{ done: 4, planned: 4 }, { done: 4, planned: 4 }, { done: 4, planned: 4 }])).toBe(3);
  });
});

describe("balance energético", () => {
  it("Mifflin-St Jeor con datos completos", () => {
    expect(basalKcal({ sex: "male", age: 30, heightCm: 180, weightKg: 80 })).toEqual({ kcal: 1780, exact: true });
    expect(basalKcal({ sex: "female", age: 30, heightCm: 165, weightKg: 60 }).kcal).toBe(1320);
  });
  it("aproximación si faltan datos", () => {
    expect(basalKcal({ weightKg: 80 })).toEqual({ kcal: 1760, exact: false });
  });
  it("agrupa por semana y calcula balance solo con días de consumo conocido", () => {
    const days = [
      { date: "2026-11-02", gym: 300, other: 0, intake: 2500 },
      { date: "2026-11-03", gym: 0, other: 400, intake: null },
      { date: "2026-11-09", gym: 0, other: 0, intake: 1800 },
    ];
    const [w1, w2] = aggregateEnergy(days, "week", 2000, null);
    expect(w1).toMatchObject({ key: "2026-11-02", days: 2, burned: 4700, intake: 2500, intakeDays: 1, balance: 200 });
    expect(w2).toMatchObject({ key: "2026-11-09", burned: 2000, balance: -200 });
  });
  it("usa el consumo habitual si no hay registro", () => {
    const [d] = aggregateEnergy([{ date: "2026-11-02", gym: 0, other: 0, intake: null }], "day", 2000, 2300);
    expect(d.balance).toBe(300);
  });
  it("agrupa por mes", () => {
    const b = aggregateEnergy(
      [
        { date: "2026-10-31", gym: 0, other: 0, intake: null },
        { date: "2026-11-01", gym: 0, other: 0, intake: null },
      ],
      "month",
      2000,
      null,
    );
    expect(b.map((x) => x.key)).toEqual(["2026-10-01", "2026-11-01"]);
    expect(b[0].intake).toBeNull();
  });
  it("periodStart", () => {
    expect(periodStart("2026-11-08", "day", 14)).toBe("2026-10-26");
    expect(periodStart("2026-11-08", "week", 12)).toBe("2026-08-17");
    expect(periodStart("2026-11-08", "month", 6)).toBe("2026-06-01");
  });
  it("veredicto", () => {
    expect(energyVerdict(null).tone).toBe("neutral");
    expect(energyVerdict(400).tone).toBe("warn");
    expect(energyVerdict(-100).tone).toBe("good");
    expect(energyVerdict(-500).tone).toBe("good");
    expect(energyVerdict(-1200).tone).toBe("danger");
  });
});
