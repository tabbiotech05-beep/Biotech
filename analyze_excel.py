import pandas as pd
import os
import json
import traceback

base = r"c:\Users\LENOVO\Desktop\ventes et stocks"

def analyze_excel(fpath):
    print("=" * 80)
    print(f"FILE: {os.path.basename(fpath)}")
    print("=" * 80)
    try:
        xls = pd.ExcelFile(fpath)
        print(f"Sheets: {xls.sheet_names}")
        for sheet in xls.sheet_names:
            df = pd.read_excel(fpath, sheet_name=sheet)
            print(f"\n--- Sheet: '{sheet}' --- Shape: {df.shape}")
            print("Columns:", df.columns.tolist())
            print("Preview (first 5 rows):")
            print(df.head(5).to_string())
            print("-" * 40)
    except Exception as e:
        print(f"ERROR reading {fpath}: {e}")
        # traceback.print_exc()

files = []
for root, dirs, filenames in os.walk(base):
    for f in filenames:
        if f.endswith('.xlsx'):
            files.append(os.path.join(root, f))

for fpath in files:
    analyze_excel(fpath)
