# Secure Chatbot Frontend

This project is a React-based frontend for a chatbot application. It includes features such as text-to-speech and speech-to-text using the Web Speech API, OCR functionality using a custom scribe.js which operates a tesseract.js in browser engine for ocr capabilites, and a user-friendly interface with various UI components.

## Table of Contents

- Prerequisites
- Installation
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- Usage
- Contributing
- License

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/secure-chatbot-frontend.git
   cd secure-chatbot-frontend
   ```

2. **Install dependencies:**

   Using npm:

   ```bash
   npm install
   ```

   Or using yarn:

   ```bash
   yarn install
   ```

## Running the Application

1. **Start the development server:**

   Using npm:

   ```bash
   npm run dev
   ```

   Or using yarn:

   ```bash
   yarn dev
   ```

2. **Open your browser and navigate to:**

   ```
   http://localhost:5173
   ```

## Project Structure

```
secure-chatbot-frontend/
├── public/
│   ├── index.html
│   └── ...
├── src/
│   ├── assets/
│   │   ├── user_profile_icon.png
│   │   └── bot_profile_icon.png
│   ├── components/
│   │   ├── ui/
│   │   │   ├── avatar.jsx
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── input.jsx
│   │   │   ├── scroll-area.jsx
│   │   │   └── alert.jsx
│   │   ├── chatbot/
│   │   │   ├── CloseChatbotButton.jsx
│   │   │   ├── RefreshChatbotButton.jsx
│   │   │   ├── ChoiceOptions.jsx
│   │   │   └── Spinner.jsx
│   │   └── Chatbot.jsx
│   ├── App.jsx
│   ├── index.jsx
│   └── ...
├── .gitignore
├── package.json
├── README.md
├── vite.config.js
├── template.yaml
├── components.json
├── samconfig.toml
└── ...
```

## Usage

- **Text Input:** Type your message in the input field and press "Send" to communicate with the chatbot.
- **Voice Input:** Click the "Speak" button to start voice recognition and speak your message. Click "Stop" to end voice recognition.
- **File Upload:** Upload an image or PDF file to extract text using OCR.
- **Refresh Chatbot:** Click the refresh button to reset the conversation.
- **Close Chatbot:** Click the close button to minimize the chatbot.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature/branch`).
6. Open a pull request.
7. After successful test merge branch then delete. 

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## **NOTES
To run locally add the following to line 6 in the useAuth.js
```
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzRhYmNkIiwidXNlcm5hbWUiOiJ1c2VyIiwiaWF0IjoxNzIyMDI3NTE4LCJleHAiOjE3MjIwMzExMTh9.heIiDB2MbUsJrPK5wCAskWPNyQ0R_gFRsx6Pnlogmmk";
```