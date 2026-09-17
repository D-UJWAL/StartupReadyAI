import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ── Priority 5: Inject Skip button before the Next/Save button ──────────────────
# Target the nav footer button group
old_nav = '''                <button onClick={goNext} disabled={isSaving}
                  className={`saas-button saas-button-primary ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>'''

new_nav = '''                <div className="flex items-center gap-2">
                  {cfg && !cfg.fields.some(f => f.required) && (
                    <button
                      onClick={handleSkip}
                      disabled={isSaving}
                      className="saas-button bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                      Skip for now
                    </button>
                  )}
                  <button onClick={goNext} disabled={isSaving}
                    className={`saas-button saas-button-primary ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>'''

if old_nav in content:
    content = content.replace(old_nav, new_nav)
    print("Skip button injected ✓")
else:
    print("WARNING: Skip button target not found")

# Close the new wrapping div after the Next button closing tag
# Find the end of the button and close the div
old_next_close = '''                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>
                    : step === 14'''

new_next_close = '''                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>
                    : step === 14'''

# Instead, close the wrapper div after the </button> of the Next button
# Find the closing </button> of goNext by line context
old_next_end = '''                </button>
              </div>
            </div>
          )}'''

new_next_end = '''                  </button>
                </div>
              </div>
            </div>
          )}'''

if old_next_end in content:
    content = content.replace(old_next_end, new_next_end)
    print("Nav footer closed ✓")
else:
    # Try alternate closing
    print("WARNING: Nav footer close not found — checking alternate")

# ── Priority 6: Fix scoreEstimate to use live calcScore for current step ─────────
old_score = '''    const savedCount = Object.values(savedEvals).filter(e => {
        if (e.step > 14) return false;
        try { return !JSON.parse(e.data)._skipped; } catch { return true; }
      }).length;
    const scoreEstimate = Object.values(savedEvals).reduce((s, e) => s + (e.score || 0), 0) / Math.max(savedCount, 1);'''

new_score = '''    const savedCount = Object.values(savedEvals).filter(e => {
        if (e.step > 14) return false;
        try { return !JSON.parse(e.data)._skipped; } catch { return true; }
      }).length;
    // P6 Live scoring: compute current step's live score from in-memory fields
    const currentLiveScore = (step < 15) ? calcScore(stepFields[step] || {}) : 0;
    const scoreEstimate = (() => {
      // Sum scores from all saved steps, but replace current step's saved score with live score
      let total = 0;
      let count = 0;
      for (let s = 1; s <= 14; s++) {
        if (s === step && step < 15) {
          total += currentLiveScore;
          count += 1;
        } else if (savedEvals[s]) {
          try {
            if (!JSON.parse(savedEvals[s].data)._skipped) {
              total += savedEvals[s].score || 0;
              count += 1;
            }
          } catch {
            total += savedEvals[s].score || 0;
            count += 1;
          }
        }
      }
      return count > 0 ? total / count : 0;
    })();'''

if old_score in content:
    content = content.replace(old_score, new_score)
    print("Live scoreEstimate injected ✓")
else:
    print("WARNING: scoreEstimate target not found")

# ── Show live score below step title ─────────────────────────────────────────────
old_subtitle = '''                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? (
                        JSON.parse(savedEvals[step].data || '{}')._skipped 
                        ? `⏭ Skipped · Score: ${savedEvals[step].score}/100 (Incomplete)` 
                        : `✓ Previously saved · Score: ${savedEvals[step].score}/100`
                      )
                      : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}
                  </p>'''

new_subtitle = '''                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? (
                        (() => { try { return JSON.parse(savedEvals[step].data || '{}')._skipped; } catch { return false; } })()
                        ? <>⏭ Skipped &nbsp;·&nbsp; <span className="text-brand-600 font-semibold">Live: {currentLiveScore}/100</span> &nbsp;(Incomplete — fill in to complete)</>
                        : <>✓ Saved &nbsp;·&nbsp; <span className="text-brand-600 font-semibold">Live: {currentLiveScore}/100</span></>
                      )
                      : <><span className="text-brand-600 font-semibold">Live: {currentLiveScore}/100</span> &nbsp;— fill in as much detail as possible. Fields marked * are required.</>}
                  </p>'''

if old_subtitle in content:
    content = content.replace(old_subtitle, new_subtitle)
    print("Subtitle live score injected ✓")
else:
    print("WARNING: subtitle target not found — trying alternate")
    # The subtitle may already have been partially updated
    alt_old = '''                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? `✓ Previously saved · Score: ${savedEvals[step].score}/100`
                      : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}
                  </p>'''
    alt_new = '''                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? <>✓ Saved &nbsp;·&nbsp; <span className="text-brand-600 font-semibold">Live: {currentLiveScore}/100</span></>
                      : <><span className="text-brand-600 font-semibold">Live: {currentLiveScore}/100</span> &nbsp;— fill in as much detail as possible. Fields marked * are required.</>}
                  </p>'''
    if alt_old in content:
        content = content.replace(alt_old, alt_new)
        print("Subtitle (alt) live score injected ✓")
    else:
        print("WARNING: subtitle (alt) also not found — skipping")

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
