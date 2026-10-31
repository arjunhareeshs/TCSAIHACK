"""Path safety, secret masking and small shared helpers."""
import hashlib
import re
from pathlib import Path

MAX_TEXT_BYTES = 2_000_000


class PathEscape(ValueError):
    pass


def safe_path(root: Path, rel: str) -> Path:
    """Resolve rel inside root. Refuses escapes (including symlinks) and .git internals."""
    rel = rel.replace("\\", "/").lstrip("/")
    root_r = root.resolve()
    p = (root_r / rel).resolve()
    if p != root_r and root_r not in p.parents:
        raise PathEscape(f"path escapes project root: {rel}")
    if ".git" in p.relative_to(root_r).parts:
        raise PathEscape("reading .git internals is not allowed")
    return p


def sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8", "replace")).hexdigest()


def read_text(path: Path) -> str | None:
    try:
        if path.stat().st_size > MAX_TEXT_BYTES:
            return None
        data = path.read_bytes()
    except OSError:
        return None
    if b"\x00" in data[:4096]:
        return None
    return data.decode("utf-8", errors="replace")


_QUOTED_SECRET = re.compile(
    r"""(?i)\b((?:api[_-]?key|secret|token|passwd|password|private[_-]?key|access[_-]?key)[\w-]*\s*[:=]\s*)(["'])([^"'\s]{6,})\2"""
)
_KNOWN_KEYS = re.compile(
    r"\b(sk-[A-Za-z0-9_\-]{16,}|gsk_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_\-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b"
)
_URL_CRED = re.compile(r"(?i)\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^:\s/]+:)([^@\s]+)(@)")
_ENV_LINE = re.compile(r"^(\s*(?:export\s+)?[A-Za-z_][\w.]*\s*=\s*)(.*)$")


def is_env_file(rel: str) -> bool:
    name = rel.replace("\\", "/").rsplit("/", 1)[-1].lower()
    return name.startswith(".env") or name.endswith(".env")


def has_secret(line: str) -> bool:
    return bool(_QUOTED_SECRET.search(line) or _KNOWN_KEYS.search(line) or _URL_CRED.search(line))


def mask_secrets(text: str, rel: str = "") -> str:
    """Mask credential values. .env files keep variable names only."""
    if is_env_file(rel):
        out = []
        for line in text.splitlines():
            m = _ENV_LINE.match(line)
            out.append(f"{m.group(1)}<redacted>" if m and not line.lstrip().startswith("#") else line)
        return "\n".join(out)
    text = _QUOTED_SECRET.sub(lambda m: f"{m.group(1)}{m.group(2)}<redacted>{m.group(2)}", text)
    text = _KNOWN_KEYS.sub("<redacted-key>", text)
    return _URL_CRED.sub(lambda m: f"{m.group(1)}<redacted>{m.group(3)}", text)


def numbered(text: str, start: int = 1) -> str:
    return "\n".join(f"{i}: {ln}" for i, ln in enumerate(text.splitlines(), start))
