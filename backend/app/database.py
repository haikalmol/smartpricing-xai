import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env here, at the top of the module every other app module imports first
# (directly or transitively). Previously load_dotenv() only lived in
# app/engine/weighting.py, which import order meant it ran *after* this module
# had already resolved DATABASE_URL from a bare os.environ.get() -- so .env was
# never actually loaded in time and the app silently fell back to sqlite on
# every run, Supabase never touched. Fixed in H14.
load_dotenv()


def _build_database_url() -> str:
    # DATABASE_URL set directly (e.g. Render/Railway inject this at deploy time,
    # already URL-encoded by the platform) takes precedence over the split vars.
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]

    db_user = os.environ.get("DB_USER")
    db_password = os.environ.get("DB_PASSWORD")
    db_host = os.environ.get("DB_HOST")
    if db_user and db_password and db_host:
        db_port = os.environ.get("DB_PORT", "5432")
        db_name = os.environ.get("DB_NAME", "postgres")
        # Percent-encode user/password here so special characters (@, !, $, &,
        # etc. -- common in generated passwords) can never break URL parsing.
        # Paste the raw password into .env as-is; no manual encoding needed,
        # including after a future password rotation.
        return (
            f"postgresql://{quote_plus(db_user)}:{quote_plus(db_password)}"
            f"@{db_host}:{db_port}/{db_name}"
        )

    return "sqlite:///./smartpricing.db"


DATABASE_URL = _build_database_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
