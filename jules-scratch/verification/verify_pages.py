from playwright.sync_api import sync_playwright, expect
import time

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    unique_username = f"testuser_{int(time.time())}"

    try:
        # --- Registration and Login ---
        page.goto("http://localhost:8000/account.html")
        page.locator("#register-username").fill(unique_username)
        page.locator("#register-password").fill("password")
        page.locator("#register-form button").click()
        expect(page.locator("#auth-message")).to_contain_text("Registration successful", timeout=10000)

        page.locator("#login-username").fill(unique_username)
        page.locator("#login-password").fill("password")
        page.locator("#login-form button").click()

        # The original auth.js redirects to index.html on successful login
        expect(page).to_have_url("http://localhost:8000/index.html", timeout=10000)
        print("Login successful, redirected to Dashboard.")

        # --- Dashboard Screenshot ---
        expect(page.locator("#portfolio-chart")).to_be_visible(timeout=10000)
        page.screenshot(path="jules-scratch/verification/01_dashboard.png")
        print("Captured dashboard screenshot.")

        # --- Trading Page Screenshot ---
        print("Navigating to Trading Page...")
        page.goto("http://localhost:8000/trading.html")
        expect(page.locator("#price-chart")).to_be_visible(timeout=10000)
        page.screenshot(path="jules-scratch/verification/02_trading.png")
        print("Captured trading page screenshot.")

        # --- Bot Lab Screenshot ---
        print("Navigating to Bot Lab...")
        page.goto("http://localhost:8000/bot_lab.html")
        expect(page.locator("#bot-list-section")).to_be_visible(timeout=10000)
        page.screenshot(path="jules-scratch/verification/03_bot_lab.png")
        print("Captured Bot Lab screenshot.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
