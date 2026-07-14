import os
from urllib.parse import quote_plus, unquote, urlsplit, urlunsplit

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


def _reencode_credentials(url: str) -> str:
    """Percent-encode the user:password portion of a directly-set DATABASE_URL.

    H15 assumed a directly-set DATABASE_URL always arrives pre-encoded (true
    when a platform injects it) -- false when it's a Supabase connection URI
    pasted by hand into Render's dashboard (H15.2 production regression: an
    unescaped password character broke host parsing, identical to the bug
    the split DB_USER/DB_PASSWORD path already guards against below).

    Decode-then-encode so this is safe whether the credentials arrive raw
    or already percent-encoded -- idempotent either way, so it can't corrupt
    a value that happened to already be correct.
    """
    parts = urlsplit(url)
    if "@" not in parts.netloc:
        return url  # no credentials in the URL at all -- nothing to fix

    userinfo, _, hostport = parts.netloc.rpartition("@")
    if ":" not in userinfo:
        return url  # no password portion -- nothing to re-encode

    user, _, password = userinfo.partition(":")
    safe_userinfo = f"{quote_plus(unquote(user))}:{quote_plus(unquote(password))}"
    return urlunsplit((parts.scheme, f"{safe_userinfo}@{hostport}", parts.path, parts.query, parts.fragment))


def _build_database_url() -> str:
    # DATABASE_URL set directly (Render/Railway env var, or a Supabase URI
    # pasted by hand) takes precedence over the split vars -- but its
    # credentials get the same re-encoding treatment as the split-var path,
    # not trusted as already-safe.
    if os.environ.get("DATABASE_URL"):
        return _reencode_credentials(os.environ["DATABASE_URL"])

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
