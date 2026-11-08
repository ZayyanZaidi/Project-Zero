#!/usr/bin/env python3
import os
import sys
import time
import urllib.request

URL = "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf"
DEST = "/home/zayyan/brain/models/qwen2.5-3b-instruct-q4_k_m.gguf"
TOTAL_SIZE = 2104932768

def download():
    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    while True:
        curr_size = os.path.getsize(DEST) if os.path.exists(DEST) else 0
        if curr_size >= TOTAL_SIZE:
            print(f"\nDownload complete: {curr_size} bytes.")
            sys.exit(0)
        
        pct = (curr_size / TOTAL_SIZE) * 100
        print(f"\nResuming from {curr_size // (1024*1024)} MB ({pct:.1f}%)...")
        
        req = urllib.request.Request(URL, headers={
            "Range": f"bytes={curr_size}-",
            "User-Agent": "Mozilla/5.0"
        })
        
        try:
            with urllib.request.urlopen(req, timeout=30) as resp, open(DEST, "ab") as f:
                last_print = time.time()
                bytes_since = 0
                while True:
                    chunk = resp.read(1024 * 512)
                    if not chunk:
                        break
                    f.write(chunk)
                    curr_size += len(chunk)
                    bytes_since += len(chunk)
                    now = time.time()
                    if now - last_print >= 5:
                        speed = (bytes_since / 1024) / (now - last_print)
                        pct = (curr_size / TOTAL_SIZE) * 100
                        print(f"[{pct:5.1f}%] {curr_size // (1024*1024)} / {TOTAL_SIZE // (1024*1024)} MB | {speed:.1f} KB/s", flush=True)
                        last_print = now
                        bytes_since = 0
        except Exception as e:
            print(f"Connection reset ({e}), reconnecting in 2 seconds...", flush=True)
            time.sleep(2)

if __name__ == "__main__":
    download()

