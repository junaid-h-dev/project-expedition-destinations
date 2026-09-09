import { describe, expect, it } from "vitest";
import { isTokenAbility, TOKEN_ABILITIES } from "@/domain/token-ability";

describe("token abilities", () => {
  it("only accept declared abilities, not inherited object keys", () => {
    expect(isTokenAbility("destinations:seed")).toBe(true);
    expect(isTokenAbility("toString")).toBe(false);
    expect(isTokenAbility("constructor")).toBe(false);
    expect(isTokenAbility(42)).toBe(false);
  });

  it("describes every ability it declares, for the CLI's help output", () => {
    expect(Object.keys(TOKEN_ABILITIES).length).toBeGreaterThan(0);

    for (const [ability, description] of Object.entries(TOKEN_ABILITIES)) {
      expect(isTokenAbility(ability)).toBe(true);
      expect(description.length).toBeGreaterThan(0);
    }
  });
});
