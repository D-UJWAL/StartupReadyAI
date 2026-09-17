with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? (
                        JSON.parse(savedEvals[step].data || '{}')._skipped 
                        ? `⏭ Skipped · Score: ${savedEvals[step].score}/100 (Incomplete)` 
                        : `✓ Previously saved · Score: ${savedEvals[step].score}/100`
                      )
                      : 'Fill in as much detail as possible for a higher score. Fields marked * are required.'}
                  </p>"""

replacement = """                  <p className="text-sm text-slate-500 mb-5">
                    {savedEvals[step]
                      ? (
                        JSON.parse(savedEvals[step].data || '{}')._skipped 
                        ? `⏭ Skipped · Live Score: ${currentLiveScore}/100 (Incomplete)` 
                        : `✓ Previously saved · Live Score: ${currentLiveScore}/100`
                      )
                      : `Live Score: ${currentLiveScore}/100 · Fill in as much detail as possible for a higher score. Fields marked * are required.`}
                  </p>"""

content = content.replace(target, replacement)
with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
