#!/bin/bash

# Make sure the script is being run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./setup-port.sh)"
  exit 1
fi

# Get the path to the Node.js executable
NODE_PATH=$(which node)

# Set capability to allow Node.js to bind to privileged ports
setcap 'cap_net_bind_service=+ep' $NODE_PATH

echo "Node.js ($NODE_PATH) has been granted permission to bind to privileged ports (80, 443)."
echo "You can now run your application without sudo:"
echo "pm2 start ecosystem.config.js" 