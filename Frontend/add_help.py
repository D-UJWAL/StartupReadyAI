import re

with open('src/pages/StartupEvaluation.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

helps = {
    1: "Helps investors quickly understand your core business, structure, and foundational vision.",
    2: "Helps assess whether the startup is solving a clear and meaningful customer problem.",
    3: "Helps estimate whether the market is large enough to support meaningful business growth.",
    4: "Helps evaluate product maturity, user engagement, and roadmap feasibility.",
    5: "Helps evaluate technical maturity, scalability, and technology risk.",
    6: "Helps assess how the startup plans to generate sustainable revenue.",
    7: "Helps evaluate the founding team's experience, execution capability, and founder-market fit.",
    8: "Helps assess financial health, sustainability, burn, runway, and investment readiness.",
    9: "Helps identify legal documentation and compliance gaps that could create investor or operational risk.",
    10: "Helps assess the startup's ability to acquire customers and scale revenue.",
    11: "Helps demonstrate market acceptance through customers, revenue, growth, and partnerships.",
    12: "Helps assess environmental, social, and governance considerations.",
    13: "Helps determine how prepared the startup is for fundraising and investor due diligence.",
    14: "Helps identify major risks and whether appropriate mitigation plans exist."
}

for step in range(1, 15):
    pattern = rf"({step}:\s*\{{\s*title:\s*'[^']+',\s*)"
    repl = rf"\1helpText: '{helps[step]}', "
    content = re.sub(pattern, repl, content, count=1)

with open('src/pages/StartupEvaluation.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added help texts.")
