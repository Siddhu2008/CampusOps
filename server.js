import 'dotenv/config'
import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareIncidentPriority, IncidentQueue, IncidentStack } from './structures.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const mongoClient = new MongoClient(process.env.MONGODB_URI ?? '')
const databaseName = process.env.MONGODB_DATABASE ?? 'campus_ops'
const completedStack = new IncidentStack()
const directory = path.dirname(fileURLToPath(import.meta.url))
let incidents

app.use(express.json({ limit: '20kb' }))
app.use(express.static(path.join(directory, 'public')))

async function initializeDatabase() {
  await mongoClient.connect()
  incidents = mongoClient.db(databaseName).collection('incidents')
  await incidents.createIndex({ status: 1, createdAt: 1, _id: 1 })

  if (await incidents.countDocuments() === 0) {
    const now = Date.now()
    const sampleIncidents = [
      ['Projector not working in Lab 204', 'The projector does not turn on before the afternoon lecture.', 'Classroom tech', 'HIGH', 18],
      ['Water leak near the library entrance', 'A small leak has been reported by the east entrance.', 'Facilities', 'CRITICAL', 12],
      ['Wi-Fi is slow in Block C', 'Several students report intermittent connectivity.', 'Network', 'MEDIUM', 6],
      ['Replace a broken classroom chair', 'One chair needs attention in Room 108.', 'Facilities', 'LOW', 2]
    ].map(([title, description, category, priority, minutesAgo]) => ({
      title,
      description,
      category,
      priority,
      status: 'OPEN',
      createdAt: new Date(now - minutesAgo * 60_000),
      completedAt: null
    }))
    await incidents.insertMany(sampleIncidents)
  }

  const completed = await incidents.find({ status: 'DONE' })
    .sort({ completedAt: 1, _id: 1 })
    .toArray()
  for (const incident of completed) completedStack.push(toApiIncident(incident))
}

function toApiIncident(incident) {
  const { _id, ...fields } = incident
  return { ...fields, id: _id.toString() }
}

function sendError(response, error) {
  console.error(error)
  response.status(500).json({ error: 'The request could not be completed. Check the server log.' })
}

async function getOpenQueue() {
  const result = await incidents.find({ status: 'OPEN' })
    .sort({ createdAt: 1, _id: 1 })
    .toArray()
  result.sort(compareIncidentPriority)
  const queue = new IncidentQueue()
  result.forEach((incident) => queue.enqueue(incident))
  return queue
}

app.get('/api/dashboard', async (_request, response) => {
  try {
    const result = await incidents.find()
      .sort({ createdAt: -1, _id: -1 })
      .toArray()
    const queue = await getOpenQueue()
    response.json({
      incidents: result.map(toApiIncident),
      queueLength: queue.length,
      queueNext: queue.peek() ? toApiIncident(queue.peek()) : null,
      stackLength: completedStack.length,
      stackTop: completedStack.peek()
    })
  } catch (error) {
    sendError(response, error)
  }
})

app.post('/api/incidents', async (request, response) => {
  const title = typeof request.body?.title === 'string' ? request.body.title.trim() : ''
  const description = typeof request.body?.description === 'string' ? request.body.description.trim() : ''
  const category = typeof request.body?.category === 'string' ? request.body.category.trim() : 'General'
  const priority = typeof request.body?.priority === 'string' ? request.body.priority : 'MEDIUM'
  const allowedPriorities = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])

  if (!title || title.length > 120) {
    return response.status(400).json({ error: 'Enter a title between 1 and 120 characters.' })
  }
  if (description.length > 500 || category.length > 40) {
    return response.status(400).json({ error: 'Description or category is too long.' })
  }
  if (!allowedPriorities.has(priority)) {
    return response.status(400).json({ error: 'Choose a valid priority.' })
  }

  try {
    const incident = {
      title,
      description,
      category: category || 'General',
      priority,
      status: 'OPEN',
      createdAt: new Date(),
      completedAt: null
    }
    const result = await incidents.insertOne(incident)
    response.status(201).json(toApiIncident({ ...incident, _id: result.insertedId }))
  } catch (error) {
    sendError(response, error)
  }
})

app.post('/api/queue/process-next', async (_request, response) => {
  try {
    const queue = await getOpenQueue()
    const nextIncident = queue.dequeue()
    if (!nextIncident) return response.status(409).json({ error: 'The incident queue is empty.' })

    const updated = await incidents.findOneAndUpdate(
      { _id: nextIncident._id, status: 'OPEN' },
      { $set: { status: 'DONE', completedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!updated) {
      return response.status(409).json({ error: 'The queue changed. Refresh and try again.' })
    }

    const incident = toApiIncident(updated)
    completedStack.push(incident)
    response.json({ incident, stackLength: completedStack.length })
  } catch (error) {
    sendError(response, error)
  }
})

app.post('/api/stack/undo', async (_request, response) => {
  try {
    const latestIncident = completedStack.peek()
    if (!latestIncident) return response.status(409).json({ error: 'There is nothing to undo.' })

    const updated = await incidents.findOneAndUpdate(
      { _id: new ObjectId(latestIncident.id), status: 'DONE' },
      { $set: { status: 'OPEN', completedAt: null } },
      { returnDocument: 'after' }
    )
    if (!updated) {
      return response.status(409).json({ error: 'The stack changed. Refresh and try again.' })
    }

    completedStack.pop()
    response.json({ incident: toApiIncident(updated), stackLength: completedStack.length })
  } catch (error) {
    sendError(response, error)
  }
})

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }))

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and set your MongoDB connection string.')
  }
  await initializeDatabase()
  app.listen(port, () => console.log(`CampusOps is running at http://localhost:${port}`))
}

start().catch((error) => {
  console.error('Could not start CampusOps. Confirm your MongoDB Atlas cluster is available and MONGODB_URI is correct.')
  console.error(error)
  process.exitCode = 1
})
