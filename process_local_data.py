import pandas as pd
import os
import json
import re

def clean_client_name(name):
    if pd.isna(name):
        return "INCONNU"
    name = str(name).strip()
    name = re.sub(r'(?i)\b(AVRIL|MARS|FEV)\b.*$', '', name)
    name = re.sub(r'\d+$', '', name)
    name = name.strip()
    return name.upper()

def process_files():
    base_path = 'tenchi'
    all_data = []
    
    # 1. Process March Data
    march_file = os.path.join(base_path, 'March Sales Data.xlsx')
    if os.path.exists(march_file):
        df_m = pd.read_excel(march_file, header=1)
        headers_m = df_m.iloc[0]
        df_m = df_m[1:]
        df_m.columns = headers_m
        
        df_m = df_m.dropna(subset=['Material Code'])
        if 'Customer Name' in df_m.columns and 'Material Description' in df_m.columns and 'Billing Qty' in df_m.columns:
            subset = df_m[['Customer Name', 'Material Description', 'Billing Qty']].copy()
            subset.rename(columns={
                'Customer Name': 'nom_client',
                'Material Description': 'libelle',
                'Billing Qty': 'qte'
            }, inplace=True)
            subset['annee'] = '2026'
            subset['mois'] = '03'
            subset['nom_client'] = subset['nom_client'].apply(clean_client_name)
            all_data.append(subset)
    
    # 2. Process April Data
    april_file = os.path.join(base_path, 'April Sales Data.xlsx')
    if os.path.exists(april_file):
        df_a = pd.read_excel(april_file, skiprows=3)
        df_a = df_a.dropna(subset=['Material Code'])
        if 'Cust.PO No.' in df_a.columns and 'Material Description' in df_a.columns and 'Billing Qty' in df_a.columns:
            subset = df_a[['Cust.PO No.', 'Material Description', 'Billing Qty']].copy()
            subset.rename(columns={
                'Cust.PO No.': 'nom_client',
                'Material Description': 'libelle',
                'Billing Qty': 'qte'
            }, inplace=True)
            subset['annee'] = '2026'
            subset['mois'] = '04'
            subset['nom_client'] = subset['nom_client'].apply(clean_client_name)
            all_data.append(subset)
            
    if not all_data:
        print("No data found.")
        return
        
    combined_df = pd.concat(all_data, ignore_index=True)
    
    combined_df['libelle'] = combined_df['libelle'].astype(str).str.strip()
    combined_df['nom_client'] = combined_df['nom_client'].astype(str).str.strip()
    combined_df['qte'] = combined_df['qte'].astype(float)
    
    aggregated = combined_df.groupby(['annee', 'mois', 'nom_client', 'libelle'])['qte'].sum().reset_index()
    aggregated = aggregated.sort_values(['annee', 'mois'])
    
    records = aggregated.to_dict(orient='records')
    
    os.makedirs('sales-dashboard/public', exist_ok=True)
    out_path = 'sales-dashboard/public/local_sales_data.json'
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
        
    print(f"\nDone! Saved {out_path}")
    print(f"  {len(records)} records")

if __name__ == "__main__":
    process_files()
