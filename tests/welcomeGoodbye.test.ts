import { describe, it, expect } from "vitest";
import {
  WELCOME_MESSAGES,
  GOODBYE_MESSAGES,
  BAN_MESSAGES,
} from "../src/bot/handlers/welcomeGoodbyeHandler.js";

describe("Welcome, Goodbye & Ban Message Pools", () => {
  it("should have at least 10 unique welcome message variations", () => {
    expect(WELCOME_MESSAGES.length).toBeGreaterThanOrEqual(10);
    const unique = new Set(WELCOME_MESSAGES);
    expect(unique.size).toBe(WELCOME_MESSAGES.length);
  });

  it("should have at least 5 unique goodbye message variations", () => {
    expect(GOODBYE_MESSAGES.length).toBeGreaterThanOrEqual(5);
    const unique = new Set(GOODBYE_MESSAGES);
    expect(unique.size).toBe(GOODBYE_MESSAGES.length);
  });

  it("should have at least 5 unique ban message variations", () => {
    expect(BAN_MESSAGES.length).toBeGreaterThanOrEqual(5);
    const unique = new Set(BAN_MESSAGES);
    expect(unique.size).toBe(BAN_MESSAGES.length);
  });

  it("should support replacing {name} in all pools", () => {
    const testName = "TestShark";
    for (const msg of [...WELCOME_MESSAGES, ...GOODBYE_MESSAGES, ...BAN_MESSAGES]) {
      const rendered = msg.replace(/{name}/g, testName);
      expect(rendered).not.toContain("{name}");
      expect(rendered.length).toBeGreaterThan(10);
    }
  });
});
