import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'Backend/main.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

cors_logic = """
# Configure CORS securely, falling back to local dev origins if not provided
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    allowed_origins = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
"""

content = re.sub(r'app\.add_middleware\(\s*CORSMiddleware,\s*allow_origins=\[[^\]]+\]\,', cors_logic.strip() + ",", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("main.py patched for dynamic CORS.")
