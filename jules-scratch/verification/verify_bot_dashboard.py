from playwright.sync_api import sync_playwright, expect
import time
import random
import string

def get_random_string(length):
    letters = string.ascii_lowercase
    result_str = ''.join(random.choice(letters) for i in range(length))
    return result_str

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    username = "verifier_" + get_random_string(8)
    password = "password"

    # Register
    page.goto("http://localhost:8000/")
    try:
        page.get_by_role("link", name="Register").click()
        expect(page).to_have_url("http://localhost:8000/register.html")
    except:
        pass

    page.get_by_label("Username").fill(username)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Register").click()

    expect(page).to_have_url("http://localhost:8000/")

    # Login
    page.get_by_label("Username").fill(username)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Login").click()

    expect(page).to_have_url("http://localhost:8000/dashboard.html")

    # Go to bot lab
    page.goto("http://localhost:8000/bot_lab.html")

    # Create a bot
    page.get_by_label("Bot Name:").fill("Test Bot")
    page.get_by_label("Python Code:").fill("print('Hello from the bot')")
    page.get_by_role("button", name="Save Bot").click()

    time.sleep(1) # Wait for bot to be created

    # Open dashboard
    page.get_by_role("button", name="View Dashboard").click()

    # Wait for the dashboard to load
    page.wait_for_selector("#bot-dashboard-modal")

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/bot_dashboard.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
