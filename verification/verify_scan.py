import time
from playwright.sync_api import sync_playwright, expect

def test_pos_scan(page):
    # Go to login (assuming we need to login or there is a default dev user)
    page.goto("http://localhost:3000")

    # Simple wait for dev server
    time.sleep(5)

    # Try to find a way to POS
    # For verification purpose, we just want to see if the page loads and if we can trigger a scan
    # Since we don't have a real scanner, we can dispatch a keydown event

    page.screenshot(path="verification/pos_initial.png")

    # Simulate scanning a code
    # We'll use a code that is likely in the seed (e.g. '7791234567890')
    code = "7791234567890"
    for char in code:
        page.keyboard.press(char)
        time.sleep(0.02) # Fast typing
    page.keyboard.press("Enter")

    time.sleep(2)
    page.screenshot(path="verification/pos_after_scan.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            test_pos_scan(page)
        finally:
            browser.close()
