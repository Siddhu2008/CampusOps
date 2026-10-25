# CampusOps — Data Structures Project

CampusOps is a small campus operations dashboard built to demonstrate how two classic data structures work in a real application: a queue and a stack.

The project simulates a campus help desk where students or staff report problems such as broken chairs, Wi-Fi issues, water leaks, or projector failures. The dashboard shows incidents in a clean operations-console layout and lets the user:

- add new incidents to the queue
- process the oldest open incident first
- mark incidents as resolved and push them onto a stack
- undo the latest resolved action and bring it back to the queue

This makes the project a practical DSA demo: instead of only showing abstract array operations, it applies FIFO and LIFO logic to real-world incident management.

## What this project does

### Queue behavior (FIFO)

A queue follows First In, First Out. The first incident reported is the first one processed.

In this app:

- new incidents are inserted at the back of the queue
- the dashboard shows the next incident waiting in line
- the "Process next" action removes the oldest open incident from the queue
- the incident is marked as resolved in MongoDB

### Stack behavior (LIFO)

A stack follows Last In, First Out. The most recently resolved incident is the first one to be undone.

In this app:

- every processed incident is pushed onto the stack
- the top of the stack is shown as the latest resolved incident
- "Undo latest" pops the most recent resolved incident and reopens it
- the app restores the completed stack from MongoDB on startup

## How the project works

### 1. Front end

The UI is in the `public` folder:

- `public/index.html` defines the dashboard layout and controls
- `public/app.js` fetches data from the API and updates the UI
- `public/style.css` handles the visual design

The dashboard includes:

- overview metrics
- current queue and stack counts
- next incident in queue
- top of resolved stack
- table of incidents with search and filters
- incident submission dialog

### 2. Backend server

`server.js` creates an Express API and connects to MongoDB.

It provides endpoints such as:

- `GET /api/dashboard` — fetch dashboard data
- `POST /api/incidents` — create a new incident
- `POST /api/queue/process-next` — process the next queue item
- `POST /api/stack/undo` — reopen the most recent resolved item

The server reads and writes incident data stored in a MongoDB collection called `incidents`.

### 3. Data structure logic

`structures.js` contains the custom implementations:

- `IncidentQueue` with enqueue, dequeue, peek, length, and isEmpty
- `IncidentStack` with push, pop, peek, length, and isEmpty

These classes are lightweight and demonstrate core DSA operations without requiring a large framework.

### 4. Database persistence

MongoDB stores all incidents and their status:

- `OPEN` incidents are waiting in the queue
- `DONE` incidents are resolved and stored on the stack

When the server starts, it rebuilds the in-memory stack from previously resolved records and rebuilds the queue from open incidents when needed.

## Project structure

- `server.js` — Express API and MongoDB logic
- `structures.js` — queue and stack implementations
- `public/` — web dashboard frontend
- `tests/structures.test.js` — DSA unit tests
- `.env.example` — example environment settings
- `.env` — local environment variables (kept private)
- `package.json` — project scripts and dependencies

## Requirements

- Node.js 18 or later
- MongoDB Atlas or a local MongoDB instance

## Setup and run

1. Open PowerShell in the project folder.
2. Install dependencies:

```powershell
npm install
```

3. Make sure your MongoDB connection details are present in `.env`.

Example:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority
MONGODB_DATABASE=campus_ops
```

If the project has no `.env` file yet, copy the example file first:

```powershell
Copy-Item .env.example .env
```

4. Start the app:

```powershell
npm start
```

5. Open the dashboard in your browser:

```text
http://localhost:3000
```

## How to use it

1. Click "Report incident" to add a new problem.
2. The incident appears at the back of the queue.
3. Click "Process next" to clear the oldest incident first.
4. The resolved incident is pushed to the stack.
5. Click "Undo latest" to reopen the most recent resolved incident.
6. Restart the app and the resolved incidents are restored from MongoDB.

## Testing

This project includes unit tests for the queue and stack logic.

Run:

```powershell
npm test
```

The test suite checks:

- queue behavior is FIFO
- queue order is preserved correctly after repeated dequeue operations
- stack behavior is LIFO

## Notes

This is a classroom-style demonstration project designed to show how abstract data structures can be used in a real, interactive application. The queue handles incoming work, while the stack tracks recent actions, making the project a practical example of DSA in action.
