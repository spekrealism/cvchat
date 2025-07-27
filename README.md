# CV Project with Express Backend

Monorepository with SvelteKit frontend and Express backend.

## Project Structure

```
/
├── frontend/         # SvelteKit frontend
│   ├── src/          # Frontend source code
│   ├── static/       # Static files
│   └── ...
├── backend/          # Express backend
│   ├── index.js      # Main server file
│   └── ...
└── ...
```

## Installation

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory based on `.env.example`.

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory based on `.env.example`.

## Development Mode

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

## Build and Run for Production

### Backend

```bash
cd backend
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

## Docker

To run the entire project using Docker:

```bash
docker-compose up --build
```

## Features

- Vertical timeline with letter animations and connections
- Interactive "cellular apparatus" effect linking letters into words
- Adaptive design
- Modern and clean interface

## CI/CD Deployment

This project includes a CI/CD pipeline for automated deployment to a VPS.

### Setup on VPS

1. Make sure the VPS has Docker and Docker Compose installed
2. Run the initial setup script:
   ```bash
   ./deploy-setup.sh <vps-user> <vps-host>
   ```

### GitHub Repository Configuration

1. Add the following secrets to your GitHub repository:
   - `VPS_HOST` - Your VPS IP address
   - `VPS_USERNAME` - Your VPS username
   - `VPS_SSH_KEY` - Your private SSH key for connecting to the VPS

2. Push to the main branch to trigger the CI/CD pipeline:
   ```bash
   git push origin main
   ```

### Manual Deployment

To deploy the application manually to a VPS:

```bash
# Connect to VPS
ssh <username>@<vps-host>

# Navigate to project directory
cd ~/cv-project

# Update and restart the application
docker-compose pull
docker-compose up -d
```

## Technologies

- Svelte/SvelteKit
- TypeScript
- CSS Animations
- Docker & Docker Compose
- GitHub Actions for CI/CD

## License

MIT

