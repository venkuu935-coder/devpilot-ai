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

def analyze_codebase(project_path: str):
    """Analyzes the codebase files and returns a list of code review findings."""
    findings = []
    files = get_files_recursively(project_path)
    
    # Store lines of all files for duplicate checks
    file_contents = {}
    
    for abs_path in files:
        rel_path = os.path.relpath(abs_path, project_path).replace("\\", "/")
        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                lines = content.splitlines()
                file_contents[rel_path] = lines
        except Exception:
            continue
            
        # Run individual file analysis
        analyze_unused_variables(lines, rel_path, findings)
        analyze_large_functions(lines, rel_path, findings)
        analyze_naming_issues(lines, rel_path, findings)
        analyze_performance_issues(lines, rel_path, findings)

    # Run multi-file analysis
    analyze_duplicate_code(file_contents, findings)
    
    return findings

def analyze_unused_variables(lines, rel_path, findings):
    """Finds declarations that occur only once in the file."""
    ext = os.path.splitext(rel_path)[1].lower()
    full_text = "\n".join(lines)
    
    # Find candidate variables
    candidates = []
    if ext in [".js", ".ts", ".jsx", ".tsx"]:
        # Match declarations: const name, let name, var name
        matches = re.finditer(r'\b(const|let|var)\s+([a-zA-Z0-9\-_]+)\s*=', full_text)
        for m in matches:
            candidates.append((m.group(2), m.start()))
    elif ext == ".py":
        # Match simple assignments: name = ...
        matches = re.finditer(r'^\s*([a-zA-Z0-9\-_]+)\s*=\s*(?![=])', full_text, re.MULTILINE)
        for m in matches:
            candidates.append((m.group(1), m.start()))
            
    for name, start_pos in candidates:
        # Ignore common keywords/ignore flags
        if name in ["id", "i", "j", "key", "index", "err", "error", "data", "result", "res", "req", "val", "value"]:
            continue
            
        # Count occurrences in the whole text
        occurrences = len(re.findall(r'\b' + re.escape(name) + r'\b', full_text))
        if occurrences == 1:
            # Find line number
            line_no = full_text[:start_pos].count("\n") + 1
            snippet = lines[line_no - 1].strip()
            
            findings.append({
                "file": rel_path,
                "line": line_no,
                "issue_type": "Unused Variable",
                "severity": "Low",
                "description": f"Variable '{name}' is declared but never read or referenced elsewhere in this file.",
                "snippet": snippet,
                "suggestion": f"// Remove variable declaration if it is not needed\n// - {snippet}\n// + (Delete line)"
            })

def analyze_large_functions(lines, rel_path, findings):
    """Finds functions containing more than 60 lines."""
    ext = os.path.splitext(rel_path)[1].lower()
    
    func_start_regex = None
    if ext in [".js", ".ts", ".jsx", ".tsx"]:
        # Match function declarations or arrow assignments
        func_start_regex = re.compile(r'(?:function\s+([a-zA-Z0-9\-_]+)|const\s+([a-zA-Z0-9\-_]+)\s*=\s*\([^)]*\)\s*=>\s*\{)')
    elif ext == ".py":
        func_start_regex = re.compile(r'^\s*def\s+([a-zA-Z0-9\-_]+)\(')
        
    if not func_start_regex:
        return
        
    func_starts = []
    for idx, line in enumerate(lines):
        match = func_start_regex.search(line)
        if match:
            func_name = match.group(1) or match.group(2) or "anonymous"
            func_starts.append((func_name, idx))
            
    # Measure function lengths
    for i, (name, idx) in enumerate(func_starts):
        start_line = idx
        # End is either next function start, or end of file
        end_line = func_starts[i+1][1] if i + 1 < len(func_starts) else len(lines)
        
        # Approximate function size by counting lines between starts
        # (Indentation scanning is more accurate, but line-distance is a highly robust heuristic for large code files)
        length = end_line - start_line
        
        if length > 65:
            snippet = lines[start_line].strip()
            findings.append({
                "file": rel_path,
                "line": start_line + 1,
                "issue_type": "Large Function",
                "severity": "Medium",
                "description": f"Function '{name}' is excessively large ({length} lines of code). Large functions are harder to maintain, test, and debug.",
                "snippet": snippet,
                "suggestion": f"// Consider refactoring and breaking '{name}' down into smaller helper sub-functions.\n// Extract logic into modular helpers to keep core function lengths under 50 lines."
            })

def analyze_naming_issues(lines, rel_path, findings):
    """Flags functions, classes or variables violating naming conventions."""
    ext = os.path.splitext(rel_path)[1].lower()
    
    for idx, line in enumerate(lines):
        line_no = idx + 1
        # Class PascalCase check
        class_match = re.search(r'\bclass\s+([a-zA-Z0-9\-_]+)', line)
        if class_match:
            class_name = class_match.group(1)
            if not class_name[0].isupper() or "_" in class_name:
                findings.append({
                    "file": rel_path,
                    "line": line_no,
                    "issue_type": "Naming Issue",
                    "severity": "Low",
                    "description": f"Class '{class_name}' violates PascalCase naming convention.",
                    "snippet": line.strip(),
                    "suggestion": f"// Refactor class name to PascalCase\nclass {class_name.replace('_', '').capitalize()}:"
                })
                
        # Python function snake_case check
        if ext == ".py":
            func_match = re.search(r'^\s*def\s+([a-zA-Z0-9\-_]+)\(', line)
            if func_match:
                func_name = func_match.group(1)
                # Check for uppercase letters in python function names
                if any(c.isupper() for c in func_name) and not func_name.startswith("__"):
                    findings.append({
                        "file": rel_path,
                        "line": line_no,
                        "issue_type": "Naming Issue",
                        "severity": "Low",
                        "description": f"Python function '{func_name}' contains uppercase letters, violating snake_case conventions.",
                        "snippet": line.strip(),
                        "suggestion": f"def {re.sub(r'(?<!^)(?=[A-Z])', '_', func_name).lower()}():"
                    })
        # JS/TS function camelCase check
        elif ext in [".js", ".ts", ".jsx", ".tsx"]:
            func_match = re.search(r'function\s+([a-zA-Z0-9\-_]+)\(', line)
            if func_match:
                func_name = func_match.group(1)
                # Check for underscores or starting uppercase (unless it is a react component or helper)
                if "_" in func_name and not func_name.isupper():
                    findings.append({
                        "file": rel_path,
                        "line": line_no,
                        "issue_type": "Naming Issue",
                        "severity": "Low",
                        "description": f"JavaScript function '{func_name}' contains underscores, violating camelCase convention.",
                        "snippet": line.strip(),
                        "suggestion": f"function {func_name.replace('_', '')}():"
                    })

def analyze_performance_issues(lines, rel_path, findings):
    """Checks for performance anti-patterns: nested loops, sync IO in controllers, database calls in loops, and hardcoded keys."""
    ext = os.path.splitext(rel_path)[1].lower()
    full_text = "\n".join(lines)
    
    # 1. Check Hardcoded Secrets
    secret_matches = re.finditer(r'\b(JWT_SECRET|PASSWORD|SECRET_KEY|API_KEY|token|auth_key)\s*=\s*[\'"]([^\'"]{6,})[\'"]', full_text, re.IGNORECASE)
    for m in secret_matches:
        line_no = full_text[:m.start()].count("\n") + 1
        snippet = lines[line_no - 1].strip()
        # Ignore sample placeholders
        val = m.group(2).lower()
        if any(ignored in val for ignored in ["your-", "secret_here", "placeholder", "key_here", "sample", "default"]):
            continue
            
        findings.append({
            "file": rel_path,
            "line": line_no,
            "issue_type": "Performance Problem",
            "severity": "Critical",
            "description": f"Hardcoded credential/secret key '{m.group(1)}' found in source code. This poses a major security hazard.",
            "snippet": snippet,
            "suggestion": f"// Load credentials dynamically from system environment variables\nconst {m.group(1)} = process.env.{m.group(1)};"
        })

    # 2. Check Node.js Synchronous I/O in API handlers
    if ext in [".js", ".ts"] and "controllers" in rel_path:
        sync_io_matches = re.finditer(r'\b(fs\.readFileSync|fs\.writeFileSync|fs\.mkdirSync|fs\.rmSync)\b', full_text)
        for m in sync_io_matches:
            line_no = full_text[:m.start()].count("\n") + 1
            snippet = lines[line_no - 1].strip()
            findings.append({
                "file": rel_path,
                "line": line_no,
                "issue_type": "Performance Problem",
                "severity": "High",
                "description": f"Blocking synchronous call '{m.group(1)}' used in API controller. This blocks the main thread and reduces gateway throughput.",
                "snippet": snippet,
                "suggestion": f"// Replace with asynchronous promise operations\nawait fs.promises.{m.group(1).replace('Sync', '')}(...);"
            })

    # 3. Check nested loops O(N^2)
    nested_loops = False
    for idx, line in enumerate(lines):
        line_no = idx + 1
        if "for " in line or "while " in line:
            # Look at next 3 lines for another loop
            for offset in range(1, 4):
                if idx + offset < len(lines):
                    sub_line = lines[idx + offset]
                    if ("for " in sub_line or "while " in sub_line) and ("for" in line or "while" in line):
                        # Nested loop candidate
                        findings.append({
                            "file": rel_path,
                            "line": line_no,
                            "issue_type": "Performance Problem",
                            "severity": "Medium",
                            "description": "Nested loop detected. This introduces O(N^2) time complexity. Ensure N is small or optimize with lookups/maps.",
                            "snippet": line.strip() + " -> " + sub_line.strip(),
                            "suggestion": "// Optimize algorithm complexity. Consider replacing nesting with a key Map lookup lookup."
                        })
                        break

def analyze_duplicate_code(file_contents, findings):
    """Scans for identical blocks of 4+ consecutive lines across different files or sections."""
    lines_db = {}
    # Scan all lines to build hashes of 4-line blocks
    for file, lines in file_contents.items():
        if len(lines) < 4:
            continue
        for idx in range(len(lines) - 3):
            # Strip spaces to look at core content
            block = tuple(lines[idx+i].strip() for i in range(4) if lines[idx+i].strip())
            if len(block) < 4 or any(len(line) < 10 for line in block) or any(line.startswith("//") or line.startswith("#") for line in block):
                continue # Skip trivial or short comments
                
            block_key = "\n".join(block)
            
            if block_key not in lines_db:
                lines_db[block_key] = []
            lines_db[block_key].append((file, idx + 1))
            
    # Find duplicates
    processed_keys = set()
    for block_key, locations in lines_db.items():
        if len(locations) > 1:
            first_loc = locations[0]
            # Flag matching duplicates
            for other_file, other_line in locations[1:]:
                # Prevent duplicate entries for same comparison
                comparison_key = f"{first_loc[0]}:{first_loc[1]}-{other_file}:{other_line}"
                if comparison_key in processed_keys:
                    continue
                processed_keys.add(comparison_key)
                
                findings.append({
                    "file": other_file,
                    "line": other_line,
                    "issue_type": "Duplicate Code",
                    "severity": "Medium",
                    "description": f"Identical block of code duplicated from {first_loc[0]} at line {first_loc[1]}.",
                    "snippet": block_key.splitlines()[0],
                    "suggestion": f"// Extract this duplicate logic into a shared utility function.\n// Import utility to reuse identical lines of code."
                })
