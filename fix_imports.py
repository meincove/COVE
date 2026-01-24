import os

BASE_DIR = r"C:\Users\Adarsh\Desktop\cove-dev\COVE\frontend\src"

def fix_imports():
    count = 0
    for root, dirs, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    if "@/src/" in content:
                        new_content = content.replace("@/src/", "@/")
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        print(f"Fixed: {path}")
                        count += 1
                except Exception as e:
                    print(f"Error reading {path}: {e}")
    print(f"Total fixed: {count}")

if __name__ == "__main__":
    fix_imports()
