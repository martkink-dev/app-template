import { describe, expect, it } from "vitest";

import { changePasswordSchema, updateDisplayNameSchema } from "./account";

const valid = {
  currentPassword: "Old-Password-123!",
  newPassword: "New-Password-456?",
  confirmPassword: "New-Password-456?",
};

function firstIssue(input: unknown) {
  const result = changePasswordSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
}

describe("changePasswordSchema", () => {
  it("accepts a valid change", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the current password", () => {
    expect(firstIssue({ ...valid, currentPassword: "" })?.path).toEqual([
      "currentPassword",
    ]);
  });

  it("applies the password policy to the new password", () => {
    const weak = "short";
    expect(
      firstIssue({ ...valid, newPassword: weak, confirmPassword: weak })?.path,
    ).toEqual(["newPassword"]);
  });

  it("rejects a confirmation that does not match", () => {
    expect(
      firstIssue({ ...valid, confirmPassword: "Other-Password-789!" })?.path,
    ).toEqual(["confirmPassword"]);
  });

  it("rejects reusing the current password", () => {
    const same = valid.currentPassword;
    expect(
      firstIssue({ ...valid, newPassword: same, confirmPassword: same })?.path,
    ).toEqual(["newPassword"]);
  });
});

describe("updateDisplayNameSchema", () => {
  it("trims the display name", () => {
    expect(
      updateDisplayNameSchema.parse({ display_name: "  Mari  " }).display_name,
    ).toBe("Mari");
  });
});
