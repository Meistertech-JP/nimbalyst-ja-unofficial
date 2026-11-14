import { describe, expect, it } from "vitest";
import { localMachineLabel } from "./remoteMachineLabel";

describe("localMachineLabel", () => {
  const labels = {
    fallback: "このデバイス",
    named: (name: string) => `${name}（このデバイス）`,
  };

  it("uses the localized fallback when no device name is available", () => {
    expect(localMachineLabel(null, labels)).toBe("このデバイス");
    expect(localMachineLabel("   ", labels)).toBe("このデバイス");
  });

  it("uses the trimmed device name with the localized suffix", () => {
    expect(localMachineLabel("  Office PC  ", labels)).toBe(
      "Office PC（このデバイス）",
    );
  });
});
