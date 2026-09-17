import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio, httpx, json, os

async def run_qa():
    # Create dummy pdf
    dummy_file_path = "test_doc.pdf"
    with open(dummy_file_path, "wb") as f:
        f.write(b"%PDF-1.4\n%Dummy PDF content\n")
        
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=15) as c:
        # User A
        regA = await c.post('/auth/register', json={'full_name':'A','email':'a@test.com','mobile':'111','password':'test'})
        loginA = await c.post('/auth/login', data={'username':'a@test.com','password':'test'})
        tokA = loginA.json()['access_token']
        hA = {'Authorization': f'Bearer {tokA}'}
        await c.post('/api/startups', json={'name':'Startup A','industry':'SaaS','stage':'MVP'}, headers=hA)
        
        # User B
        regB = await c.post('/auth/register', json={'full_name':'B','email':'b@test.com','mobile':'222','password':'test'})
        loginB = await c.post('/auth/login', data={'username':'b@test.com','password':'test'})
        tokB = loginB.json()['access_token']
        hB = {'Authorization': f'Bearer {tokB}'}
        await c.post('/api/startups', json={'name':'Startup B','industry':'SaaS','stage':'MVP'}, headers=hB)

        print(f"Auth A: {loginA.status_code}, Auth B: {loginB.status_code}")

        # User A uploads a document
        with open(dummy_file_path, "rb") as f:
            r_up = await c.post('/api/uploads', data={'doc_type': 'pitch_deck'}, files={'file': ('test_doc.pdf', f, 'application/pdf')}, headers=hA)
        doc = r_up.json()
        doc_id = doc['id']
        print(f"Upload A: {r_up.status_code} | Doc ID: {doc_id}")
        
        # Valid View
        r_view = await c.get(f'/api/uploads/{doc_id}/view', headers=hA)
        print(f"Valid View A: {r_view.status_code} | Disposition: {r_view.headers.get('content-disposition')}")

        # Valid Download
        r_dl = await c.get(f'/api/uploads/{doc_id}/download', headers=hA)
        print(f"Valid Download A: {r_dl.status_code} | Disposition: {r_dl.headers.get('content-disposition')}")

        # Unauthorized Access (User B tries to download User A's doc)
        r_unauth = await c.get(f'/api/uploads/{doc_id}/download', headers=hB)
        print(f"Unauthorized B -> A: {r_unauth.status_code} (expect 403)")

        # Invalid Document
        r_inv = await c.get(f'/api/uploads/9999/download', headers=hA)
        print(f"Invalid Doc: {r_inv.status_code} (expect 404)")

        # Path Traversal Security Test
        # Attempt to access something via raw static files (this used to be possible)
        r_trav = await c.get('/files/../routers.py', headers=hA)
        print(f"Static Files /files path access: {r_trav.status_code} (expect 404 since we removed it)")
        
        print("\nQA COMPLETE")
        os.remove(dummy_file_path)

asyncio.run(run_qa())
