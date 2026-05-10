import requests
r = requests.get('http://localhost:5000/api/nodes')
print('Status:', r.status_code)
data = r.json()
print('Nodes count:', len(data.get('nodes', [])))
print('First 3 nodes:', data.get('nodes', [])[:3])