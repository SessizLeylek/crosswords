import keyboard
import sys

def run_process(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: {filename} not found.")
        return

    start_idx = int(input("Start Index?: ")) - 1
    end_idx = start_idx + 200
    selected_lines = []
    last_traversed = start_idx + 1

    print("Controls: [1] Add | [2] Skip | [Esc] Save & Exit")

    # Iterate through the specified range
    for i in range(start_idx, end_idx):
        if i >= len(all_lines):
            break
            
        last_traversed = i + 1
        current_line = all_lines[i].strip()
        print(f"Line {last_traversed}: {current_line}")

        # Wait for key press
        while True:
            event = keyboard.read_event()
            if event.event_type == keyboard.KEY_DOWN:
                if event.name == '1':
                    selected_lines.append(current_line + '\n')
                    print("Added.")
                    break
                elif event.name == '2':
                    print("Skipped.")
                    break
                elif event.name == 'esc':
                    print("Early termination triggered.")
                    save_and_exit(all_lines, selected_lines, start_idx, last_traversed, filename)
                    return

    save_and_exit(all_lines, selected_lines, start_idx, last_traversed, filename)

def save_and_exit(original_lines, selection, start_pos, last_pos, filename):
    # Construct the new file content:
    # 1. Everything before line 2050
    # 2. The new selected list (starting at 2051)
    # 3. Everything after the last traversed line
    
    new_content = original_lines[:start_pos + 1] + selection + original_lines[last_pos:]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    
    print(f"Changes saved to {filename}.")
    print(f"Last line traversed: {last_pos}")
    print(f"Items reordered starting from line 2051.")
    sys.exit()

if __name__ == "__main__":
    run_process('russian-combined.txt')