# AI-Powered Interview Assistant

This is a React project for an **AI-Powered Interview Assistant**.

## Features
- Resume parsing (PDF/DOCX) for Name, Email, Phone
- Mini-chatbot for missing info
- Timed interview with Gemini-generated questions
- Automatic scoring with Google Gemini API
- Dashboard for interviewers to search, sort, and view candidate results

## Tech Stack
- React (CRA) + Ant Design
- Redux Toolkit + Persist
- Gemini API
- pdfjs-dist + mammoth

## Setup
```bash
git clone https://github.com/sidran1310/swipeinterviewassistant.git
cd swipeinterviewassistant
npm install

echo "REACT_APP_GEMINI_API_KEY=your_key_here" > .env

npm start
```

## Workflow
1. Upload resume → parse Name/Email/Phone
2. Chatbot asks for missing details
3. Start timed interview
4. Submit answers and click Score my answers
5. Scores + summary shown, candidate auto-saved to Dashboard
6. Interviewer can switch to **Interviewer Dashboard** to view results for all candidates.