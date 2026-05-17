import pandas as pd
import json
import re

def clean_name(name):
    if pd.isna(name):
        return ""
    name = str(name).strip().upper()
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name)
    return name

def process():
    # Read excel CM file
    excel_path = 'Sur site/CHAMBI 2025 SALES.xlsx'
    df_excel = pd.read_excel(excel_path)
    print("Excel Products:")
    print(df_excel)
    
    # Read local products
    local_path = 'sales-dashboard/public/local_sales_data.json'
    with open(local_path, 'r', encoding='utf-8') as f:
        local_data = json.load(f)
    
    local_products = sorted(list(set(item['libelle'] for item in local_data)))
    print("\nLocal Products in JSON:")
    for p in local_products:
        print(f"  - {p}")
        
    # Create a mapping dictionary
    mapping = {}
    
    # Manual high-fidelity mapping based on product parameters
    for excel_idx, excel_row in df_excel.iterrows():
        sku = str(excel_row['SKU']).strip()
        amc = excel_row['AMC']
        if pd.isna(amc):
            amc = 0.0
            
        sku_clean = sku.upper()
        
        # Match Celebrex
        if 'CELEBREX' in sku_clean:
            tokens = re.findall(r'\b\d+\b', sku_clean)
            if '30' in tokens:
                mapping['CELEBREX 200mg B/30 GELULES'] = amc
            elif '20' in tokens:
                mapping['CELEBREX 200mg B/20 GELULES'] = amc
            elif '10' in tokens:
                mapping['CELEBREX 200mg B/10 GELULES'] = amc
                
        # Match Amlor
        elif 'AMLOR' in sku_clean:
            if '10 MG' in sku_clean:
                mapping['Amlor 10mg HFC 2X15 BLST TN'] = amc
            elif '5 MG COMP X 30' in sku_clean:
                mapping['AMLOR 5mg B/30 CP'] = amc
            elif '5 MG COMP X 90' in sku_clean:
                mapping['AMLOR 5mg TAB 15x6 BLST TN'] = amc
                
        # Match Tahor
        elif 'TAHOR' in sku_clean:
            if '10 MG' in sku_clean:
                if '28' in sku_clean or '28' in sku_clean or '28' in sku_clean:
                    mapping['TAHOR 10MG FCT 4x7 BLST TN'] = amc
                elif '91' in sku_clean:
                    mapping['TAHOR 10 mg B/91'] = amc
            elif '20' in sku_clean:
                if '28' in sku_clean:
                    mapping['TAHOR 20MG FCT 4X7 BLST TN'] = amc
                elif '91' in sku_clean:
                    mapping['TAHOR 20MG B/91'] = amc
            elif '40' in sku_clean:
                if '28' in sku_clean:
                    mapping['TAHOR 40MG B/28'] = amc
                elif '91' in sku_clean:
                    mapping['TAHOR 40MG B/91'] = amc
                    
        # Match Zoloft
        elif 'ZOLOFT' in sku_clean:
            if '30' in sku_clean or 'B30' in sku_clean:
                mapping['ZOLOFT 50 MG BOITE DE 30 CPS'] = amc
            elif '15' in sku_clean:
                mapping['ZOLOFT 50mg B/15 CP'] = amc

    print("\nGenerated Mapping:")
    for k, v in mapping.items():
        print(f"  {k} => {v}")
        
    # Write to cm_data.json
    out_path = 'sales-dashboard/public/cm_data.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f"\nSaved mapping to {out_path}")

if __name__ == '__main__':
    process()
