from bs4 import BeautifulSoup

html_doc = open('index.html', 'r', encoding='utf-8').read()
soup = BeautifulSoup(html_doc, 'html.parser')

strings_to_translate = [
    "Quality Testing", "Solid Content", "Dilutant Needed", "Flow Rate", "Blending", "Mixed Packing", "Filling Time",
    "Solid Content %", "Tray Weight", "Sample Net Weight", "Gross Wt. After Heating", "Solid Residue (Gross − Tray)",
    "Weight of the empty tray (grams)", "Weight of sample taken (grams)", "Tray + sample weight after heating (grams)",
    "Calculate Solid Content", "Result", "New Test", "grams", "kg", "sec", "min", "hr", "hrs", "L", "LPM", "LPH",
    "Present Solid %", "Present Batch Weight", "Expected Solid %", "Current solid percentage of the batch",
    "Current total weight of the batch", "Desired solid percentage after adding water", "Calculate Dilutant Needed",
    "Add", "of dilutant to the batch", "New Total Weight", "Dilutant to Add",
    "Total Quantity", "Total Time Taken", "Specific Gravity", "Total weight of material (kg)",
    "Hours, Minutes, Seconds", "Density relative to water (e.g. 1.05)", "Calculate Flow Rate",
    "Material flow at standard intervals", "Total Volume", "Flow Rate (per minute)", "Flow Rate (per hour)",
    "Chemical Blending", "Chem 1 %", "Chem 2 %", "Mix %", "Chemical 1 %", "Chemical 2 %", "Desired Mixture %",
    "Percentage of the first chemical", "Percentage of the second chemical", "Target percentage for the mixture",
    "Calculate Mixing Ratio", "For every 1 kg of Chemical 1, add:", "For every 1 kg of Chemical 2, add:",
    "Mixed Packing Quantity", "Packing Qty", "Packing Quantity", "Total batch size needed", "Calculate Packing Qty",
    "Chemical 1 — Add:", "Chemical 2 — Add:", "Sample Time", "Sample Quantity", "Total Weight",
    "Time taken to fill the sample (minutes)", "Weight filled during sample time", "Total quantity that needs to be filled",
    "Calculate Filling Time", "Estimated Filling Time", "Total Minutes", "Total Qty (kg)",
    "= Chem 1 qty (kg)", "= Ratio", "= Flow Rate (LPM, LPH)", "− Batch Wt. = Dilutant to Add", "= Total Time (min)",
    "1 minute", "5 minutes", "10 minutes", "30 minutes", "1 hour", "10 sec", "15 sec", "20 sec", "25 sec", "30 sec",
    "Hebbar Chemicals"
]

for tag in soup.find_all(string=True):
    parent = tag.parent
    text = tag.strip()
    if text in strings_to_translate:
        if not parent.has_attr('data-i18n'):
            parent['data-i18n'] = text

# Add placeholder translations manually
for input_tag in soup.find_all('input', placeholder=True):
    parent = input_tag
    ph = parent['placeholder']
    if not parent.has_attr('data-i18n-ph'):
        parent['data-i18n-ph'] = ph

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(str(soup))

print("Added data-i18n tags.")
