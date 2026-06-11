import os
import json
import base64
import urllib.request
import urllib.error

OWNER = "rnc1127"
REPO = "AI-Supply-Chain-Disruption-Alert-Summarizer"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_github_token():
    # Load token from environment or .env
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        env_path = os.path.join(BASE_DIR, '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if '=' in line:
                        k, v = line.strip().split('=', 1)
                        if k.strip() == 'GITHUB_TOKEN':
                            return v.strip().strip('"').strip("'")
    return token

def make_request(url, method, headers, data=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8') if data else None,
        headers=headers,
        method=method
    )
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode('utf-8')), res.status
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None, 404
        try:
            err_data = json.loads(e.read().decode('utf-8'))
            print(f"Error {e.code}: {err_data.get('message', '')}")
        except Exception:
            print(f"Error {e.code}: {e.reason}")
        return None, e.code
    except Exception as e:
        print(f"Request failed: {e}")
        return None, 500

def get_file_sha(path, headers):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{path}"
    res, status = make_request(url, "GET", headers)
    if status == 200 and res:
        return res.get('sha')
    return None

def upload_file(rel_path, file_path, headers):
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        
        # Base64 encode the binary data
        encoded_content = base64.b64encode(content).decode('utf-8')
        
        # Check if file already exists on GitHub to get its SHA
        # Replace Windows backslashes with forward slashes for URL paths
        github_path = rel_path.replace("\\", "/")
        sha = get_file_sha(github_path, headers)
        
        url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{github_path}"
        payload = {
            "message": f"Upload/update {github_path} via API push helper",
            "content": encoded_content
        }
        if sha:
            payload["sha"] = sha
            
        print(f"Uploading {github_path}...", end="", flush=True)
        res, status = make_request(url, "PUT", headers, payload)
        if status in (200, 201):
            print(" Success!")
            return True
        else:
            print(" Failed.")
            return False
    except Exception as e:
        print(f" Error: {e}")
        return False

def main():
    token = get_github_token()
    if not token:
        print("ERROR: GITHUB_TOKEN not found in environment or .env file.")
        print("Please add 'GITHUB_TOKEN=ghp_your_token' to your .env file and re-run.")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Python-Git-API-Uploader"
    }

    # Directories/Files to ignore
    ignore_dirs = {'.git', '__pycache__', '.gemini', 'scratch'}
    ignore_files = {'database.db', 'test_database.db', 'github_push.py'}

    print(f"Scanning directory: {BASE_DIR}")
    files_to_upload = []

    for root, dirs, files in os.walk(BASE_DIR):
        # Filter out ignored directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            if file in ignore_files:
                continue
            
            # Check file extension
            if file.endswith('.pyc') or file.endswith('.log'):
                continue
                
            abs_path = os.path.join(root, file)
            rel_path = os.path.relpath(abs_path, BASE_DIR)
            files_to_upload.append((rel_path, abs_path))

    print(f"Found {len(files_to_upload)} files to upload to GitHub repository '{OWNER}/{REPO}'.")
    
    success_count = 0
    for rel_path, abs_path in files_to_upload:
        if upload_file(rel_path, abs_path, headers):
            success_count += 1
            
    print(f"\nUpload complete! Successfully uploaded {success_count}/{len(files_to_upload)} files.")

if __name__ == '__main__':
    main()
