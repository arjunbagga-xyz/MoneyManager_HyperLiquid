
import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    base_url = "http://localhost:8000"

    # Log in
    page.goto(f"{base_url}/account.html")
    login_form = page.locator("#login-form")
    login_form.get_by_label("Username").fill("testuser")
    login_form.get_by_label("Password").fill("testpassword")
    login_form.get_by_role("button", name="Login").click()

    # Wait for successful login and redirect to dashboard
    expect(page).to_have_url(re.compile(r".*index.html"))

    # Navigate to the account page
    page.goto(f"{base_url}/account.html")

    # Wait for the wallet management section to be visible
    expect(page.locator("#wallet-management")).to_be_visible()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/wallet_management.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
