from sqlalchemy import text
from database import engine

with engine.connect() as con:
    try:
        con.execute(text("ALTER TABLE startups ADD COLUMN registration_step INT DEFAULT 1;"))
        con.execute(text("ALTER TABLE startups ADD COLUMN registration_data TEXT;"))
        con.execute(text("ALTER TABLE startups ADD COLUMN evaluation_step INT DEFAULT 1;"))
        con.commit()
        print("Columns added")
    except Exception as e:
        print(e)
