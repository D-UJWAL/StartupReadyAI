import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('routers.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

delete_idx = -1
for i, line in enumerate(lines):
    if '@router.delete("/uploads/{doc_id}")' in line:
        delete_idx = i

if delete_idx == -1:
    print("Could not find DELETE upload endpoint")
    sys.exit(1)

# Find end of delete_upload function
end_idx = -1
for i in range(delete_idx + 1, len(lines)):
    if lines[i].startswith('@router.') or lines[i].startswith('# --'):
        end_idx = i
        break

new_endpoints = """
from fastapi.responses import FileResponse

@router.get("/uploads/{doc_id}/download")
def download_upload(doc_id: int, db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.startup_id != current_user.startup_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Prevent path traversal by using basename
    file_path = os.path.join(UPLOADS_DIR, os.path.basename(doc.stored_filename))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
        
    return FileResponse(file_path, filename=doc.original_filename, content_disposition_type="attachment")

@router.get("/uploads/{doc_id}/view")
def view_upload(doc_id: int, db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth.get_current_user)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.startup_id != current_user.startup_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    file_path = os.path.join(UPLOADS_DIR, os.path.basename(doc.stored_filename))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server")
        
    return FileResponse(file_path, filename=doc.original_filename, content_disposition_type="inline")

"""

lines.insert(end_idx, new_endpoints)

with open('routers.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Added download and view endpoints to routers.py")
