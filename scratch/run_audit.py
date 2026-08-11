import os

def run_project_audit():
    total_files = 0
    total_src_files = 0
    extension_counts = {}
    
    # Exclude directories
    exclude_dirs = {'.git', 'node_modules', '.next', 'dist', 'build', '.gemini'}
    
    for root, dirs, files in os.walk('.'):
        # Filter directories in place
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            total_files += 1
            ext = os.path.splitext(file)[1]
            if ext in {'.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.prisma'}:
                total_src_files += 1
            extension_counts[ext] = extension_counts.get(ext, 0) + 1
            
    print(f"Total Files (excluding node_modules/next): {total_files}")
    print(f"Total Source Files: {total_src_files}")
    print("Extension distribution:")
    for ext, count in sorted(extension_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {ext}: {count}")

run_project_audit()
