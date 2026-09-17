import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Use exact indentation from the file (2-space, not 4-space)
old = """    const savedCount = Object.values(savedEvals).filter(e => {
      if (e.step > 14) return false;
      try { return !JSON.parse(e.data)._skipped; } catch { return true; }
    }).length;
  const scoreEstimate = Object.values(savedEvals).reduce((s, e) => s + (e.score || 0), 0) / Math.max(savedCount, 1);"""

new = """    const savedCount = Object.values(savedEvals).filter(e => {
      if (e.step > 14) return false;
      try { return !JSON.parse(e.data)._skipped; } catch { return true; }
    }).length;
  // P6: Live score from in-memory fields for the current step
  const currentLiveScore = (step < 15) ? calcScore(stepFields[step] || {}) : 0;
  const scoreEstimate = (() => {
    let total = 0, count = 0;
    for (let s = 1; s <= 14; s++) {
      if (s === step && step < 15) {
        total += currentLiveScore; count++;
      } else if (savedEvals[s]) {
        try {
          if (!JSON.parse(savedEvals[s].data)._skipped) { total += savedEvals[s].score || 0; count++; }
        } catch { total += savedEvals[s].score || 0; count++; }
      }
    }
    return count > 0 ? total / count : 0;
  })();"""

if old in content:
    content = content.replace(old, new)
    print("scoreEstimate replaced OK")
else:
    print("Not found — dumping exact chars around savedCount:")
    idx = content.find('const savedCount')
    print(repr(content[idx:idx+300]))

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
