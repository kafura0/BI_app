"""Debug script — tests DNS + TCP connectivity to the database."""
import os
import socket
import sys
from urllib.parse import urlparse

raw = os.environ.get("DATABASE_URL", "")
if not raw:
    print("FATAL: DATABASE_URL is not set")
    sys.exit(1)

# Mask password for logging
safe = raw
if "@" in raw:
    userinfo, rest = raw.split("@", 1)
    if ":" in userinfo:
        user, _ = userinfo.split(":", 1)
        safe = f"{user}:****@{rest}"
print(f"DATABASE_URL: {safe}")

parsed = urlparse(raw)
host = parsed.hostname
port = parsed.port or 5432
user = parsed.username
db = parsed.path.lstrip("/")

print(f"Host: {host}")
print(f"Port: {port}")
print(f"User: {user}")
print(f"Database: {db}")

# DNS resolution
try:
    ips = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
    print(f"DNS resolution ({len(ips)} results):")
    for ip in ips:
        print(f"  {ip[4][0]} (family={'IPv6' if ip[0] == socket.AF_INET6 else 'IPv4'})")
except Exception as e:
    print(f"DNS resolution FAILED: {e}")
    sys.exit(1)

# TCP connectivity
print(f"Testing TCP connect to {host}:{port}...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(10)
try:
    result = sock.connect_ex((host, port))
    if result == 0:
        print(f"TCP connect SUCCEEDED to {host}:{port}")
    else:
        print(f"TCP connect FAILED with errno {result}: {os.strerror(result)}")
        # Try IPv6
        try:
            print(f"Trying IPv6...")
            sock6 = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
            sock6.settimeout(10)
            result6 = sock6.connect_ex((host, port, 0, 0))
            if result6 == 0:
                print(f"IPv6 connect SUCCEEDED")
            else:
                print(f"IPv6 connect FAILED with errno {result6}: {os.strerror(result6)}")
            sock6.close()
        except Exception as e6:
            print(f"IPv6 connect error: {e6}")
    sock.close()
except Exception as e:
    print(f"TCP connect threw exception: {e}")
    sock.close()

print("Done — db_check passed")
