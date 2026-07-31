import os
import sys
import json
import subprocess
from jinja2 import Template

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
JSON_PATH = os.path.join(ROOT_DIR, "data", "cv_data.json")
TEMPLATE_PATH = os.path.join(BASE_DIR, "template.html")
OUTPUT_HTML_PATH = os.path.join(BASE_DIR, "rendered.html")
OUTPUT_PDF_PATH = os.path.join(ROOT_DIR, "ui", "resume.pdf")

def check_dependencies():
    """Ensure required packages and playwright browsers are installed."""
    print("Checking dependencies...")
    
    # Check for jinja2
    try:
        from jinja2 import Template
    except ImportError:
        print("Installing jinja2...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "jinja2"])
        from jinja2 import Template

    # Check for playwright
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Installing playwright package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        from playwright.sync_api import sync_playwright

    # Ensure chromium browser is installed for playwright
    print("Ensuring Playwright Chromium is installed...")
    try:
        # Run playwright install chromium. If already installed, it completes quickly.
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    except subprocess.CalledProcessError as e:
        print(f"Warning: Failed to run 'playwright install chromium': {e}")
        print("Will attempt to run generation anyway.")

def generate_pdf():
    # 1. Read the CV data from JSON
    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found.")
        sys.exit(1)
        
    print(f"Reading CV data from {JSON_PATH}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        cv_data = json.load(f)

    # 2. Read the HTML template
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: {TEMPLATE_PATH} not found.")
        sys.exit(1)

    print(f"Reading HTML template from {TEMPLATE_PATH}...")
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template_content = f.read()

    # 3. Render HTML using Jinja2
    print("Rendering HTML template...")
    template = Template(template_content)
    rendered_html = template.render(**cv_data)

    # Write rendered HTML to a temporary file
    with open(OUTPUT_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(rendered_html)
    print(f"HTML rendered successfully to {OUTPUT_HTML_PATH}")

    # 4. Remove old PDF if it already exists
    if os.path.exists(OUTPUT_PDF_PATH):
        os.remove(OUTPUT_PDF_PATH)
        print(f"Removed existing PDF: {OUTPUT_PDF_PATH}")

    # 5. Use Playwright to print HTML to PDF
    print("Launching Playwright to print HTML to PDF...")
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the local rendered HTML file
        file_url = f"file://{os.path.abspath(OUTPUT_HTML_PATH)}"
        page.goto(file_url)
        
        # Print page to PDF with standard letter format, 0.5 in margins (controlled by A4/Letter size)
        page.pdf(
            path=OUTPUT_PDF_PATH,
            format="Letter",
            print_background=True,
            display_header_footer=False,
            prefer_css_page_size=True # respect CSS @page configuration
        )
        browser.close()
        
    print(f"PDF CV successfully exported to: {OUTPUT_PDF_PATH}")
    
    # Remove the temporary rendered HTML file
    if os.path.exists(OUTPUT_HTML_PATH):
        os.remove(OUTPUT_HTML_PATH)
        print("Cleaned up temporary HTML file.")

if __name__ == "__main__":
    check_dependencies()
    generate_pdf()
