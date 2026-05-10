import pandas as pd
df = pd.read_csv('data/processed/nodes.csv')
ids = []
cannot_parse = []
for i, row in df.iterrows():
    s = str(row['id']).strip()
    if s.startswith('N') or s.startswith('I'):
        ids.append(int(s[1:]))
    else:
        cannot_parse.append(f"{row['id']} ({row['name']})")
print(f'Parsed: {len(ids)} / 149')
if cannot_parse:
    print('Cannot parse:')
    for x in cannot_parse:
        print(x)