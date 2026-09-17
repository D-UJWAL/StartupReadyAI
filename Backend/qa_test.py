import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio, httpx, json

async def run_qa():
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000') as c:
        # Auth
        r = await c.post('/auth/register', json={'full_name':'QA User456','email':'qa_p456b@test.com','mobile':'9999999990','password':'test123'})
        r2 = await c.post('/auth/login', data={'username':'qa_p456b@test.com','password':'test123'})
        tok = r2.json()['access_token']
        h = {'Authorization': f'Bearer {tok}'}

        # Create startup
        await c.post('/api/startups', json={'name':'QA Startup','industry':'SaaS','stage':'MVP'}, headers=h)
        me = await c.get('/api/me', headers=h)
        sid = me.json()['startup_id']
        print(f'Startup ID: {sid}')

        # P6-A: Save Step 1 with real data, check score
        step1_data = {'summary':'We help founders raise capital efficiently','vision':'A world where every startup succeeds'}
        score1 = 30 + sum(10 if len(v)>100 else 5 if len(v)>20 else 2 for v in step1_data.values())
        score1 = min(score1, 100)
        r = await c.post('/api/evaluations', json={'step':1,'score':score1,'data':json.dumps(step1_data)}, headers=h)
        print(f'P6-A Step1 save: HTTP {r.status_code}, score={score1}')

        # P5: Save Step 8 as skipped
        step8_skipped = {'_skipped': True}
        r = await c.post('/api/evaluations', json={'step':8,'score':30,'data':json.dumps(step8_skipped)}, headers=h)
        print(f'P5 Step8 skip: HTTP {r.status_code}')

        evals = await c.get('/api/evaluations', headers=h)
        step8_eval = next((e for e in evals.json() if e['step']==8), None)
        if step8_eval:
            parsed = json.loads(step8_eval['data'])
            skipped_flag = parsed.get('_skipped')
            print(f'P5 Step8 skipped flag = {skipped_flag} (expect True)')

        # P5: Complete Step 8 later
        step8_full = {'annual_revenue':'45L','burn_rate':'5L per month','runway':'9 months'}
        score8 = 30 + sum(2 for v in step8_full.values() if str(v).strip())
        r = await c.post('/api/evaluations', json={'step':8,'score':score8,'data':json.dumps(step8_full)}, headers=h)
        print(f'P5 Step8 complete: HTTP {r.status_code}, score={score8}')

        evals = await c.get('/api/evaluations', headers=h)
        step8_eval = next((e for e in evals.json() if e['step']==8), None)
        if step8_eval:
            parsed = json.loads(step8_eval['data'])
            print(f'P5 Step8 after fill: _skipped={parsed.get("_skipped")}, has revenue={"annual_revenue" in parsed}')

        # P1 Regression: AI Generate
        r = await c.post('/api/ai/generate', json={'action':'generate','context':'Problem Statement'}, headers=h)
        text = r.json()['text']
        print(f'P1 Generate: HTTP {r.status_code}, text_len={len(text)}, starts_with={text[:40]}')

        # P1 Regression: AI Improve
        r = await c.post('/api/ai/generate', json={'action':'improve','text':'We solve a big problem'}, headers=h)
        text = r.json()['text']
        print(f'P1 Improve: HTTP {r.status_code}, text_len={len(text)}')

        # P3 Regression: action_plan
        r = await c.post('/api/ai/generate', json={'action':'action_plan','context':'Improve investor pitch deck clarity'}, headers=h)
        text = r.json()['text']
        print(f'P3 action_plan: HTTP {r.status_code}, text_len={len(text)}')

        # P1 Error: Invalid action
        r = await c.post('/api/ai/generate', json={'action':'invalid_action'}, headers=h)
        print(f'P1 Invalid action: HTTP {r.status_code} (expect 400)')

        # P2 Regression: Step 15 result endpoint
        r = await c.get('/api/evaluations/result', headers=h)
        if r.status_code == 200:
            data = r.json()
            print(f'P2/Step15: overall_score={data.get("overall_score")}, sections={data.get("total_sections_completed")}')
        else:
            print(f'Step15 result: HTTP {r.status_code}')

        print('QA COMPLETE')

asyncio.run(run_qa())
