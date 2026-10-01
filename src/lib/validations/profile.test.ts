import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "./profile";

describe("updateProfileSchema", () => {
  it("accepts valid input and trims the display name", () => {
    const result = updateProfileSchema.parse({
      display_name: "  Mari  ",
      avatar_url: "https://example.com/avatar.png",
    });

    expect(result.display_name).toBe("Mari");
  });

  it("allows a missing or null avatar", () => {
    expect(
      updateProfileSchema.safeParse({ display_name: "Mari" }).success,
    ).toBe(true);
    expect(
      updateProfileSchema.safeParse({ display_name: "Mari", avatar_url: null })
        .success,
    ).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = updateProfileSchema.safeParse({ display_name: "   " });

    expect(result.success).toBe(false);
  });

  it("rejects a display name longer than 100 characters", () => {
    const result = updateProfileSchema.safeParse({
      display_name: "a".repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-http(s) avatar URLs", () => {
    const result = updateProfileSchema.safeParse({
      display_name: "Mari",
      avatar_url: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
  });
});
