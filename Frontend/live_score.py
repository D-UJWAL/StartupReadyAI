with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """    const savedCount = Object.values(savedEvals).filter(e => {
        if (e.step > 14) return false;
        try { return !JSON.parse(e.data)._skipped; } catch { return true; }
      }).length;
    const scoreEstimate = Object.values(savedEvals).reduce((s, e) => s + (e.score || 0), 0) / Math.max(savedCount, 1);"""

replacement = """    const savedCount = Object.values(savedEvals).filter(e => {
        if (e.step > 14) return false;
        try { return !JSON.parse(e.data)._skipped; } catch { return true; }
      }).length;
      
    // Live scoring computation
    let effectiveSavedCount = savedCount;
    let isCurrentSkipped = false;
    if (savedEvals[step]) {
      try { isCurrentSkipped = JSON.parse(savedEvals[step].data)._skipped; } catch {}
    }
    if (step < 15 && !savedEvals[step]) effectiveSavedCount += 1;
    if (step < 15 && isCurrentSkipped) effectiveSavedCount += 1; // Temporarily consider it active while editing

    const currentLiveScore = step < 15 ? calcScore(stepFields[step] || {}) : 0;
    const scoreEstimate = Object.values(savedEvals).reduce((s, e) => {
      if (e.step === step && step < 15) return s; // skip adding the saved score for current step
      return s + (e.score || 0);
    }, step < 15 ? currentLiveScore : 0) / Math.max(effectiveSavedCount, 1);"""

content = content.replace(target, replacement)
with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
