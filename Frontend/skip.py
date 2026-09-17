with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target_save = """  const handleSave = async (quiet = false) => {
    if (!user?.startup_id) { setError('Please complete startup registration first.'); return false; }
    setIsSaving(true);
    setError('');
    try {
      const fields = stepFields[step] || {};
      const score = calcScore(fields);
      await api.post('/api/evaluations', { step, score, data: JSON.stringify(fields) });
      await api.put(`/api/startups/${user.startup_id}`, { evaluation_step: step });
      setSavedEvals(prev => ({ ...prev, [step]: { step, score, data: JSON.stringify(fields) } }));
      isDirty.current = false;
      if (!quiet) {
        setSuccessMsg('Saved ✓');
        setTimeout(() => setSuccessMsg(''), 2500);
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };"""

replacement_save = """  const handleSave = async (quiet = false, isSkipping = false) => {
    if (!user?.startup_id) { setError('Please complete startup registration first.'); return false; }
    setIsSaving(true);
    setError('');
    try {
      const fields = stepFields[step] || {};
      let finalFields = { ...fields };
      if (isSkipping) {
        finalFields._skipped = true;
      }
      const score = calcScore(finalFields);
      await api.post('/api/evaluations', { step, score, data: JSON.stringify(finalFields) });
      await api.put(`/api/startups/${user.startup_id}`, { evaluation_step: step });
      setSavedEvals(prev => ({ ...prev, [step]: { step, score, data: JSON.stringify(finalFields) } }));
      isDirty.current = false;
      if (!quiet) {
        setSuccessMsg(isSkipping ? 'Skipped ⏭' : 'Saved ✓');
        setTimeout(() => setSuccessMsg(''), 2500);
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    const ok = await handleSave(false, true);
    if (!ok) return;
    setAiSuggestion(null);
    setShowHelp(false);
    setValidationErrors({});
    if (step === 14) { setStep(15); fetchResult(); }
    else setStep(p => Math.min(p + 1, TOTAL));
  };"""

content = content.replace(target_save, replacement_save)

target_count = """const savedCount    = Object.keys(savedEvals).filter(k => Number(k) <= 14).length;"""
replacement_count = """const savedCount = Object.values(savedEvals).filter(e => {
      if (e.step > 14) return false;
      try { return !JSON.parse(e.data)._skipped; } catch { return true; }
    }).length;"""
content = content.replace(target_count, replacement_count)

target_pills = """          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(s => (
            <div key={s}
              onClick={() => goToStep(s)}
              title={s <= 14 ? (STEP_CONFIG[s]?.title || `Step ${s}`) : 'Final Result'}
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors
                ${savedEvals[s] ? 'bg-emerald-500 text-white' : s === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}
                ${s <= maxReached ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
              {savedEvals[s] ? '✓' : s}
            </div>
          ))}"""

replacement_pills = """          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(s => {
            let isSaved = false;
            let isSkipped = false;
            if (savedEvals[s]) {
              isSaved = true;
              try { isSkipped = JSON.parse(savedEvals[s].data)._skipped; } catch {}
            }
            return (
              <div key={s}
                onClick={() => goToStep(s)}
                title={s <= 14 ? (STEP_CONFIG[s]?.title || `Step ${s}`) : 'Final Result'}
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors
                  ${isSaved && !isSkipped ? 'bg-emerald-500 text-white' : isSaved && isSkipped ? 'bg-amber-400 text-white' : s === step ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}
                  ${s <= maxReached ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                {isSaved && !isSkipped ? '✓' : isSaved && isSkipped ? '⏭' : s}
              </div>
            );
          })}"""
content = content.replace(target_pills, replacement_pills)

target_footer = """                      <button onClick={goNext} className="saas-button saas-button-primary flex items-center gap-2">
                        {step === 14 ? 'Finish Evaluation' : 'Save & Continue'} <ArrowRight className="w-4 h-4"/>
                      </button>"""

replacement_footer = """                      {cfg.fields && !cfg.fields.some(f => f.required) && (
                        <button onClick={handleSkip} className="saas-button bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-2 mr-2">
                          Skip for now
                        </button>
                      )}
                      <button onClick={goNext} className="saas-button saas-button-primary flex items-center gap-2">
                        {step === 14 ? 'Finish Evaluation' : 'Save & Continue'} <ArrowRight className="w-4 h-4"/>
                      </button>"""
content = content.replace(target_footer, replacement_footer)

target_subtitle = """                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? `✓ Previously saved · Score: ${savedEvals[step].score}/100`
                      : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}
                  </p>"""

replacement_subtitle = """                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? (
                        JSON.parse(savedEvals[step].data || '{}')._skipped 
                        ? `⏭ Skipped · Score: ${savedEvals[step].score}/100 (Incomplete)` 
                        : `✓ Previously saved · Score: ${savedEvals[step].score}/100`
                      )
                      : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}
                  </p>"""
content = content.replace(target_subtitle, replacement_subtitle)

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
