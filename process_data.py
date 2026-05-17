import pandas as pd
import os
import json

def process_files():
    base_path = 'tenchi'
    files = os.listdir(base_path)
    
    # Filter only Ventes xlsx files
    target_files = []
    for f in files:
        if f.endswith('.xlsx') and ('2025' in f or '2026' in f) and 'Ventes' in f:
            target_files.append(os.path.join(base_path, f))
    
    print(f"Found {len(target_files)} files to process:")
    for f in target_files:
        print(f"  - {f}")
    
    all_data = []
    
    for file_path in target_files:
        print(f"Processing {file_path}...")
        try:
            df = pd.read_excel(file_path)
            print(f"  Columns: {list(df.columns)}")
            print(f"  Rows: {len(df)}")
            subset = df[['LIBELLE', 'NOM_CLIENT', 'ANNEE', 'MOIS', 'QTE']].copy()
            all_data.append(subset)
        except Exception as e:
            print(f"  Error: {e}")
            
    if not all_data:
        print("No data found.")
        return

    combined_df = pd.concat(all_data, ignore_index=True)
    
    # Clean up names
    combined_df['LIBELLE'] = combined_df['LIBELLE'].astype(str).str.strip()
    combined_df['NOM_CLIENT'] = combined_df['NOM_CLIENT'].astype(str).str.strip()
    combined_df.dropna(subset=['ANNEE', 'MOIS', 'QTE'], inplace=True)
    combined_df['ANNEE'] = combined_df['ANNEE'].astype(int)
    combined_df['MOIS'] = combined_df['MOIS'].astype(int)
    combined_df['QTE'] = combined_df['QTE'].astype(float)
    
    # Group by and sum quantities
    aggregated = combined_df.groupby(['ANNEE', 'MOIS', 'NOM_CLIENT', 'LIBELLE'])['QTE'].sum().reset_index()
    aggregated = aggregated.sort_values(['ANNEE', 'MOIS'])
    aggregated['date'] = aggregated.apply(lambda row: f"{row['ANNEE']}-{int(row['MOIS']):02d}", axis=1)
    
    wholesalers = sorted(aggregated['NOM_CLIENT'].unique().tolist())
    products = sorted(aggregated['LIBELLE'].unique().tolist())
    dates = sorted(aggregated['date'].unique().tolist())
    
    records = aggregated[['date', 'NOM_CLIENT', 'LIBELLE', 'QTE']].rename(columns={
        'NOM_CLIENT': 'wholesaler',
        'LIBELLE': 'product',
        'QTE': 'quantity'
    }).to_dict(orient='records')
    
    result = {
        'wholesalers': wholesalers,
        'products': products,
        'dates': dates,
        'data': records
    }
    
    os.makedirs('sales-dashboard/public', exist_ok=True)
    
    with open('sales-dashboard/public/sales_data.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"\nDone! Saved sales-dashboard/public/sales_data.json")
    print(f"  {len(wholesalers)} wholesalers")
    print(f"  {len(products)} products")
    print(f"  {len(dates)} months")
    print(f"  {len(records)} records")

if __name__ == "__main__":
    process_files()
