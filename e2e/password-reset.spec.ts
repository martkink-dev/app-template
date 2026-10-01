import { expect, type Page, test } from "@playwright/test";

import {
  createUser,
  deleteUsers,
  TEST_PASSWORD,
  uniqueEmail,
} from "./support/users";

/*
 * Password reset without email: an admin creates a one-time link, the user
 * opens it, sets a new password and is signed in. The old password stops
 * working and the link cannot be used again.
 */

const NEW_PASSWORD = "E2e-New-Password-456?";

const adminEmail = uniqueEmail("e2e-admin");
const memberEmail = uniqueEmail("e2e-member");

test.beforeAll(async () => {
  await createUser(adminEmail, "admin");
  await createUser(memberEmail, "member");
});

test.afterAll(async () => {
  await deleteUsers([adminEmail, memberEmail]);
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("admin creates a reset link and the member sets a new password", async ({
  page,
  browser,
}) => {
  let resetLink = "";

  await test.step("admin creates a reset link for the member", async () => {
    await signIn(page, adminEmail, TEST_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/admin/users");
    const memberRow = page.getByRole("row").filter({ hasText: memberEmail });
    await memberRow.getByRole("button", { name: "Create reset link" }).click();

    const linkField = memberRow.getByLabel("Password reset link");
    await expect(linkField).toBeVisible();
    resetLink = await linkField.inputValue();
    expect(resetLink).toMatch(/\/reset-password\/[A-Za-z0-9_-]{43}$/);
  });

  // A separate browser context: the member is not signed in.
  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();

  try {
    await test.step("member sets a new password and is signed in", async () => {
      await member.goto(resetLink);
      // CardTitle renders a <div>, not a heading, so match by text.
      await expect(
        member.getByText("Choose a new password", { exact: true }),
      ).toBeVisible();
      await expect(
        member.getByText(memberEmail, { exact: true }),
      ).toBeVisible();

      await member
        .getByLabel("New password", { exact: true })
        .fill(NEW_PASSWORD);
      await member.getByLabel("Repeat new password").fill(NEW_PASSWORD);
      await member.getByRole("button", { name: "Set new password" }).click();

      await expect(member).toHaveURL(/\/dashboard$/);
      await member.getByRole("button", { name: /^Sign out/ }).click();
      await expect(member).toHaveURL(/\/login$/);
    });

    await test.step("the old password no longer works", async () => {
      await signIn(member, memberEmail, TEST_PASSWORD);
      // Not getByRole("alert"): Next.js adds its own (empty) route announcer.
      await expect(member.getByText(/^Sign-in failed/)).toBeVisible();
    });

    await test.step("the new password works", async () => {
      await signIn(member, memberEmail, NEW_PASSWORD);
      await expect(member).toHaveURL(/\/dashboard$/);
    });

    await test.step("the reset link works only once", async () => {
      await member.goto(resetLink);
      await expect(
        member.getByText("This link can’t be used", { exact: true }),
      ).toBeVisible();
    });
  } finally {
    await memberContext.close();
  }
});
