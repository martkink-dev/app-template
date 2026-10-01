import { expect, type Page, test } from "@playwright/test";

import {
  createUser,
  deleteUsers,
  TEST_PASSWORD,
  uniqueEmail,
} from "./support/users";

/*
 * The account page: a signed-in user changes their display name and their
 * password. Changing the password needs the current one.
 */

const NEW_PASSWORD = "E2e-Changed-Password-789#";

const memberEmail = uniqueEmail("e2e-member");

test.beforeAll(async () => {
  await createUser(memberEmail, "member");
});

test.afterAll(async () => {
  await deleteUsers([memberEmail]);
});

async function signIn(page: Page, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(memberEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("member changes display name and password", async ({ page }) => {
  await test.step("member opens the account page from the navigation", async () => {
    await signIn(page, TEST_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Account" })
      .click();
    await expect(page).toHaveURL(/\/account$/);
  });

  await test.step("display name is saved", async () => {
    await page.getByLabel("Display name").fill("E2E Member");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue("E2E Member");
  });

  await test.step("a wrong current password is rejected", async () => {
    await page.getByLabel("Current password").fill("Wrong-Password-000!");
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Repeat new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();

    await expect(
      page.getByText("Your current password is incorrect."),
    ).toBeVisible();
  });

  await test.step("the password is changed", async () => {
    await page.getByLabel("Current password").fill(TEST_PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Repeat new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();

    await expect(page.getByText("Password changed")).toBeVisible();
    // This session stays signed in.
    await page.reload();
    await expect(page).toHaveURL(/\/account$/);
  });

  await test.step("only the new password works after signing out", async () => {
    await page.getByRole("button", { name: /^Sign out/ }).click();
    await expect(page).toHaveURL(/\/login$/);

    await signIn(page, TEST_PASSWORD);
    await expect(page.getByText(/^Sign-in failed/)).toBeVisible();

    await signIn(page, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
