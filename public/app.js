const elements = {
  breadcrumb: document.querySelector('#breadcrumb-current'),
  pageTitle: document.querySelector('#page-title'),
  tableTitle: document.querySelector('#table-title'),
  rows: document.querySelector('#incident-rows'),
  resultCount: document.querySelector('#result-count'),
  open: document.querySelector('#metric-open'),
  critical: document.querySelector('#metric-critical'),
  queue: document.querySelector('#metric-queue'),
  stack: document.querySelector('#metric-stack'),
  navQueue: document.querySelector('#nav-queue-count'),
  navStack: document.querySelector('#nav-stack-count'),
  nextIncident: document.querySelector('#next-incident'),
  stackTop: document.querySelector('#stack-top'),
  queueVisual: document.querySelector('#queue-visual'),
  stackVisual: document.querySelector('#stack-visual'),
  process: document.querySelector('#process-button'),
  undo: document.querySelector('#undo-button'),
  toast: document.querySelector('#toast'),
  dialog: document.querySelector('#incident-dialog'),
  form: document.querySelector('#incident-form'),
  formError: document.querySelector('#form-error'),
  submit: document.querySelector('#submit-button'),
  search: document.querySelector('#search-input'),
  filter: document.querySelector('#filter-select')
}

let dashboard = null
let activeView = 'overview'
let toastTimer

document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('en', {
  weekday: 'short', month: 'short', day: '2-digit'
}).format(new Date())

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character])
}

function relativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function compareIncidentPriority(first, second) {
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  const priorityDifference = (priorityOrder[first.priority] ?? 4) - (priorityOrder[second.priority] ?? 4)
  return priorityDifference || new Date(first.createdAt) - new Date(second.createdAt) || first.id.localeCompare(second.id)
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer)
  elements.toast.textContent = message
  elements.toast.classList.toggle('error', isError)
  elements.toast.classList.add('show')
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 2800)
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

function setActiveView(view) {
  activeView = view
  const labels = { overview: 'Overview', queue: 'Incident queue', stack: 'Resolved stack' }
  const titles = { overview: 'Incident overview', queue: 'Incident queue', stack: 'Resolved stack' }
  elements.breadcrumb.textContent = labels[view]
  elements.pageTitle.innerHTML = `${titles[view]}<span class="heading-period">.</span>`
  elements.tableTitle.textContent = view === 'queue' ? 'Waiting by priority' : view === 'stack' ? 'Resolved incidents' : 'Recent incidents'
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view)
  })
  renderTable()
}

function renderTable() {
  if (!dashboard) return
  const search = elements.search.value.trim().toLowerCase()
  const statusFilter = elements.filter.value
  let incidents = dashboard.incidents
  if (activeView === 'queue') incidents = incidents.filter((incident) => incident.status === 'OPEN')
  if (activeView === 'stack') incidents = incidents.filter((incident) => incident.status === 'DONE')
  if (activeView === 'overview' && statusFilter !== 'ALL') incidents = incidents.filter((incident) => incident.status === statusFilter)
  if (activeView === 'queue') incidents = [...incidents].sort(compareIncidentPriority)
  incidents = incidents.filter((incident) => `${incident.title} ${incident.category} ${incident.description}`.toLowerCase().includes(search))

  if (incidents.length === 0) {
    elements.rows.innerHTML = '<tr><td colspan="5" class="empty-row">No incidents to show. Try another filter or report a new issue.</td></tr>'
  } else {
    elements.rows.innerHTML = incidents.map((incident) => {
      const priority = incident.priority.toLowerCase()
      const status = incident.status === 'DONE' ? 'done' : ''
      return `<tr>
        <td><div class="incident-title"><strong>${escapeHtml(incident.title)}</strong><small>#${incident.id} · ${escapeHtml(incident.description || 'No description provided')}</small></div></td>
        <td>${escapeHtml(incident.category)}</td>
        <td><span class="priority-label ${priority}"><i></i>${priority[0].toUpperCase()}${priority.slice(1)}</span></td>
        <td><span class="status-badge ${status}">${incident.status === 'DONE' ? 'Resolved' : 'Open'}</span></td>
        <td class="time-label">${relativeTime(incident.createdAt)}</td>
      </tr>`
    }).join('')
  }
  elements.resultCount.textContent = `${incidents.length} ${incidents.length === 1 ? 'incident' : 'incidents'} shown`
}

function renderDashboard() {
  const incidents = dashboard.incidents
  const openIncidents = incidents.filter((incident) => incident.status === 'OPEN')
  const critical = openIncidents.filter((incident) => incident.priority === 'CRITICAL').length
  elements.open.textContent = openIncidents.length
  elements.critical.textContent = critical
  elements.queue.textContent = dashboard.queueLength
  elements.stack.textContent = dashboard.stackLength
  elements.navQueue.textContent = dashboard.queueLength
  elements.navStack.textContent = dashboard.stackLength
  elements.nextIncident.textContent = dashboard.queueNext?.title ?? 'Queue is clear — nice work!'
  elements.stackTop.textContent = dashboard.stackTop?.title ?? 'Nothing to undo yet'
  elements.queueVisual.textContent = `${dashboard.queueLength} ${dashboard.queueLength === 1 ? 'incident' : 'incidents'} waiting`
  elements.stackVisual.textContent = `${dashboard.stackLength} resolved ${dashboard.stackLength === 1 ? 'item' : 'items'}`
  elements.process.disabled = dashboard.queueLength === 0
  elements.undo.disabled = dashboard.stackLength === 0
  elements.process.setAttribute('aria-disabled', String(dashboard.queueLength === 0))
  renderTable()
}

async function refreshDashboard() {
  try {
    dashboard = await request('/api/dashboard')
    renderDashboard()
  } catch (error) {
    elements.rows.innerHTML = `<tr><td colspan="5" class="empty-row">${escapeHtml(error.message)} Check your MongoDB connection and .env configuration.</td></tr>`
    elements.nextIncident.textContent = 'Could not connect to MongoDB'
    elements.resultCount.textContent = 'Database connection required'
    showToast(error.message, true)
  }
}

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => setActiveView(button.dataset.view))
})
elements.search.addEventListener('input', renderTable)
elements.filter.addEventListener('change', renderTable)
document.querySelector('#report-button').addEventListener('click', () => {
  elements.formError.textContent = ''
  elements.dialog.showModal()
  document.querySelector('#title-field').focus()
})
document.querySelector('#close-dialog').addEventListener('click', () => elements.dialog.close())
document.querySelector('#cancel-dialog').addEventListener('click', () => elements.dialog.close())
elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close()
})

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault()
  elements.submit.disabled = true
  elements.submit.textContent = 'Adding…'
  elements.formError.textContent = ''
  const formData = new FormData(elements.form)
  try {
    await request('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    })
    elements.form.reset()
    elements.dialog.close()
    setActiveView('queue')
    await refreshDashboard()
    showToast('Incident added to the end of the queue.')
  } catch (error) {
    elements.formError.textContent = error.message
  } finally {
    elements.submit.disabled = false
    elements.submit.textContent = 'Add to queue'
  }
})

elements.process.addEventListener('click', async () => {
  elements.process.disabled = true
  try {
    const result = await request('/api/queue/process-next', { method: 'POST', body: '{}' })
    await refreshDashboard()
    showToast(`Resolved: ${result.incident.title}`)
  } catch (error) {
    showToast(error.message, true)
    await refreshDashboard()
  }
})

elements.undo.addEventListener('click', async () => {
  elements.undo.disabled = true
  try {
    const result = await request('/api/stack/undo', { method: 'POST', body: '{}' })
    await refreshDashboard()
    showToast(`Back in queue: ${result.incident.title}`)
  } catch (error) {
    showToast(error.message, true)
    await refreshDashboard()
  }
})

refreshDashboard()
