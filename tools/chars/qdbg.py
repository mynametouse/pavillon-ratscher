import sys, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pg = b.new_page()
    pg.goto('http://localhost:8811/chars/rt.html'); pg.wait_for_function('window.ready', timeout=60000)
    for u in sys.argv[1].split(','): print(u); [print('  ', k, v) for k, v in pg.evaluate(f"turnTest('{u}')").items()]
    b.close()
