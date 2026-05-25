import pandas as pd
import os
import json
import re
import pdfplumber

def clean_client_name(name):
    if pd.isna(name):
        return "INCONNU"
    name = str(name).strip()
    name = re.sub(r'(?i)\b(AVRIL|MARS|FEV)\b.*$', '', name)
    name = re.sub(r'\d+$', '', name)
    return name.upper().strip()

def standardize_product(name):
    n = name.upper()
    if 'AMLOR' in n:
        if '10' in n and '30' in n: return 'Amlor 10mg HFC 2X15 BLST TN'
        if '5' in n and ('90' in n or '15X6' in n): return 'AMLOR 5mg TAB 15x6 BLST TN'
        if '5' in n and '30' in n: return 'AMLOR 5mg B/30 CP'
    elif 'CELEBREX' in n:
        if re.search(r'\b10\b|B/10|BT10|BT\s+10|B10', n): return 'CELEBREX 200mg B/10 GELULES'
        if re.search(r'\b20\b|B/20|BT20|BT\s+20|B20|\(20\)', n): return 'CELEBREX 200mg B/20 GELULES'
        if re.search(r'\b30\b|B/30|BT30|BT\s+30|B30|\(30\)', n): return 'CELEBREX 200mg B/30 GELULES'
        if '30' in n: return 'CELEBREX 200mg B/30 GELULES'
    elif 'ZOLOFT' in n:
        if '15' in n: return 'ZOLOFT 50mg B/15 CP'
        if '30' in n: return 'ZOLOFT 50 MG BOITE DE 30 CPS'
    elif 'TAHOR' in n:
        if '10' in n and '91' in n: return 'TAHOR 10 mg B/91'
        if '10' in n and ('28' in n or '7' in n): return 'TAHOR 10MG FCT 4x7 BLST TN'
        if '20' in n and '91' in n: return 'TAHOR 20MG B/91'
        if '20' in n and ('28' in n or '7' in n): return 'TAHOR 20MG FCT 4X7 BLST TN'
        if '40' in n and '28' in n: return 'TAHOR 40MG B/28'
        if '40' in n and '91' in n: return 'TAHOR 40MG B/91'
        if '80' in n and '28' in n: return 'TAHOR 80MG CP B/28'
    elif 'DEBRIDAT' in n:
        if '100' in n: return 'DEBRIDAT 100 MG B/30'
        if '200' in n: return 'DEBRIDAT 200 MG B/15'
    elif 'DIFLU' in n or 'DIFLUCAN' in n:
        if '150' in n and '4' in n: return 'DIFLUCAN 150MG B/4'
        if '150' in n and '1' in n: return 'DIFLUCAN 150MG B/1'
    elif 'FELDENE' in n:
        if re.search(r'\b10\b|B/10|BT10|B10', n): return 'FELDENE 20MG B/10'
        if re.search(r'\b20\b|B/20|BT20|B20', n): return 'FELDENE 20MG B/20'
    elif 'VIBRA' in n:
        if '100' in n: return 'VIBRAMYCINE 100MG B/10'
        if '200' in n: return 'VIBRAMYCINE 200MG B/8'
    elif 'ZITHROMAX' in n:
        return 'ZITHROMAX 500MG B/3'
    elif 'LINCOCINE' in n:
        return 'LINCOCINE 600MG AMP'
    
    return name


def process_march_data():
    base_path = r"c:\Users\LENOVO\Desktop\ventes et stocks\Sur site\March\March"
    all_data = []

    # 1. Parse EXPORT_20260331.xlsx
    excel_path = os.path.join(base_path, "EXPORT_20260331.xlsx")
    if os.path.exists(excel_path):
        df_ex = pd.read_excel(excel_path, header=2)
        # Forward fill Customer Name
        df_ex['Customer Name'] = df_ex['Customer Name'].ffill()
        df_ex = df_ex.dropna(subset=['Material Code', 'Material Description', 'Billing Qty'])
        
        subset = df_ex[['Customer Name', 'Material Description', 'Billing Qty']].copy()
        subset.rename(columns={
            'Customer Name': 'nom_client',
            'Material Description': 'libelle',
            'Billing Qty': 'qte'
        }, inplace=True)
        subset['annee'] = '2026'
        subset['mois'] = '03'
        subset['nom_client'] = subset['nom_client'].apply(clean_client_name)
        all_data.append(subset)

    # 2. Parse PDFs
    pdf_files = [f for f in os.listdir(base_path) if f.lower().endswith('.pdf')]
    for pdf_file in pdf_files:
        client_name = pdf_file.lower().replace('.pdf', '').upper()
        # Some special mapping if needed
        if client_name == 'AVICENNE': client_name = 'STE AVICENNE'
        elif client_name == 'GALIEN': client_name = 'SOCIETE GALIEN'
        elif client_name == 'PHARMASUD': client_name = 'PHARMASUD'
        elif client_name == 'PROPHASUD': client_name = 'PROPHASUD'
        elif client_name == 'RUSPINA': client_name = 'RUSPINA PHARMA'
        elif client_name == 'SOPROPHA': client_name = 'SOPROPHA'

        pdf_path = os.path.join(base_path, pdf_file)
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
                
                # regex parsing
                for line in text.split('\n'):
                    line = line.strip()
                    if not line: continue
                    
                    # Pattern 1: Code Qte Designation (e.g. 4833 60 AMLOR 10MG)
                    m1 = re.match(r'^\d+\s+(\d+)\s+([A-Z].*)$', line)
                    if m1:
                        qty = float(m1.group(1))
                        desc = m1.group(2).strip()
                        if 'PFIZER' in desc and len(desc.split()) == 1: continue # skip header lines
                        all_data.append(pd.DataFrame({
                            'nom_client': [client_name],
                            'libelle': [desc],
                            'qte': [qty],
                            'annee': ['2026'],
                            'mois': ['03']
                        }))
                        continue
                    
                    # Pattern 2: Pharmasud format: 300238 AMLOR 5 MG GELU (30) PFIZER 168 1 01/06/2028 156
                    m2 = re.match(r'^\d+\s+([A-Z].+?)\s+(\d+)\s+\d+\s+\d{2}/\d{2}/\d{4}', line)
                    if m2:
                        desc = m2.group(1).strip()
                        qty = float(m2.group(2))
                        all_data.append(pd.DataFrame({
                            'nom_client': [client_name],
                            'libelle': [desc],
                            'qte': [qty],
                            'annee': ['2026'],
                            'mois': ['03']
                        }))
                        continue
        except Exception as e:
            print(f"Error parsing {pdf_file}: {e}")

    # 3. Add Easy Pharma manually (since no OCR)
    easy_pharma_data = [
        {
            'nom_client': 'EASY PHARMA',
            'libelle': 'CELEBREX 200MG GELULES B/30',
            'qte': 60.0,
            'annee': '2026',
            'mois': '03'
        },
        {
            'nom_client': 'EASY PHARMA',
            'libelle': 'ZOLOFT 50MG COMP B/30',
            'qte': 30.0,
            'annee': '2026',
            'mois': '03'
        }
    ]
    if easy_pharma_data:
        all_data.append(pd.DataFrame(easy_pharma_data))

    if not all_data:
        print("No new data found.")
        return

    combined_df = pd.concat(all_data, ignore_index=True)
    combined_df['libelle'] = combined_df['libelle'].astype(str).str.strip().apply(standardize_product)
    combined_df['qte'] = combined_df['qte'].astype(float)
    
    new_records = combined_df.to_dict(orient='records')

    # Load existing JSON
    json_path = r"c:\Users\LENOVO\Desktop\ventes et stocks\sales-dashboard\public\local_sales_data.json"
    with open(json_path, 'r', encoding='utf-8') as f:
        existing_data = json.load(f)

    # Combine data and aggregate
    all_combined = existing_data + new_records
    
    # We need to aggregate by annee, mois, nom_client, libelle
    df_all = pd.DataFrame(all_combined)
    df_all['qte'] = df_all['qte'].astype(float)
    
    aggregated = df_all.groupby(['annee', 'mois', 'nom_client', 'libelle'])['qte'].sum().reset_index()
    aggregated = aggregated.sort_values(['annee', 'mois'])
    
    final_records = aggregated.to_dict(orient='records')

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(final_records, f, ensure_ascii=False, indent=2)
        
    print(f"\nDone! Updated {json_path}")
    print(f"Total records now: {len(final_records)}")

if __name__ == "__main__":
    process_march_data()
