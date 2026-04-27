#!/bin/bash

set -e  # exit on error

CERT_DIR="certs"

# Create directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genpkey -algorithm RSA \
  -out "$CERT_DIR/private.key" \
  -pkeyopt rsa_keygen_bits:2048

# Extract public key
openssl rsa -pubout \
  -in "$CERT_DIR/private.key" \
  -out "$CERT_DIR/public.key"

# Secure the private key
chmod 600 "$CERT_DIR/private.key"

echo "Keys generated in $CERT_DIR/"
echo "Private key: $CERT_DIR/private.key"
echo "Public key: $CERT_DIR/public.key"
