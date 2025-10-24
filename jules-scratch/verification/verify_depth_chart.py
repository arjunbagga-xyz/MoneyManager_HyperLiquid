from playwright.sync_api import sync_playwright, expect
import time
import random
import string

def get_random_string(length):
    # choose from all lowercase letter
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
    try: #if on login page
        page.get_by_role("link", name="Register").click()
        expect(page).to_have_url("http://localhost:8000/register.html")
    except: #if on register page
        pass

    page.get_by_label("Username").fill(username)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Register").click()

    # Wait for registration to complete and navigate to login page
    expect(page).to_have_url("http://localhost:8000/")

    # Login
    page.get_by_label("Username").fill(username)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Login").click()

    # Wait for login to complete and navigate to dashboard
    expect(page).to_have_url("http://localhost:8000/dashboard.html")

    # Go to trading page
    page.goto("http://localhost:8000/trading.html")

    # Wait for the page to load and charts to render
    page.wait_for_selector("#depth-chart-container")

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/depth_chart.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
