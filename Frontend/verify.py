import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.splitlines()

def found(lst): return "FOUND" if lst else "MISSING"

print("=== P4 Contextual Help ===")
help_btn = [l.strip() for l in lines if 'setShowHelp' in l and 'button' in l]
help_text = [l.strip() for l in lines if 'Why this matters' in l]
help_count = sum(1 for l in lines if 'helpText:' in l and 'helpText &&' not in l)
print(f"  Help toggle button: {found(help_btn)}")
print(f"  Why this matters text: {found(help_text)}")
print(f"  Steps with helpText configured: {help_count}")

print()
print("=== P5 Skip Logic ===")
skip_btn = [l.strip() for l in lines if 'Skip for now' in l]
skip_fn = [l.strip() for l in lines if 'handleSkip' in l]
skip_flag = [l.strip() for l in lines if '_skipped' in l]
amber = [l.strip() for l in lines if 'bg-amber-400' in l]
req_guard = [l.strip() for l in lines if 'f.required' in l and 'some' in l]
print(f"  'Skip for now' button text: {found(skip_btn)}")
print(f"  handleSkip references: {len(skip_fn)}")
print(f"  _skipped flag: {len(skip_flag)} references")
print(f"  Amber pill for skipped state: {found(amber)}")
print(f"  Required field guard on Skip button: {found(req_guard)}")

print()
print("=== P6 Live Scoring ===")
live = [l.strip() for l in lines if 'currentLiveScore' in l]
est = [l.strip() for l in lines if 'scoreEstimate' in l]
calc = [l.strip() for l in lines if 'calcScore(stepFields' in l]
print(f"  currentLiveScore variable: {found(live)} ({len(live)} refs)")
print(f"  scoreEstimate: {found(est)} ({len(est)} refs)")
print(f"  calcScore(stepFields[step]): {found(calc)}")

print()
print("=== Regression P1 AI ===")
ai_calls = [l.strip() for l in lines if "'/api/ai/generate'" in l]
print(f"  /api/ai/generate calls: {len(ai_calls)} (expect 4)")

print()
print("=== Regression P2 Benchmark ===")
bench = [l.strip() for l in lines if 'Industry Benchmarking' in l]
print(f"  Benchmark panel: {found(bench)}")

print()
print("=== Regression P3 Start with AI ===")
rec_ai = [l.strip() for l in lines if 'Start with AI' in l]
print(f"  Start with AI button: {found(rec_ai)}")
