with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                              <span>👤 {rec.owner}</span>
                            </div>
                          </div>
                        </div>
                      ))}"""

replacement = """                              <span>👤 {rec.owner}</span>
                            </div>
                              <div className="mt-3">
                                {!recAiResult[i] ? (
                                  <button 
                                    onClick={() => handleStartWithAi(i, rec.recommendation)}
                                    disabled={recAiLoading === i}
                                    className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                    {recAiLoading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Start with AI
                                  </button>
                                ) : (
                                  <div className="bg-brand-50/50 border border-brand-100 rounded-lg p-3 mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                                    <p className="font-bold text-brand-900 mb-1 flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3" /> AI Action Plan
                                    </p>
                                    {recAiResult[i]}
                                  </div>
                                )}
                              </div>
                          </div>
                        </div>
                      ))}"""

new_content = content.replace(target, replacement)
with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print('Patched successfully.' if new_content != content else 'No match found.')
