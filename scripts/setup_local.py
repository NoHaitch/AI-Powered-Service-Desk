"""Generate local Compose credentials and a loopback TLS certificate."""

import hashlib
import os
import secrets
import shutil
import subprocess
from pathlib import Path

LOCAL = Path(__file__).resolve().parents[1] / ".local"


def save_once(path: Path, value: str) -> None:
    try:
        with path.open("x", encoding="utf-8", newline="\n") as secret_file:
            secret_file.write(value + "\n")
    except FileExistsError:
        pass
    # The private parent directory protects host access. Container UIDs read mounted files.
    path.chmod(0o644)


def main() -> None:
    LOCAL.mkdir(mode=0o700, exist_ok=True)
    if os.name == "posix":
        LOCAL.chmod(0o700)
    for name in (
        "postgres_admin_password",
        "desk_runtime_password",
        "desk_migration_password",
        "desk_redis_password",
    ):
        save_once(LOCAL / name, secrets.token_urlsafe(36))

    password = (LOCAL / "desk_redis_password").read_text(encoding="utf-8").strip()
    digest = hashlib.sha256(password.encode()).hexdigest()
    acl = LOCAL / "redis_acl"
    save_once(acl, f"user default off\nuser desk on #{digest} ~limiter:* -@all +ping")
    if f"#{digest}" not in acl.read_text(encoding="utf-8"):
        raise SystemExit("Redis password and ACL do not match. Restore the matching local files.")

    cert, key = LOCAL / "local-tls.crt", LOCAL / "local-tls.key"
    if cert.exists() != key.exists():
        raise SystemExit("The local TLS file pair is incomplete. Restore the matching files.")
    if not cert.exists():
        mkcert = shutil.which("mkcert")
        if not mkcert:
            raise SystemExit("Install mkcert and trust its local CA, then rerun this command.")
        subprocess.run(
            [mkcert, "-cert-file", str(cert), "-key-file", str(key), "localhost", "127.0.0.1"],
            check=True,
        )
    cert.chmod(0o644)
    key.chmod(0o644)
    print("Local Compose credentials and TLS files are ready in .local/.")


if __name__ == "__main__":
    main()
