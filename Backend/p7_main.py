import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the insecure StaticFiles mount
old_mount = 'app.mount("/files", StaticFiles(directory=UPLOADS_DIR), name="files")'
new_content = content.replace(old_mount, '# (Removed insecure static mount for Priority 7)')

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"main.py updated: insecure static mount removed? {old_mount not in new_content}")
