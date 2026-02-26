import sys

def main():
    if len(sys.argv) < 2:
        return

    try:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            lines = f.readlines()
            if not lines:
                return
            longest = max(lines, key=len)
            print(f"Length: {len(longest)}\nLine: {longest.strip()}")
    except FileNotFoundError:
        print("File not found.")

if __name__ == "__main__":
    main()