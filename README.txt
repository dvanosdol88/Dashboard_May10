===============================
📋 INSTRUCTIONS FOR DEVELOPER
===============================

This package includes a fully working iPad-optimized task dashboard with:
- Local task tracking (Work & Personal)
- Embedded Google Calendar (shared with Julie)
- Live prompt interface for ChatGPT
- Backend connectivity ready (e.g., to Google Cloud Function)

-----------------------
📂 Included Files:
-----------------------
1. dashboard.html - The full HTML file for the dashboard
2. firebase.json  - Hosting config for Firebase
3. README.txt      - This instructions file

-----------------------
🛠️ Setup Instructions:
-----------------------

1. Deploy `dashboard.html` to Firebase Hosting or other static hosting.
2. Configure `firebase.json` if using Firebase (`firebase deploy` after login).
3. Replace the placeholder URL in `submitPrompt()` in the script:
   - Find: `https://YOUR_BACKEND_ENDPOINT/ask-gpt`
   - Replace with your actual Google Cloud Function endpoint that:
     a) Receives a `prompt` string
     b) Calls the OpenAI API with it
     c) Returns `{ answer: "..." }`

4. Add optional security/authentication if exposed online.

5. (Optional) Enhance with Drive/Docs/Photos integration via your backend.

You're good to go!