import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'Backend/auth.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the predictable default with a secure fallback refusal
new_secret_logic = """SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("CRITICAL SECURITY ERROR: SECRET_KEY environment variable is missing. Refusing to start.")"""

content = re.sub(r'SECRET_KEY = os\.getenv\("SECRET_KEY", "supersecretkey"\)', new_secret_logic, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("auth.py patched to fail securely on missing SECRET_KEY.")
