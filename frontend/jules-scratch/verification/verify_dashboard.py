from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8001")
    # The wallet list is populated dynamically, so we need to wait for it.
    page.wait_for_selector("#wallet-list ul")
    page.screenshot(path="frontend/jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
