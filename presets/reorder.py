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
    skip_amount = int(input("Skip X Elemesnts?: "))
    end_idx = start_idx + skip_amount + 200
    selected_lines = []
    last_traversed = start_idx + 1

    print("Controls: [1] Add | [2] Skip | [Z] Undo | [Esc] Save & Exit")

    history = []

    # Iterate through the specified range
    i = start_idx + skip_amount - 1
    while i < end_idx:
        i += 1

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
                    history.append( (1, current_line) )
                    print("Added.")
                    break
                elif event.name == '2':
                    history.append( (2, current_line) )
                    print("Skipped.")
                    break
                elif event.name == 'z':
                    i -= 2
                    prev_change = history.pop()
                    if prev_change[0] == 1:
                        selected_lines.pop()
                    print(f"Undo: {prev_change[1]}")
                    break
                elif event.name == 'esc':
                    print("Early termination triggered.")
                    save_and_exit(all_lines, selected_lines, start_idx, last_traversed, filename)
                    return

    save_and_exit(all_lines, selected_lines, start_idx, last_traversed, filename)

def save_and_exit(original_lines, selection, start_pos, last_pos, filename):
    new_content = original_lines.copy()
    for l in reversed(selection):
        new_content.remove(l)
        new_content.insert(start_pos, l)
        print(l)
    
    if len(new_content) != len(original_lines):
        print("[ERROR] New content doesnt match the original size!")

    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    
    skip_count = last_pos - start_pos - len(selection) - 1

    print(f"Changes saved to {filename}.")
    print(f"Last line inserted: {last_pos - skip_count}")
    print(f"Number of elements skipped: {skip_count}")
    sys.exit()

if __name__ == "__main__":
    run_process('russian-combined.txt')