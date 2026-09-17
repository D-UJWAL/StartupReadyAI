import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find exact text and replace using index
start_marker = 'const savedCount = Object.values(savedEvals).filter(e => {'
end_marker = '  const scoreEstimate = Object.values(savedEvals).reduce((s, e) => s + (e.score || 0), 0) / Math.max(savedCount, 1);'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
else:
    end_of_line = content.find('\n', end_idx) + 1
    old_block = content[start_idx:end_of_line]
    print("Found block:")
    print(repr(old_block))
    
    new_block = """const savedCount = Object.values(savedEvals).filter(e => {
      if (e.step > 14) return false;
      try { return !JSON.parse(e.data)._skipped; } catch { return true; }
    }).length;
  // P6: Live score from in-memory fields for current step
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
  })();
"""
    content = content[:start_idx] + new_block + content[end_of_line:]
    with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
