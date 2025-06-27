#!/bin/bash

# Start the Claude API in the background
echo "Starting Claude API..."
python claude_api.py &
API_PID=$!

# Wait a few seconds for the API to start
sleep 3

# Start ngrok to expose port 5000
echo "Starting ngrok..."
# Make sure ngrok is installed and authenticated
# If ngrok is not in PATH, specify the full path to the ngrok executable
ngrok http 5000 --log=stdout > ngrok.log &
NGROK_PID=$!

# Wait for ngrok to start and write its URL
# This is a bit tricky, ngrok startup time can vary.
# We'll poll the ngrok API for the public URL.
echo "Waiting for ngrok URL..."
NGROK_URL=""
RETRY_COUNT=0
MAX_RETRIES=10 # Try for 20 seconds (10 retries * 2s sleep)

while [ -z "$NGROK_URL" ] && [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; do
  # Try to get the URL from ngrok's API (if available and ngrok version supports it)
  # This is more reliable than parsing logs.
  # Ensure `jq` is installed for this to work: sudo apt-get install jq
  # If you don't have jq or prefer log parsing, adjust accordingly.
  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto=="https") | .public_url')

  if [ -z "$NGROK_URL" ]; then
    # Fallback: try parsing the ngrok.log (less reliable)
    # This specific log parsing might need adjustment based on your ngrok version's log format
    NGROK_URL=$(grep -o 'url=https://[0-9a-zA-Z.-]*\.ngrok-free.app' ngrok.log | head -n1 | cut -d'=' -f2)
  fi

  if [ -z "$NGROK_URL" ]; then
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
  fi
done

if [ -n "$NGROK_URL" ]; then
  echo "Ngrok URL: $NGROK_URL"
  echo "$NGROK_URL" > ngrok_url.txt
  echo "Ngrok URL saved to ngrok_url.txt"
else
  echo "Failed to get ngrok URL after $MAX_RETRIES retries."
  echo "Please check ngrok status manually (e.g., http://127.0.0.1:4040) and ngrok.log."
  # Clean up background processes if ngrok failed
  kill $API_PID
  kill $NGROK_PID
  exit 1
fi

echo "Claude API and ngrok are running."
echo "API PID: $API_PID, Ngrok PID: $NGROK_PID"
echo "Press Ctrl+C to stop."

# Function to clean up processes on exit
cleanup() {
    echo "Stopping ngrok..."
    kill $NGROK_PID
    wait $NGROK_PID 2>/dev/null
    echo "Stopping Claude API..."
    kill $API_PID
    wait $API_PID 2>/dev/null
    rm -f ngrok.log ngrok_url.txt
    echo "Cleanup complete."
    exit 0
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

# Keep the script running until Ctrl+C is pressed
wait $API_PID $NGROK_PID
