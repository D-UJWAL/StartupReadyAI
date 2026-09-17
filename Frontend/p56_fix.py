import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ── Fix 1: Close the inner flex div after the </button> of goNext ────────────────
# Line 1141 is the </button> for goNext (0-indexed: 1140)
# We need to insert a </div> after it
# Current structure:
#   1141: </button>
#   1142: </div>   <-- this is the outer pt-6 div
# Required:
#   1141: </button>
#   NEW:  </div>   <-- close inner flex div
#   1142: </div>   <-- outer pt-6 div

target_line_idx = None
for i, line in enumerate(lines):
    if 'Next Step' in line or ('Generate Result' in line and 'step === 14' not in line):
        # Next line should be </button>
        if i+1 < len(lines) and '</button>' in lines[i+1]:
            target_line_idx = i + 1
            break

if target_line_idx:
    lines.insert(target_line_idx + 1, '                </div>\n')
    print(f"Closed flex wrapper after line {target_line_idx+1}")
else:
    # simpler approach: just find the </button> that ends goNext
    for i, line in enumerate(lines):
        if '</button>' in line and i > 1134 and i < 1145:
            lines.insert(i + 1, '                </div>\n')
            print(f"Fallback: closed flex wrapper at line {i+2}")
            break

# ── Fix 2: Replace scoreEstimate with live version ────────────────────────────────
content = ''.join(lines)

old_score = '''    const savedCount = Object.values(savedEvals).filter(e => {
        if (e.step > 14) return false;
        try { return !JSON.parse(e.data)._skipped; } catch { return true; }
      }).length;
    const scoreEstimate = Object.values(savedEvals).reduce((s, e) => s + (e.score || 0), 0) / Math.max(savedCount, 1);'''

new_score = '''    const savedCount = Object.values(savedEvals).filter(e => {
        if (e.step > 14) return false;
        try { return !JSON.parse(e.data)._skipped; } catch { return true; }
      }).length;
    // P6: Live score based on in-memory stepFields for current step
    const currentLiveScore = (step < 15) ? calcScore(stepFields[step] || {}) : 0;
    const scoreEstimate = (() => {
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
    print("Live scoreEstimate injected")
else:
    print("WARNING: scoreEstimate target not found — check manually")

# ── Fix 3: Add live score display inside the subtitle paragraph ───────────────────
old_subtitle = "                      : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}"
new_subtitle = "                      : <><span className=\"font-semibold text-brand-600\">Live Score: {currentLiveScore}/100</span> &mdash; fill in as much detail as possible. Fields marked * are required.</>;}"

if old_subtitle in content:
    content = content.replace(old_subtitle, new_subtitle)
    print("Live score subtitle injected")
else:
    print("WARNING: subtitle target not found — inserting after h2 title block instead")

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done.")
