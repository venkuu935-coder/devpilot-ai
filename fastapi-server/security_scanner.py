import os
import re

def get_files_recursively(dir_path: str):
    """Walks the directory and gathers source code files."""
    code_files = []
    if not os.path.exists(dir_path):
        return code_files
        
    for root, dirs, files in os.walk(dir_path):
        # Skip dependency directories
        if any(ignored in root for ignored in ["node_modules", "dist", "build", ".git", ".next", "bin", "obj", "vendor"]):
            continue
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs"]:
                code_files.append(os.path.join(root, file))
    return code_files

def scan_security(project_path: str):
    """Audits codebase files for security vulnerabilities and returns findings."""
    findings = []
    files = get_files_recursively(project_path)
    
    for abs_path in files:
        rel_path = os.path.relpath(abs_path, project_path).replace("\\", "/")
        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                lines = content.splitlines()
        except Exception:
            continue
            
        # Run individual scanners
        scan_sql_injection(lines, rel_path, findings)
        scan_xss(lines, rel_path, findings)
        scan_authentication_problems(lines, rel_path, findings)
        scan_missing_validation(lines, rel_path, findings)
        scan_hardcoded_secrets(lines, rel_path, findings)
        scan_potential_bugs(lines, rel_path, findings)
        
    return findings

def scan_sql_injection(lines, rel_path, findings):
    """Finds raw SQL queries concatenated directly with variables."""
    full_text = "\n".join(lines)
    
    # Matches patterns like: query("SELECT ... " + var) or template strings `SELECT ... ${var}` inside query functions
    concat_sql_regexes = [
        re.compile(r'\.(query|execute|run)\s*\(\s*[\'"].*?[\'"]\s*\+\s*\w+', re.IGNORECASE),
        re.compile(r'\.(query|execute|run)\s*\(\s*`[\s\S]*?\$\{\w+\}[\s\S]*?`\s*\)', re.IGNORECASE),
        re.compile(r'\.(query|execute|run)\s*\(\s*f[\'"].*?\{\w+\}.*?[\'"]\)', re.IGNORECASE)
    ]
    
    for regex in concat_sql_regexes:
        for m in regex.finditer(full_text):
            line_no = full_text[:m.start()].count("\n") + 1
            snippet = lines[line_no - 1].strip()
            
            findings.append({
                "file": rel_path,
                "line": line_no,
                "issue_type": "SQL Injection",
                "severity": "Critical",
                "description": "SQL Injection vulnerability detected. Directly concatenating variables into raw SQL queries can allow attackers to manipulate execution commands.",
                "snippet": snippet,
                "recommendation": "// Use parameterized queries / prepared statements instead of direct concatenations\n// E.g.\n// - db.query(\"SELECT * FROM users WHERE id = \" + userId);\n// + db.query(\"SELECT * FROM users WHERE id = ?\", [userId]);"
            })

def scan_xss(lines, rel_path, findings):
    """Finds dangerous HTML render operations without escaping."""
    full_text = "\n".join(lines)
    
    # React dangerouslySetInnerHTML
    matches = re.finditer(r'\bdangerouslySetInnerHTML\s*=', full_text)
    for m in matches:
        line_no = full_text[:m.start()].count("\n") + 1
        snippet = lines[line_no - 1].strip()
        findings.append({
            "file": rel_path,
            "line": line_no,
            "issue_type": "XSS (Cross-Site Scripting)",
            "severity": "High",
            "description": "Cross-Site Scripting (XSS) risk via dangerouslySetInnerHTML. Rendering raw HTML can let attackers inject harmful client-side scripts.",
            "snippet": snippet,
            "recommendation": "// Sanitize the input content using DOMPurify before rendering\n// import DOMPurify from 'dompurify';\n// <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />"
        })
        
    # innerHTML assignments
    inner_html_matches = re.finditer(r'\b\.innerHTML\s*=', full_text)
    for m in inner_html_matches:
        line_no = full_text[:m.start()].count("\n") + 1
        snippet = lines[line_no - 1].strip()
        findings.append({
            "file": rel_path,
            "line": line_no,
            "issue_type": "XSS (Cross-Site Scripting)",
            "severity": "High",
            "description": "Direct write to innerHTML detected. Bypasses normal DOM escaping and risks cross-site scripting vulnerabilities.",
            "snippet": snippet,
            "recommendation": "// Use textContent or safe element generation APIs instead of innerHTML\n// - element.innerHTML = userInput;\n// + element.textContent = userInput;"
        })

def scan_authentication_problems(lines, rel_path, findings):
    """Detects API routes defined without authentication check middlewares."""
    # Check only API routing definition files
    if "routes" not in rel_path and "router" not in rel_path:
        return
        
    for idx, line in enumerate(lines):
        line_no = idx + 1
        # Match routes declaration in Express: router.get('/path', handler)
        match = re.search(r'\brouter\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*,\s*([a-zA-Z0-9\-_]+)\s*\)', line)
        if match:
            method = match.group(1).upper()
            path = match.group(2)
            handler = match.group(3)
            
            # Skip public auth routes
            if any(public in path for public in ["/login", "/register", "/forgot", "/reset"]):
                continue
                
            findings.append({
                "file": rel_path,
                "line": line_no,
                "issue_type": "Authentication Problem",
                "severity": "High",
                "description": f"Route '{method} {path}' is defined without auth guards or middleware. Unauthenticated clients may query this endpoint.",
                "snippet": line.strip(),
                "recommendation": f"// Bind a JWT check middleware to authenticate the requests\n// - router.{method.lower()}('{path}', {handler});\n// + router.{method.lower()}('{path}', authenticateToken, {handler});"
            })

def scan_missing_validation(lines, rel_path, findings):
    """Finds API handlers pulling user payload from request without schema validation."""
    if "controllers" not in rel_path and "handlers" not in rel_path:
        return
        
    full_text = "\n".join(lines)
    
    # Matches destructuring payload, e.g. const { username, email } = req.body
    matches = re.finditer(r'\bconst\s*\{\s*([a-zA-Z0-9\-_,\s]+)\s*\}\s*=\s*req\.(body|query)\b', full_text)
    for m in matches:
        line_no = full_text[:m.start()].count("\n") + 1
        snippet = lines[line_no - 1].strip()
        
        # Check if validation keywords (zod, validate, safeParse, check, schema) occur nearby (within +/- 12 lines)
        start_line = max(0, line_no - 12)
        end_line = min(len(lines), line_no + 12)
        context_chunk = "\n".join(lines[start_line:end_line]).lower()
        
        if not any(kw in context_chunk for kw in ["zod", "validate", "safeparse", "check", "schema", "validation"]):
            findings.append({
                "file": rel_path,
                "line": line_no,
                "issue_type": "Missing Validation",
                "severity": "Medium",
                "description": "Endpoint receives request inputs without validation. Clients could send malformed payloads causing server crashes or DB corruption.",
                "snippet": snippet,
                "recommendation": "// Define a schema validation rule (using Zod or similar library) to parse client input\n// const validatedData = loginSchema.parse(req.body);"
            })

def scan_hardcoded_secrets(lines, rel_path, findings):
    """Finds credentials, access keys, or private key assignments."""
    full_text = "\n".join(lines)
    
    secret_regex = re.compile(r'\b(AWS_SECRET|SECRET_KEY|DB_PASSWORD|JWT_SECRET|API_KEY|token|password)\s*=\s*[\'"]([a-zA-Z0-9_\-\.\/]{10,})[\'"]', re.IGNORECASE)
    for m in secret_regex.finditer(full_text):
        line_no = full_text[:m.start()].count("\n") + 1
        snippet = lines[line_no - 1].strip()
        val = m.group(2).lower()
        
        # Ignore sample placeholders
        if any(ignored in val for ignored in ["your-", "secret_here", "placeholder", "key_here", "sample", "default"]):
            continue
            
        findings.append({
            "file": rel_path,
            "line": line_no,
            "issue_type": "Hardcoded Secret",
            "severity": "Critical",
            "description": f"Hardcoded credential/secret key '{m.group(1)}' found in source code. This poses a major security hazard.",
            "snippet": snippet,
            "recommendation": f"// Load credentials dynamically from system environment variables\nconst {m.group(1)} = process.env.{m.group(1)};"
        })

def scan_potential_bugs(lines, rel_path, findings):
    """Flags general logical code smells: empty catch blocks, weak comparison checks."""
    full_text = "\n".join(lines)
    
    # 1. Empty catch blocks
    catch_matches = re.finditer(r'\bcatch\s*\(\s*\w+\s*\)\s*\{\s*\}', full_text)
    for m in catch_matches:
        line_no = full_text[:m.start()].count("\n") + 1
        snippet = lines[line_no - 1].strip()
        findings.append({
            "file": rel_path,
            "line": line_no,
            "issue_type": "Potential Bug",
            "severity": "Medium",
            "description": "Empty catch block detected. Silently swallowing exceptions hides bugs and makes tracing runtime failure points extremely difficult.",
            "snippet": snippet,
            "recommendation": "// Log the caught error to console or error service\n// } catch (err) {\n//   console.error(err);\n// }"
        })
        
    # 2. Insecure weak comparisons for sensitive checks
    for idx, line in enumerate(lines):
        line_no = idx + 1
        if "role ==" in line or "token ==" in line or "password ==" in line:
            if "===" not in line:
                findings.append({
                    "file": rel_path,
                    "line": line_no,
                    "issue_type": "Potential Bug",
                    "severity": "Low",
                    "description": "Weak comparison operator (==) used for security-critical parameters. Prefer strict comparison (===) to avoid type coercion issues.",
                    "snippet": line.strip(),
                    "recommendation": "// Replace == with strict comparison operator ===\n// if (user.role == 'admin')\n// if (user.role === 'admin')"
                })
