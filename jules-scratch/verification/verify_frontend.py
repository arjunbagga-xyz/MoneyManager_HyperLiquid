from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log in
    page.goto("http://localhost:8000/account.html")
    page.fill("input[name='username']", "testuser")
    page.fill("input[name='password']", "testpassword")
    page.click("button[type='submit']")

    # Wait for navigation to the dashboard
    page.wait_for_url("http://localhost:8000/index.html")

    # Navigate to Vaults page and take screenshot
    page.goto("http://localhost:8000/vaults.html")
    page.screenshot(path="jules-scratch/verification/vaults.png")

    # Navigate to Staking page and take screenshot
    page.goto("http://localhost:8000/staking.html")
    page.screenshot(path="jules-scratch/verification/staking.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
