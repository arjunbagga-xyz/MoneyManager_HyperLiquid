
import asyncio
from playwright.async_api import async_playwright, expect

async def test_vault_details(page):
    # Navigate to the login page
    await page.goto("http://localhost:8000/account.html")

    # Log in
    await page.fill("#login-username", "testuser")
    await page.fill("#login-password", "testpassword")
    await page.click("button:has-text('Login')")

    # Wait for navigation to the dashboard and then go to vaults page
    await page.wait_for_url("http://localhost:8000/index.html")
    await page.goto("http://localhost:8000/vaults.html")
    await expect(page).to_have_title("Trading Platform - Vaults")

    # Click the first vault to open the details modal
    await page.click(".vault:first-child")

    # Wait for the modal to appear
    await page.wait_for_selector("#vault-details-modal")
    await expect(page.locator("#vault-details-modal")).to_be_visible()

    # Take a screenshot of the modal
    await page.screenshot(path="jules-scratch/verification/vault_details.png")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await test_vault_details(page)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
