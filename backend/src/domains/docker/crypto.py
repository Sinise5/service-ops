import os
import base64
from cryptography.fernet import Fernet, InvalidToken

_fernet: Fernet | None = None
_enc_key: bytes | None = None


def _load_or_create_key() -> bytes:
    """Load encryption key from env var or .docker_enc_key file."""
    key = os.environ.get("DOCKER_ENC_KEY")
    if key:
        # Accept base64-encoded or raw key
        try:
            return key.encode() if isinstance(key, str) else key
        except Exception:
            pass

    key_file = os.path.join(os.path.dirname(__file__), ".docker_enc_key")
    if os.path.exists(key_file):
        with open(key_file, "rb") as f:
            return f.read()

    # Generate new key
    new_key = Fernet.generate_key()
    with open(key_file, "wb") as f:
        f.write(new_key)
    os.chmod(key_file, 0o600)
    return new_key


def _get_fernet() -> Fernet:
    global _fernet, _enc_key
    if _fernet is None:
        _enc_key = _load_or_create_key()
        _fernet = Fernet(_enc_key)
    return _fernet


class CryptoService:
    """Fernet (AES-128) encryption for SSH credentials."""

    def encrypt(self, plaintext: str) -> str:
        f = _get_fernet()
        return f.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        f = _get_fernet()
        try:
            return f.decrypt(ciphertext.encode()).decode()
        except InvalidToken:
            raise ValueError("Failed to decrypt — key mismatch or corrupted data")
