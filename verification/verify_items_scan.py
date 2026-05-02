import time
from playwright.sync_api import sync_playwright, expect

def test_items_scan(page):
    page.goto("http://localhost:3000")
    time.sleep(5)

    # Go to Items page
    page.get_by_role("link", name="Items").click()
    time.sleep(2)

    page.screenshot(path="verification/items_initial.png")

    # Simulate scanning a code
    code = "7799887766554"
    for char in code:
        page.keyboard.press(char)
        time.sleep(0.02)
    page.keyboard.press("Enter")

    time.sleep(2)
    # Check that the dialog is open
    expect(page.get_by_text("Agregar Nuevo Item")).to_be_visible()

    # Check that the barcode filter is EMPTY
    barcode_filter = page.get_by_placeholder("por barcode o sku")
    expect(barcode_filter).to_have_value("")

    page.screenshot(path="verification/items_after_scan.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            test_items_scan(page)
        finally:
            browser.close()
