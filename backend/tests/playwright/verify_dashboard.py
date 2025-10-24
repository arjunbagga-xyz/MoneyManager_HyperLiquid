
import asyncio
from playwright.async_api import async_playwright, expect

async def test_dashboard(page):
    # Navigate to the login page
    await page.goto("http://localhost:8000/account.html")

    # Log in
    await page.fill("#login-username", "testuser")
    await page.fill("#login-password", "testpassword")
    await page.click("button:has-text('Login')")

    # Wait for navigation to the dashboard
    await page.wait_for_url("http://localhost:8000/index.html")
    await expect(page).to_have_title("Trading Platform - Dashboard")

    # Click the first wallet to load its data
    await page.click("#wallet-list li:first-child")

    # Give the UI a moment to update with the wallet data
    await page.wait_for_timeout(1000)

    # Verify that the new tabs are visible
    await expect(page.get_by_text("Order History")).to_be_visible()
    await expect(page.get_by_text("Trade History")).to_be_visible()

    # Take a screenshot for good measure
    await page.screenshot(path="jules-scratch/verification/verification.png")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await test_dashboard(page)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
