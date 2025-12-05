def bytes_to_hex_str(bytes_list):
    """[144, 0x90, '0xcc'] -> [0x90, 0x90, 0xcc]"""
    if not bytes_list: return "[]"
    res = []
    for b in bytes_list:
        if isinstance(b, str):
            res.append(b.lower() if b.startswith("0x") else f"0x{b.lower()}")
        elif isinstance(b, int):
            res.append(f"0x{b:02x}")
        else:
            res.append(str(b))
    return "[" + ", ".join(res) + "]"

def int_to_hex_addr(val: int) -> str:
    return f"0x{val:x}"
