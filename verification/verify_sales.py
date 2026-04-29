import asyncio
from playwright.async_api import async_playwright, expect

async def test_sales_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Login
        await page.goto("http://localhost:3001/login")
        await page.fill('input[type="email"]', "admin@openventa.com.ar")
        await page.fill('input[type="password"]', "password")
        await page.click('button[type="submit"]')

        # Wait for navigation to dashboard/pos
        await page.wait_for_url("**/pos", timeout=60000)
        print("Logged in successfully")

        await page.goto("http://localhost:3001/reports")

        # Wait for table to load
        try:
            await page.wait_for_selector('table', timeout=10000)
        except:
            print("Table not found or timeout")

        await page.screenshot(path="verification/reports.png")

        # Open sale detail if any
        # Since fresh DB, I'll need to create a sale via UI first or just check the dialog if it was already open.
        # But wait, seeder didn't create sales.

        # Let's create a quick sale in POS
        await page.goto("http://localhost:3001/pos")
        await page.wait_for_selector('text=Esta venta')

        # Add a quick item
        await page.click('button:has-text("Ítem rápido")')
        await page.fill('input[placeholder="Nombre del ítem"]', "Item Test")
        await page.fill('input[placeholder="0.00"]', "100")
        await page.click('button:has-text("Agregar")')

        # Charge
        await page.click('button:has-text("Cobrar")')

        # Open cash register if closed
        if await page.get_by_text("La caja registradora está cerrada").is_visible():
            await page.fill('input[placeholder="0.00"]', "1000")
            await page.click('button:has-text("Abrir caja")')
            # wait a bit
            await asyncio.sleep(2)
            # click cobrar again
            await page.click('button:has-text("Cobrar")')

        # Select cash and complete
        await page.click('button:has-text("Efectivo")')
        await page.click('button:has-text("Siguiente")')
        await page.click('button:has-text("Confirmar")')
        await page.click('button:has-text("Finalizar")')

        # Now go back to reports and check
        await page.goto("http://localhost:3001/reports")
        await page.wait_for_selector('button:has(svg.lucide-eye)')
        await page.click('button:has(svg.lucide-eye)')

        await page.wait_for_selector('text=Detalle de venta')
        await page.screenshot(path="verification/sale_detail.png")

        # Check text
        cancel_btn = page.get_by_text("Cancelar venta")
        await expect(cancel_btn).to_be_visible()

        # Mobile view
        await page.set_viewport_size({'width': 375, 'height': 812})
        await page.screenshot(path="verification/sale_detail_mobile.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_sales_ui())
