import { describe, it, expect } from "vitest";
import { calculateVirtueScores } from "@/lib/virtueScoring";

describe("calculateVirtueScores", () => {
  it("normalizes scores fairly across different question counts", () => {
    // All answers = 5 (max) → all virtues should be 100%
    const allMax: Record<number, number> = {};
    for (let i = 1; i <= 24; i++) allMax[i] = 5;

    const result = calculateVirtueScores(allMax);
    expect(result.normalizedScores["Transcendence"]).toBe(100); // 5 questions
    expect(result.normalizedScores["Justice"]).toBe(100);        // 3 questions
    expect(result.normalizedScores["Humanity"]).toBe(100);       // 3 questions
    expect(result.normalizedScores["Temperance"]).toBe(100);     // 4 questions
    expect(result.normalizedScores["Wisdom"]).toBe(100);         // 5 questions
    expect(result.normalizedScores["Courage"]).toBe(100);        // 5 questions (4 visible + Zest)
  });

  it("normalizes scores to 0-100 percentage", () => {
    const answers: Record<number, number> = {};
    // Transcendence (5 Qs): all 3 → raw=15, max=25, normalized=60
    for (let i = 1; i <= 5; i++) answers[i] = 3;
    // Justice (3 Qs): all 5 → raw=15, max=15, normalized=100
    for (let i = 6; i <= 8; i++) answers[i] = 5;
    // Humanity (3 Qs): all 1 → raw=3, max=15, normalized=20
    for (let i = 9; i <= 11; i++) answers[i] = 1;
    // Temperance (4 Qs): all 4 → raw=16, max=20, normalized=80
    for (let i = 12; i <= 15; i++) answers[i] = 4;
    // Wisdom (5 Qs): all 2 → raw=10, max=25, normalized=40
    for (let i = 16; i <= 20; i++) answers[i] = 2;
    // Courage (4 Qs): all 5 → raw=20, max=20, normalized=100
    for (let i = 21; i <= 24; i++) answers[i] = 5;

    const result = calculateVirtueScores(answers);

    expect(result.normalizedScores["Transcendence"]).toBe(60);
    expect(result.normalizedScores["Justice"]).toBe(100);
    expect(result.normalizedScores["Humanity"]).toBe(20);
    expect(result.normalizedScores["Temperance"]).toBe(80);
    expect(result.normalizedScores["Wisdom"]).toBe(40);
    expect(result.normalizedScores["Courage"]).toBe(100);
  });

  it("ranks all 6 virtues from highest to lowest", () => {
    const answers: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) answers[i] = 3;   // Transcendence: 60%
    for (let i = 6; i <= 8; i++) answers[i] = 5;    // Justice: 100%
    for (let i = 9; i <= 11; i++) answers[i] = 1;   // Humanity: 20%
    for (let i = 12; i <= 15; i++) answers[i] = 4;  // Temperance: 80%
    for (let i = 16; i <= 20; i++) answers[i] = 2;  // Wisdom: 40%
    for (let i = 21; i <= 24; i++) answers[i] = 5;  // Courage: 100%

    const result = calculateVirtueScores(answers);

    expect(result.allVirtues).toHaveLength(6);
    // Tied at 100: Courage and Justice (alphabetical: Courage first)
    expect(result.allVirtues[0].virtue).toBe("Courage");
    expect(result.allVirtues[1].virtue).toBe("Justice");
    expect(result.allVirtues[2].virtue).toBe("Temperance");
    expect(result.allVirtues[3].virtue).toBe("Transcendence");
    expect(result.allVirtues[4].virtue).toBe("Wisdom");
    expect(result.allVirtues[5].virtue).toBe("Humanity");

    expect(result.primary.virtue).toBe("Courage");
    expect(result.secondary.virtue).toBe("Justice");
  });

  it("detects ties at the top", () => {
    const answers: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) answers[i] = 3;
    for (let i = 6; i <= 8; i++) answers[i] = 5;    // Justice: 100%
    for (let i = 9; i <= 11; i++) answers[i] = 1;
    for (let i = 12; i <= 15; i++) answers[i] = 4;
    for (let i = 16; i <= 20; i++) answers[i] = 2;
    for (let i = 21; i <= 24; i++) answers[i] = 5;  // Courage: 100%

    const result = calculateVirtueScores(answers);
    expect(result.tiedVirtues).toEqual(["Courage", "Justice"]);
  });

  it("returns null tiedVirtues when no tie", () => {
    const answers: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) answers[i] = 5;    // Transcendence: 100%
    for (let i = 6; i <= 8; i++) answers[i] = 4;    // Justice: 80%
    for (let i = 9; i <= 11; i++) answers[i] = 3;
    for (let i = 12; i <= 15; i++) answers[i] = 2;
    for (let i = 16; i <= 20; i++) answers[i] = 1;
    for (let i = 21; i <= 24; i++) answers[i] = 3;

    const result = calculateVirtueScores(answers);
    expect(result.tiedVirtues).toBeNull();
    expect(result.primary.virtue).toBe("Transcendence");
  });

  it("tracks raw scores correctly", () => {
    const answers: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) answers[i] = 4;    // Transcendence: raw=20
    for (let i = 6; i <= 8; i++) answers[i] = 3;    // Justice: raw=9
    for (let i = 9; i <= 11; i++) answers[i] = 5;   // Humanity: raw=15
    for (let i = 12; i <= 15; i++) answers[i] = 2;  // Temperance: raw=8
    for (let i = 16; i <= 20; i++) answers[i] = 1;  // Wisdom: raw=5
    for (let i = 21; i <= 24; i++) answers[i] = 4;  // Courage: raw=16

    const result = calculateVirtueScores(answers);
    expect(result.rawScores["Transcendence"]).toBe(20);
    expect(result.rawScores["Justice"]).toBe(9);
    expect(result.rawScores["Humanity"]).toBe(15);
    expect(result.rawScores["Temperance"]).toBe(8);
    expect(result.rawScores["Wisdom"]).toBe(5);
    expect(result.rawScores["Courage"]).toBe(16);
  });

  it("detects balanced profile when all scores within 5 points", () => {
    // All answers = 3 → all virtues = 60% → balanced
    const answers: Record<number, number> = {};
    for (let i = 1; i <= 24; i++) answers[i] = 3;

    const result = calculateVirtueScores(answers);
    expect(result.isBalanced).toBe(true);
  });

  it("detects non-balanced profile when scores vary", () => {
    const answers: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) answers[i] = 5;    // Transcendence: 100%
    for (let i = 6; i <= 8; i++) answers[i] = 1;    // Justice: 20%
    for (let i = 9; i <= 11; i++) answers[i] = 3;
    for (let i = 12; i <= 15; i++) answers[i] = 2;
    for (let i = 16; i <= 20; i++) answers[i] = 1;
    for (let i = 21; i <= 24; i++) answers[i] = 3;

    const result = calculateVirtueScores(answers);
    expect(result.isBalanced).toBe(false);
  });
});
