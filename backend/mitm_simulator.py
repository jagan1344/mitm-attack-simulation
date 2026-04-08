import random
import base64

def simulate_mitm_attack(ciphertext_b64: str, force_attack: bool = False, force_safe: bool = False):
    """
    Simulates a MITM attack. 
    Returns (intercepted_ciphertext_b64, is_attacked)
    """
    if force_attack:
        is_attacked = True
    elif force_safe:
        is_attacked = False
    else:
        is_attacked = random.random() < 0.5
    
    if is_attacked:
        # Tamper the ciphertext by modifying some bytes
        try:
            data = bytearray(base64.b64decode(ciphertext_b64))
            if len(data) > 20:
                # modify a byte in the middle
                data[20] = data[20] ^ 0xFF
            elif len(data) > 0:
                data[0] = data[0] ^ 0xFF
            return base64.b64encode(data).decode('utf-8'), True
        except Exception:
            return ciphertext_b64, True
    else:
        return ciphertext_b64, False
