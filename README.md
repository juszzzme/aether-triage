# Aether Triage Dashboard

A full-stack, AI-powered system designed to process, analyze, and automate customer support tickets. The system features a modern, interactive 3D frontend interface for agents to view insights, and a robust backend that handles intelligent ticket routing, PII data masking, and automated resolution suggestions.

## Tech Stack

### Frontend
- **React 19 & Vite**
- **Three.js** (via `@react-three/fiber` & `@react-three/drei`) for 3D elements and post-processing effects
- **Framer Motion** for UI animations
- **Tailwind CSS v4** for styling and utility classes
- **Lucide React** for iconography

### Backend
- **Python**, **FastAPI**, and **Uvicorn** for a high-performance, asynchronous API
- **PyTorch**, **HuggingFace Transformers**, and **spaCy** for NLP / ML processing (classification, entity extraction)
- **EasyOCR** and **Pillow** for image parsing
- Built-in structured logging, error handling middleware, and correlation ID tracking

## Features
- **PII Masker**: Automatically scrubs sensitive data (phone numbers, card details) before analysis to maintain compliance and security.
- **Vertical Classifier**: Categorizes the core issue (e.g., PAYMENTS, REFUNDS, ACCOUNT).
- **Intent Detector**: Uses ML to extract the intent of the user along with relevant entities (e.g., parsing a "refund" request for "Rs 500").
- **Resolution Engine**: Compiles data, assesses risk levels, and generates automated resolution suggestions.
- **Interactive 3D Dashboard**: A beautifully designed UI for agents to monitor triage health.

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Python 3.10+ (for backend)

### Running Locally
To spin up both the frontend and backend locally for development:

1. Ensure you have installed the root, frontend, and backend dependencies.
2. Run the provided batch script:
```bash
./run_dev.bat
```

Alternatively, you can run the system using Docker:
```bash
docker compose up
```

For more details on backend architecture or deployment, refer to `backend/README.md` or `DOCKER_QUICKSTART.md`.
