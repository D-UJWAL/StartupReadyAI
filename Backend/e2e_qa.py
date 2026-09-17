import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio, httpx, json

def calc_score(fields: dict) -> int:
    if not fields or not isinstance(fields, dict):
        return 30
    vals = [v for v in fields.values() if isinstance(v, str)]
    score = 30
    for v in vals:
        length = len(v.strip())
        if length > 100:
            score += 10
        elif length > 20:
            score += 5
        elif length > 0:
            score += 2
    return min(score, 100)

STEP_DATA = {
    1: {'summary': 'We help founders raise capital efficiently using AI-powered due diligence automation.',
        'vision': 'A world where every high-potential startup gets funded based on merit.'},
    2: {'problem_statement': 'Founders spend 3 months on due diligence instead of building product.',
        'solution': 'AI platform that cuts due diligence time from 3 months to 2 weeks.'},
    3: {'tam': '$50B global VC market', 'competitive_advantages': 'Proprietary AI models trained on 10,000 deals'},
    4: {'product_status': 'Beta', 'key_features': '1. AI due diligence\n2. Investor matching\n3. Data room automation'},
    5: {'tech_stack': 'React frontend, FastAPI backend, PostgreSQL, AWS, OpenAI GPT-4 for analysis'},
    6: {'revenue_model': 'SaaS Subscription'},
    7: {'founder_background': 'Ex-Goldman Sachs analyst + IIT Bombay CS grad. Built 2 prior startups.'},
    8: {'annual_revenue': '45L', 'burn_rate': '5L per month', 'runway': '9 months'},
    9: {'incorporation_status': 'Incorporated'},
    10: {'sales_channels': 'Direct outbound to VCs, inbound via content marketing, VC community partnerships'},
    11: {'total_customers': '85', 'mrr': '3.5L'},
    12: {'environmental_impact': 'Remote-first company, carbon-neutral data centers, diversity hiring'},
    13: {'funding_raised': '50L seed from 3 angels', 'funding_ask': '2Cr Series A'},
    14: {'market_risk': 'Risk: Market slowdown. Mitigation: Diversified across geographies and fund sizes.'},
}

async def run_full_e2e():
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=15) as c:
        # Auth
        reg = await c.post('/auth/register', json={
            'full_name': 'E2E QA User',
            'email': 'e2e_full@test.com',
            'mobile': '9000000001',
            'password': 'e2e123'
        })
        login = await c.post('/auth/login', data={'username': 'e2e_full@test.com', 'password': 'e2e123'})
        tok = login.json()['access_token']
        h = {'Authorization': f'Bearer {tok}'}
        print(f"E2E Auth: HTTP {login.status_code}")

        # Create startup
        await c.post('/api/startups', json={'name': 'E2E Startup', 'industry': 'SaaS', 'stage': 'Beta'}, headers=h)
        me = (await c.get('/api/me', headers=h)).json()
        sid = me['startup_id']
        print(f"Startup created: ID={sid}")

        # Save all 14 steps
        print("\n--- Saving all 14 evaluation steps ---")
        step_scores = {}
        for step, fields in STEP_DATA.items():
            score = calc_score(fields)
            step_scores[step] = score
            r = await c.post('/api/evaluations', json={
                'step': step, 'score': score, 'data': json.dumps(fields)
            }, headers=h)
            print(f"  Step {step:2d}: HTTP {r.status_code}, score={score}")

        avg_all = sum(step_scores.values()) / len(step_scores)
        print(f"\n  Frontend scoreEstimate (all 14 steps): {avg_all:.1f}/100")

        # Dashboard BEFORE modifying
        dash_before = (await c.get('/api/dashboard', headers=h)).json()
        print(f"\n--- Dashboard (before modification) ---")
        print(f"  evaluations_completed: {dash_before['evaluations_completed']}")
        print(f"  avg_score: {dash_before['avg_score']}")
        print(f"  eval_complete: {dash_before.get('eval_complete')}")

        # ── TEST D: Step 15 result ────────────────────────────────────────────
        print(f"\n--- Step 15 Final Result ---")
        r15 = await c.get('/api/evaluations/result', headers=h)
        res = r15.json()
        print(f"  overall_score: {res['overall_score']}")
        print(f"  readiness_label: {res['readiness_label']}")
        print(f"  sections_completed: {res['total_sections_completed']}")
        for cat, sc in res.get('category_scores', {}).items():
            print(f"    {cat}: {sc}/100")

        # ── TEST A: Modify Step 1 substantially and check score change ────────
        print(f"\n--- Priority 6 Test A: Modify Step 1 substantially ---")
        s1_before = step_scores[1]
        step1_new = {'summary': 'We', 'vision': 'Big'}  # very short = low score
        s1_new = calc_score(step1_new)
        r = await c.post('/api/evaluations', json={
            'step': 1, 'score': s1_new, 'data': json.dumps(step1_new)
        }, headers=h)
        print(f"  Step 1 score: {s1_before} -> {s1_new} (saved HTTP {r.status_code})")

        # New scoreEstimate
        step_scores[1] = s1_new
        avg_new = sum(step_scores.values()) / len(step_scores)
        print(f"  scoreEstimate: {avg_all:.1f} -> {avg_new:.1f}/100")

        # Step 15 result after modification
        r15_new = await c.get('/api/evaluations/result', headers=h)
        res_new = r15_new.json()
        print(f"\n  Step 15 overall_score: {res['overall_score']} -> {res_new['overall_score']}")

        # ── TEST C: Revert Step 1 ────────────────────────────────────────────
        print(f"\n--- Priority 6 Test C: Revert Step 1 ---")
        r = await c.post('/api/evaluations', json={
            'step': 1, 'score': s1_before, 'data': json.dumps(STEP_DATA[1])
        }, headers=h)
        step_scores[1] = s1_before
        avg_reverted = sum(step_scores.values()) / len(step_scores)
        print(f"  Step 1 score reverted: {s1_new} -> {s1_before}")
        print(f"  scoreEstimate reverted: {avg_new:.1f} -> {avg_reverted:.1f}/100")

        r15_reverted = await c.get('/api/evaluations/result', headers=h)
        res_reverted = r15_reverted.json()
        print(f"  Step 15 overall_score reverted: {res_reverted['overall_score']}")

        # Dashboard FINAL
        dash_after = (await c.get('/api/dashboard', headers=h)).json()
        print(f"\n--- Dashboard (FINAL) ---")
        print(f"  evaluations_completed: {dash_after['evaluations_completed']}")
        print(f"  avg_score: {dash_after['avg_score']}")

        # Regression: All P1-P3 still working
        print(f"\n--- Regression: P1-P3 checks ---")
        ai_gen = await c.post('/api/ai/generate', json={'action': 'generate', 'context': 'Team Assessment'}, headers=h)
        ai_imp = await c.post('/api/ai/generate', json={'action': 'improve', 'text': 'Good team'}, headers=h)
        ai_act = await c.post('/api/ai/generate', json={'action': 'action_plan', 'context': 'Hire a CFO'}, headers=h)
        ai_err = await c.post('/api/ai/generate', json={'action': 'bad'}, headers=h)
        print(f"  P1 Generate: HTTP {ai_gen.status_code}, len={len(ai_gen.json()['text'])}")
        print(f"  P1 Improve: HTTP {ai_imp.status_code}, len={len(ai_imp.json()['text'])}")
        print(f"  P3 action_plan: HTTP {ai_act.status_code}, len={len(ai_act.json()['text'])}")
        print(f"  P1 Invalid: HTTP {ai_err.status_code} (expect 400)")

        # PDF check
        pdf_r = await c.get('/api/evaluations/pdf', headers=h)
        print(f"  PDF report: HTTP {pdf_r.status_code}, content-type={pdf_r.headers.get('content-type')}")

        print(f"\n=== FULL E2E QA COMPLETE ===")

asyncio.run(run_full_e2e())
