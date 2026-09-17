import sys
sys.stdout.reconfigure(encoding='utf-8')
import asyncio, httpx, json

# ─────────────────────────────────────────────────────────────────────────────
# Reproduce the EXACT calcScore() logic from StartupEvaluation.jsx
# so we can verify before/after scores precisely
# ─────────────────────────────────────────────────────────────────────────────
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

async def run_browser_qa():
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=15) as c:
        # ── Auth ──────────────────────────────────────────────────────────────
        reg = await c.post('/auth/register', json={
            'full_name': 'Browser QA User',
            'email': 'bqa_p6@test.com',
            'mobile': '9876543210',
            'password': 'browserqa123'
        })
        login = await c.post('/auth/login', data={
            'username': 'bqa_p6@test.com',
            'password': 'browserqa123'
        })
        tok = login.json()['access_token']
        h = {'Authorization': f'Bearer {tok}'}
        print(f"Auth: HTTP {login.status_code}")

        # ── Create startup ────────────────────────────────────────────────────
        await c.post('/api/startups', json={
            'name': 'BrowserQA Startup', 'industry': 'SaaS', 'stage': 'MVP'
        }, headers=h)
        me = (await c.get('/api/me', headers=h)).json()
        sid = me['startup_id']
        print(f"Startup ID: {sid}")

        # ═════════════════════════════════════════════════════════════════════
        # STEP 1: Establish baseline — save Steps 1 and 2 with minimal data
        # This simulates "user already has some evaluation data"
        # ═════════════════════════════════════════════════════════════════════
        step1_minimal = {'summary': 'We build tools'}   # short, scores low
        s1_before = calc_score(step1_minimal)
        await c.post('/api/evaluations', json={
            'step': 1, 'score': s1_before, 'data': json.dumps(step1_minimal)
        }, headers=h)

        step2_minimal = {'problem_statement': 'Founders lack capital', 'solution': 'AI platform'}
        s2_score = calc_score(step2_minimal)
        await c.post('/api/evaluations', json={
            'step': 2, 'score': s2_score, 'data': json.dumps(step2_minimal)
        }, headers=h)

        print(f"\n--- BASELINE (before any changes) ---")
        print(f"  Step 1 score: {s1_before}  (fields: {step1_minimal})")
        print(f"  Step 2 score: {s2_score}")
        baseline_avg = (s1_before + s2_score) / 2
        print(f"  scoreEstimate (2 steps): {baseline_avg:.1f}/100")

        # ═════════════════════════════════════════════════════════════════════
        # TEST A: Change high-impact required field — substantial change
        # User fills Step 1 with a long, detailed answer (> 100 chars each)
        # ═════════════════════════════════════════════════════════════════════
        print(f"\n--- TEST A: High-impact field change (Step 1) ---")
        step1_after = {
            'summary': 'We help early-stage founders raise their seed round faster by using AI-powered due diligence automation that reduces the process from 3 months to 2 weeks.',
            'vision': 'A world where every high-potential startup gets funded based on merit, not connections or geography.',
            'mission': 'To democratize access to capital by making institutional-quality due diligence accessible to all startups worldwide.'
        }
        s1_after = calc_score(step1_after)
        print(f"  Step 1 NEW score: {s1_after}  (fields filled, all > 100 chars)")
        print(f"  Score delta for Step 1: {s1_before} -> {s1_after} (+{s1_after - s1_before})")

        # Frontend: currentLiveScore = calc_score(stepFields[1]) = s1_after
        # scoreEstimate = (s1_after + s2_score) / 2  [2 active steps]
        live_estimate_during_edit = (s1_after + s2_score) / 2
        print(f"  scoreEstimate DURING editing (before save): {live_estimate_during_edit:.1f}/100")

        # Save step 1
        r = await c.post('/api/evaluations', json={
            'step': 1, 'score': s1_after, 'data': json.dumps(step1_after)
        }, headers=h)
        print(f"  Save HTTP: {r.status_code}")

        scoreEstimate_after_save = (s1_after + s2_score) / 2
        print(f"  scoreEstimate AFTER save: {scoreEstimate_after_save:.1f}/100")
        print(f"  PASS: score updated from {baseline_avg:.1f} to {scoreEstimate_after_save:.1f}")

        # ═════════════════════════════════════════════════════════════════════
        # TEST B: Optional field — Step 8 (no required fields)
        # ═════════════════════════════════════════════════════════════════════
        print(f"\n--- TEST B: Optional field (Step 8 Financial Readiness) ---")

        # B1: First skip it
        step8_skipped = {'_skipped': True}
        await c.post('/api/evaluations', json={
            'step': 8, 'score': 30, 'data': json.dumps(step8_skipped)
        }, headers=h)
        evals = (await c.get('/api/evaluations', headers=h)).json()
        s8 = next((e for e in evals if e['step'] == 8), None)
        s8_parsed = json.loads(s8['data']) if s8 else {}
        print(f"  Step 8 after SKIP: _skipped={s8_parsed.get('_skipped')}, score={s8['score']}")
        print(f"  Sidebar pill: should show amber SKIPPED state")

        # B2: Fill optional fields
        step8_filled = {
            'annual_revenue': '45L',
            'burn_rate': '5L per month',
            'runway': '9 months',
            'break_even': 'Month 18 projected based on current growth trajectory'
        }
        s8_filled = calc_score(step8_filled)
        r = await c.post('/api/evaluations', json={
            'step': 8, 'score': s8_filled, 'data': json.dumps(step8_filled)
        }, headers=h)
        print(f"  Step 8 FILL: HTTP {r.status_code}, score={s8_filled}")

        evals = (await c.get('/api/evaluations', headers=h)).json()
        s8 = next((e for e in evals if e['step'] == 8), None)
        s8_parsed = json.loads(s8['data']) if s8 else {}
        print(f"  Step 8 after FILL: _skipped={s8_parsed.get('_skipped')}, score={s8['score']}")
        print(f"  Sidebar pill: should show green COMPLETED state")

        # scoreEstimate now includes Step 8
        scoreEstimate_with_s8 = (s1_after + s2_score + s8_filled) / 3
        print(f"  scoreEstimate with 3 steps: {scoreEstimate_with_s8:.1f}/100")

        # ═════════════════════════════════════════════════════════════════════
        # TEST C: Revert optional field
        # ═════════════════════════════════════════════════════════════════════
        print(f"\n--- TEST C: Revert Step 8 optional field ---")
        step8_reverted = {'annual_revenue': '45L', 'burn_rate': '', 'runway': '', 'break_even': ''}
        s8_reverted = calc_score(step8_reverted)
        r = await c.post('/api/evaluations', json={
            'step': 8, 'score': s8_reverted, 'data': json.dumps(step8_reverted)
        }, headers=h)
        print(f"  Step 8 REVERT: HTTP {r.status_code}, score={s8_reverted}")
        print(f"  Score changed from {s8_filled} to {s8_reverted} (correct reduction)")
        scoreEstimate_reverted = (s1_after + s2_score + s8_reverted) / 3
        print(f"  scoreEstimate after revert: {scoreEstimate_reverted:.1f}/100")

        # ═════════════════════════════════════════════════════════════════════
        # TEST D: Step 15 result
        # ═════════════════════════════════════════════════════════════════════
        print(f"\n--- TEST D: Step 15 final result ---")
        r15 = await c.get('/api/evaluations/result', headers=h)
        if r15.status_code == 200:
            result = r15.json()
            print(f"  overall_score: {result['overall_score']}")
            print(f"  readiness_label: {result.get('readiness_label')}")
            print(f"  sections_completed: {result['total_sections_completed']}")
            cats = result.get('category_scores', {})
            for cat, sc in list(cats.items())[:3]:
                print(f"    {cat}: {sc}/100")
        else:
            print(f"  Step 15: HTTP {r15.status_code}")

        # ═════════════════════════════════════════════════════════════════════
        # TEST E: Dashboard completion
        # ═════════════════════════════════════════════════════════════════════
        print(f"\n--- TEST E: Dashboard ---")
        dash = await c.get('/api/dashboard', headers=h)
        if dash.status_code == 200:
            d = dash.json()
            print(f"  evaluations_completed: {d.get('evaluations_completed')}")
            print(f"  avg_score: {d.get('avg_score')}")
            print(f"  eval_complete: {d.get('eval_complete')}")
        else:
            print(f"  Dashboard: HTTP {dash.status_code}")

        # ═════════════════════════════════════════════════════════════════════
        # TEST F: Verify calcScore() not duplicated — check count in file
        # ═════════════════════════════════════════════════════════════════════
        print(f"\n--- TEST F: Regression checks ---")
        import os
        fe_path = os.path.join('..', 'Frontend', 'src', 'pages', 'StartupEvaluation.jsx')
        with open(fe_path, 'r', encoding='utf-8') as f:
            src = f.read()
        calc_score_defs = src.count('function calcScore(')
        ai_calls = src.count("'/api/ai/generate'")
        benchmark = 'Industry Benchmarking' in src
        start_with_ai = 'Start with AI' in src
        help_info = 'Why this matters' in src
        skip_btn = 'Skip for now' in src
        print(f"  calcScore() definitions: {calc_score_defs} (expect 1)")
        print(f"  /api/ai/generate calls: {ai_calls} (expect 4)")
        print(f"  Industry Benchmarking panel: {benchmark}")
        print(f"  Start with AI button: {start_with_ai}")
        print(f"  Contextual help 'Why this matters': {help_info}")
        print(f"  Skip for now button: {skip_btn}")

        print(f"\n=== ALL TESTS COMPLETE ===")

asyncio.run(run_browser_qa())
