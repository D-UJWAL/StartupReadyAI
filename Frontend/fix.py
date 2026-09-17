with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'helpText: "Helps evaluate the founding team\'s experience, execution capability, and founder-market fit.\',',
    'helpText: "Helps evaluate the founding team\'s experience, execution capability, and founder-market fit.",'
)

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
