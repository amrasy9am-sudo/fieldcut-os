import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "e2e-password";

async function addBowl(page: Page, slug: string) {
  await page.goto(`/menu/${slug}`);
  await page.getByRole("button", { name: /Add to bag/ }).click();
  await expect(page.getByText("Added to your bag")).toBeVisible();
}

async function fillDetails(page: Page, phone: string) {
  await page.fill("input[name=name]", "Aina Sofea");
  await page.fill("input[name=phone]", phone);
  await page.selectOption("select[name=area]", "sitiawan");
  await page.fill("input[name=address]", "No. 12, Jalan Cempaka 4, Taman Desa");
}

test.describe.configure({ mode: "serial" });

let ref = "";
let verifyCode = "";

test("customer builds a bowl and sees live macros and price", async ({ page }) => {
  await page.goto("/menu/field-classic");
  await page.getByRole("button", { name: /Roasted Sesame/ }).click();
  await page.getByRole("button", { name: "More Extra egg" }).click();
  await page.getByRole("button", { name: "More bowls" }).click();
  await expect(page.getByRole("button", { name: /Add to bag · RM34\.80/ })).toBeVisible();
  await expect(page.getByText("492", { exact: false }).first()).toBeVisible(); // 430 − 105 + 95 + 72
  await page.getByRole("button", { name: /Add to bag/ }).click();
  await expect(page.getByText("Added to your bag")).toBeVisible();
});

test("new customers are limited to RM60, then the order is placed and handed to WhatsApp", async ({ page }) => {
  // 2 × RM15.90 + RM26.90 + RM5 delivery = RM63.70 — over the RM60 first-order limit.
  await addBowl(page, "field-classic");
  await addBowl(page, "field-classic");
  await addBowl(page, "harbour-salmon");
  await page.goto("/checkout");
  await fillDetails(page, "012-345 6789");
  await page.locator("[aria-label='Delivery slot'] button").nth(1).click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText("First orders are limited to RM60")).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).last().click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL(/\/order\/FC-\d{6}-[0-9A-Z]{5}$/);
  ref = page.url().split("/").pop()!;

  const href = (await page.getByRole("link", { name: /Open WhatsApp/ }).getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/60142434391?text=")).toBe(true);
  const message = decodeURIComponent(href.split("text=")[1]);
  expect(message).toContain(`Ref: *${ref}*`);
  verifyCode = /Verify: ([0-9A-Z]{4}-[0-9A-Z]{4})/.exec(message)![1];
});

test("tracking needs the phone's last 4 digits on another device", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/t/${ref}`);
  await page.fill("input[name=last4]", "0000");
  await page.getByRole("button", { name: "Show my order" }).click();
  await expect(page.getByText(/couldn't find an order/)).toBeVisible();
  await page.fill("input[name=last4]", "6789");
  await page.getByRole("button", { name: "Show my order" }).click();
  await expect(page.getByText("Order received")).toBeVisible();
});

test("owner verifies, preps, delivers and settles the order", async ({ page }) => {
  await page.goto("/console");
  await page.waitForURL(/\/console\/login/);
  await page.fill("input[name=password]", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console$/);

  await page.goto(`/console/orders/${ref}`);
  await page.fill("input[name=code]", "AAAA-BBBB");
  await page.getByRole("button", { name: "Verify & confirm" }).click();
  await expect(page.getByText(/doesn't match/)).toBeVisible();
  await page.fill("input[name=code]", verifyCode);
  await page.getByRole("button", { name: "Verify & confirm" }).click();
  await expect(page.getByText("Verify code matched")).toBeVisible();

  const back = await page.getByRole("link", { name: /← Orders/ }).getAttribute("href");
  const date = /date=(\d{4}-\d{2}-\d{2})/.exec(back!)![1];

  await page.goto(`/console/production?date=${date}`);
  await page.getByRole("button", { name: /Lock day/ }).click();
  await expect(page.getByText(/Locked/)).toBeVisible();
  await page.getByRole("button", { name: "Packed" }).first().click();

  await page.goto(`/console/routes?date=${date}`);
  await page.getByRole("button", { name: "Out for delivery" }).first().click();
  await page.getByRole("button", { name: "Handed over & settled" }).first().click();
  await expect(page.getByText("Settled").first()).toBeVisible();
});

test("console pages render", async ({ page }) => {
  await page.goto("/console/login");
  await page.fill("input[name=password]", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console$/);
  for (const [path, text] of [
    ["/console/menu", "bill of materials"],
    ["/console/capacity", "Next 14 days"],
    ["/console/customers", "Tier rules"],
    ["/console/reports", "Bowl mix"],
    ["/console/labels", "Labels"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByText(text).first()).toBeVisible();
  }
});
