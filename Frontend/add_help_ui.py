import re

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const [recAiResult, setRecAiResult] = useState({});', 'const [recAiResult, setRecAiResult] = useState({});\n  const [showHelp, setShowHelp] = useState(false);')

# Also reset showHelp when step changes
content = content.replace('setAiSuggestion(null);', 'setAiSuggestion(null);\n    setShowHelp(false);')

replacement = '''                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">{cfg.title}</h2>
                    {cfg.helpText && (
                      <button onClick={() => setShowHelp(!showHelp)} className="text-slate-400 hover:text-brand-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded-full">
                        <Info className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showHelp && cfg.helpText && (
                    <div className="mb-4 p-3 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-800 flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 text-brand-500" />
                      <p><strong>Why this matters:</strong> {cfg.helpText}</p>
                    </div>
                  )}'''

content = re.sub(r'<h2 className="text-xl font-bold text-slate-900 mb-1">\{cfg\.title\}</h2>', replacement, content)

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully')
