import { expect, type Page, test } from "@playwright/test";

import {
  createUser,
  deleteUsers,
  TEST_PASSWORD,
  uniqueEmail,
} from "./support/users";

/*
 * The whole invitation flow, as a user experiences it:
 * admin signs in → creates an invitation → the invitee opens the link,
 * sets a password and lands in the app → the link cannot be used again →
 * the new member has no access to the admin area.
 */

const adminEmail = uniqueEmail("e2e-admin");
const memberEmail = uniqueEmail("e2e-member");

test.beforeAll(async () => {
  await createUser(adminEmail, "admin");
});

test.afterAll(async () => {
  await deleteUsers([adminEmail, memberEmail]);
});

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

test("admin invites a member who accepts and gets member access", async ({
  page,
  browser,
}) => {
  let invitationLink = "";

  await test.step("admin signs in and is sent back to the users page", async () => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers$/);

    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(
      mainNav(page).getByRole("link", { name: "Users" }),
    ).toBeVisible();
  });

  await test.step("admin creates an invitation", async () => {
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Role").selectOption("member");
    await page.getByRole("button", { name: "Create invitation" }).click();

    const linkField = page.getByLabel("Invitation link");
    await expect(linkField).toBeVisible();
    invitationLink = await linkField.inputValue();
    expect(invitationLink).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);

    await expect(
      page.getByRole("cell", { name: memberEmail, exact: true }),
    ).toBeVisible();
  });

  // A separate browser context: the invitee has no session and no cookies.
  const inviteeContext = await browser.newContext();
  const invitee = await inviteeContext.newPage();

  try {
    await test.step("invitee accepts the invitation", async () => {
      await invitee.goto(invitationLink);
      // CardTitle renders a <div>, not a heading, so match by text.
      await expect(
        invitee.getByText("Create your account", { exact: true }),
      ).toBeVisible();
      await expect(
        invitee.getByText(memberEmail, { exact: true }),
      ).toBeVisible();

      await invitee.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await invitee.getByLabel("Repeat password").fill(TEST_PASSWORD);
      await invitee.getByRole("button", { name: "Create account" }).click();

      await expect(invitee).toHaveURL(/\/dashboard$/);
    });

    await test.step("member has no access to the admin area", async () => {
      await expect(
        mainNav(invitee).getByRole("link", { name: "Dashboard" }),
      ).toBeVisible();
      await expect(
        mainNav(invitee).getByRole("link", { name: "Users" }),
      ).toHaveCount(0);

      const response = await invitee.goto("/admin/users");
      expect(response?.status()).toBe(404);
    });

    await test.step("member signs out", async () => {
      await invitee.goto("/dashboard");
      await invitee.getByRole("button", { name: /^Sign out/ }).click();
      await expect(invitee).toHaveURL(/\/login$/);
    });

    await test.step("the invitation link works only once", async () => {
      await invitee.goto(invitationLink);
      await expect(
        invitee.getByText("This invitation can’t be used", { exact: true }),
      ).toBeVisible();
    });
  } finally {
    await inviteeContext.close();
  }
});
