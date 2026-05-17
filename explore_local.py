import pandas as pd

def explore():
    # March
    df_m = pd.read_excel('tenchi/March Sales Data.xlsx', header=1)
    headers_m = df_m.iloc[0]
    df_m = df_m[1:]
    df_m.columns = headers_m
    df_m = df_m.dropna(subset=['Material Code'])
    print("March Unique Customers:")
    if 'Customer Name' in df_m.columns:
        print(df_m['Customer Name'].unique())
    
    # April
    df_a = pd.read_excel('tenchi/April Sales Data.xlsx', skiprows=3)
    print("\nApril Unique Cust.PO No.:")
    if 'Cust.PO No.' in df_a.columns:
        print(df_a['Cust.PO No.'].dropna().unique())

if __name__ == '__main__':
    explore()
