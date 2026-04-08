import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from crypto_utils import (
    generate_rsa_key_pair, generate_aes_key,
    aes_encrypt, aes_decrypt,
    rsa_encrypt, rsa_decrypt,
    rsa_sign, rsa_verify
)
from mitm_simulator import simulate_mitm_attack

app = Flask(__name__, static_folder='static', static_url_path='/')
CORS(app)

# Global store for Server keys (Simulating Server having a known public key)
SERVER_PRIVATE, SERVER_PUBLIC = generate_rsa_key_pair()
# Global store for Client keys
CLIENT_PRIVATE, CLIENT_PUBLIC = generate_rsa_key_pair()

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    message = data.get('message', '')
    attack_mode = data.get('attack_mode', 'random') # 'random', 'force_attack', 'force_safe'

    message_bytes = message.encode('utf-8')

    # STEP 1: Client encrypts message and signs it
    aes_key = generate_aes_key()
    encrypted_message_b64 = aes_encrypt(aes_key, message_bytes)

    # Secure the AES key with Server's public RSA key
    encrypted_aes_key_b64 = rsa_encrypt(SERVER_PUBLIC, aes_key)

    # Sign the message
    signature_b64 = rsa_sign(CLIENT_PRIVATE, message_bytes)

    # STEP 2: Transmission (Attacker can intercept)
    force_attack = (attack_mode == 'force_attack')
    force_safe = (attack_mode == 'force_safe')

    intercepted_ciphertext_b64, is_attacked = simulate_mitm_attack(
        encrypted_message_b64, 
        force_attack=force_attack, 
        force_safe=force_safe
    )

    # STEP 3: Server Decrypts and Verifies
    attack_detected = False
    decrypted_message_str = "FAILED"

    # Server decrypts AES key using its private RSA key
    recovered_aes_key = rsa_decrypt(SERVER_PRIVATE, encrypted_aes_key_b64)

    if recovered_aes_key:
        # Server decrypts the intercepted message
        recovered_message_bytes = aes_decrypt(recovered_aes_key, intercepted_ciphertext_b64)

        if recovered_message_bytes:
            # Server verifies signature
            is_valid = rsa_verify(CLIENT_PUBLIC, recovered_message_bytes, signature_b64)
            if is_valid:
                decrypted_message_str = recovered_message_bytes.decode('utf-8', errors='ignore')
            else:
                attack_detected = True
        else:
            attack_detected = True
    else:
        attack_detected = True

    final_status = "SUCCESS" if not attack_detected and decrypted_message_str == message else "ATTACK DETECTED"
    if attack_detected:
         final_status = "ATTACK DETECTED"

    return jsonify({
        "original_message": message,
        "encrypted_message": encrypted_message_b64,
        "attacker_view": intercepted_ciphertext_b64,
        "attack_status": "ATTACKED" if is_attacked else "SAFE",
        "decrypted_message": decrypted_message_str,
        "final_status": final_status
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
