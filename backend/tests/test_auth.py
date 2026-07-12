"""Plain assert-based tests for password hashing + JWT round-trips (no DB, no I/O).
Run: python tests/test_auth.py   (also pytest-discoverable if pytest is installed)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import jwt  # noqa: E402

from app.auth import ALGORITHM, create_access_token, hash_password, verify_password  # noqa: E402


def test_hash_and_verify_round_trip():
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)


def test_wrong_password_fails_verification():
    hashed = hash_password("correct horse battery staple")
    assert not verify_password("wrong password", hashed)


def test_hash_is_not_the_plaintext():
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"


def test_access_token_round_trip():
    import os

    token = create_access_token(merchant_id=42)
    payload = jwt.decode(token, os.environ["SECRET_KEY"], algorithms=[ALGORITHM])
    assert payload["sub"] == "42"


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"OK: {t.__name__}")
    print(f"\n{len(tests)} tests passed.")
