with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r"helpText:\s*'([^']*)'", lambda m: f'helpText: "{m.group(1)}"', content)

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
