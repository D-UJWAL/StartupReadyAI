import re
with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all helpText strings using regex that captures up to ', fields'
content = re.sub(r'helpText: ["\'].*?fields: \[', lambda m: m.group(0).replace('"', "'").replace("helpText: '", "helpText: \"").replace("', fields: [", "\", fields: ["), content)

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
