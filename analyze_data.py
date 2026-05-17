import pandas as pd
import os
import json

base = r"c:\Users\LENOVO\Desktop\ventes et stocks"

files = []
for root, dirs, filenames in os.walk(base):
    for f in filenames:
        if f.endswith('.xlsx'):
            files.append(os.path.join(root, f))

for fpath in files:
    print("=" * 80)
    print(f"FILE: {fpath}")
    print("=" * 80)
    try:
        xls = pd.ExcelFile(fpath)
        print(f"Sheets: {xls.sheet_names}")
        for sheet in xls.sheet_names:
            df = pd.read_excel(fpath, sheet_name=sheet, header=None)
            print(f"\n--- Sheet: '{sheet}' --- Shape: {df.shape}")
            print("First 15 rows:")
            pd.set_option('display.max_columns', None)
            pd.set_option('display.width', 200)
            pd.set_option('display.max_colwidth', 40)
            print(df.head(15).to_string())
            print()
    except Exception as e:
        print(f"ERROR: {e}")
    print()
