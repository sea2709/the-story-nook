const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const store = require('../services/bookStore');
const google = require('../services/google');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../public/uploads'),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  },
  limits: { files: 30 },
});

// In-memory job store (good enough for a learning project)
const jobs = new Map();

const EMOJIS = {
  watercolor: ['🌸', '🌊', '🦋', '🌿', '🌈', '🌙', '⭐', '🐝', '🌻', '🦚', '🍃', '🌺'],
  cartoon:    ['🐻', '🦊', '🐸', '🐧', '🦁', '🐼', '🐰', '🦄', '🦖', '🐯', '🦉', '🐬'],
  sketch:     ['🏡', '🌲', '⛵', '🎪', '🌾', '🗺️', '🏔️', '🌉', '🏞️', '🛤️', '🪵', '🌿'],
  digital:    ['✨', '🚀', '💫', '🌟', '🎆', '🌌', '🔮', '💎', '🌈', '⚡', '🎇', '🌠'],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main page ──────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const books = store.getAll();
  const activeBook = req.query.book ? store.getById(req.query.book) : null;
  const spreadIdx = parseInt(req.query.spread) || 0;
  res.render('admin', { books, activeBook, spreadIdx });
});

// ── Book list partial ──────────────────────────────────────────────────────

router.get('/books', (req, res) => {
  res.render('partials/book-list', { layout: false, books: store.getAll() });
});

// ── Create book (multipart) ────────────────────────────────────────────────

router.post('/books', upload.array('photos', 30), (req, res) => {
  const title = (req.body.title || '').trim();
  const { age, style } = req.body;
  const description = (req.body.description || '').trim();
  const size = req.body.size === 'landscape' ? 'landscape' : 'portrait';

  if (!title) {
    res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Please enter a book title.' }));
    return res.status(400).send('');
  }
  if (!req.files || !req.files.length) {
    res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Please upload at least one photo.' }));
    return res.status(400).send('');
  }

  const jobId = uuidv4();
  const job = {
    status: 'running',
    steps: ['wait', 'wait', 'wait', 'wait'],
    bookId: null,
    error: null,
    title,
    age: age || '4-6',
    style: style || 'watercolor',
    size,
    description,
    filePaths: req.files.map(f => f.path),
    fileUrls: req.files.map(f => `/uploads/${f.filename}`),
  };
  jobs.set(jobId, job);

  runJob(jobId).catch(err => {
    const j = jobs.get(jobId);
    if (j) { j.status = 'error'; j.error = err.message; }
    console.error('Job failed:', err);
  });

  res.render('partials/steps-progress', { layout: false, jobId, job, polling: true });
});

async function runJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  const em = EMOJIS[job.style] || EMOJIS.watercolor;

  job.steps[0] = 'run';
  let aiPages = null;
  try {
    aiPages = await google.generateBookText(job.title, job.style, job.filePaths, job.size);
  } catch (e) {
    console.warn('Claude generation failed, using fallback:', e.message);
  }
  job.steps[0] = 'done';

  job.steps[1] = 'run';
  await sleep(400);
  job.steps[1] = 'done';

  const spreadCount = Math.max(2, Math.ceil(job.filePaths.length / 2));
  const pages = aiPages && aiPages.length
    ? aiPages.map((p, i) => ({
        lt: p.leftText || '',
        rt: p.rightText || '',
        le: em[(i * 2) % em.length],
        re: em[(i * 2 + 1) % em.length],
        leftImage: job.fileUrls[i * 2] || null,
        rightImage: job.fileUrls[i * 2 + 1] || null,
        fb: [],
      }))
    : Array.from({ length: spreadCount }, (_, i) => ({
        lt: `Page ${i * 2 + 1} of "${job.title}"`,
        rt: `Page ${i * 2 + 2} of "${job.title}"`,
        le: em[(i * 2) % em.length],
        re: em[(i * 2 + 1) % em.length],
        leftImage: job.fileUrls[i * 2] || null,
        rightImage: job.fileUrls[i * 2 + 1] || null,
        fb: [],
      }));

  job.steps[2] = 'run';
  await Promise.all(
    pages.map(async (page) => {
      const [leftUrl, rightUrl] = await Promise.all([
        page.lt ? google.generateImage(job.title, page.lt, job.description, job.style, job.size).catch(() => null) : Promise.resolve(null),
        page.rt ? google.generateImage(job.title, page.rt, job.description, job.style, job.size).catch(() => null) : Promise.resolve(null),
      ]);
      if (leftUrl) page.leftImage = leftUrl;
      if (rightUrl) page.rightImage = rightUrl;
    })
  );
  job.steps[2] = 'done';

  job.steps[3] = 'run';
  const book = store.create({ title: job.title, age: job.age, style: job.style, size: job.size, status: 'draft', emoji: em[0], pages });
  job.steps[3] = 'done';
  job.status = 'done';
  job.bookId = book.id;
}

// ── Job status (HTMX polling) ──────────────────────────────────────────────

router.get('/jobs/:id/status', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).send('');

  if (job.status === 'done') {
    res.setHeader('HX-Trigger', JSON.stringify({ bookReady: job.bookId, bookListUpdated: true }));
  }

  res.render('partials/steps-progress', {
    layout: false,
    jobId: req.params.id,
    job,
    polling: job.status === 'running',
    done: job.status === 'done',
    error: job.status === 'error',
  });
});

// ── Preview panel ──────────────────────────────────────────────────────────

router.get('/books/:id/preview', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('Book not found');
  const spreadIdx = Math.min(Math.max(parseInt(req.query.spread) || 0, 0), book.pages.length - 1);
  res.render('partials/preview-panel', { layout: false, book, spreadIdx });
});

// ── Spread navigation ──────────────────────────────────────────────────────

router.get('/books/:id/spread/:i', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');
  const spreadIdx = parseInt(req.params.i);
  if (!book.pages[spreadIdx]) return res.status(404).send('');
  res.render('partials/spread-editor', { layout: false, book, spread: book.pages[spreadIdx], spreadIdx });
});

// ── Text editing ───────────────────────────────────────────────────────────

router.put('/books/:id/spread/:i/text', (req, res) => {
  const { side, text } = req.body;
  const spreadIdx = parseInt(req.params.i);
  const changes = side === 'l' ? { lt: text || '' } : { rt: text || '' };
  const book = store.updateSpread(req.params.id, spreadIdx, changes);
  if (!book) return res.status(404).send('');
  const updated = store.getById(req.params.id);
  res.render('partials/spread-editor', { layout: false, book: updated, spread: updated.pages[spreadIdx], spreadIdx });
});

// ── Feedback ───────────────────────────────────────────────────────────────

router.post('/books/:id/spread/:i/feedback', async (req, res) => {
  const spreadIdx = parseInt(req.params.i);
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).send('');

  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  store.addFeedback(req.params.id, spreadIdx, { text, ai: false, time });

  let aiText;
  try {
    const spread = store.getById(req.params.id).pages[spreadIdx];
    aiText = await google.generateFeedback(book.title, spread, text, book.style);
  } catch {
    aiText = '(Could not reach AI — check your API key)';
  }

  const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  store.addFeedback(req.params.id, spreadIdx, { text: aiText, ai: true, time: aiTime });

  const updated = store.getById(req.params.id);
  res.render('partials/fb-thread', { layout: false, feedback: updated.pages[spreadIdx].fb || [] });
});

// ── Regenerate illustration ────────────────────────────────────────────────

router.get('/books/:id/spread/:i/regen-form', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');
  const side = req.query.side || 'l';
  res.render('partials/modal-regen', { layout: false, book, spreadIdx: parseInt(req.params.i), side });
});

router.post('/books/:id/spread/:i/regen', async (req, res) => {
  const { prompt, side } = req.body;
  const spreadIdx = parseInt(req.params.i);
  const book = store.getById(req.params.id);
  if (!book || !prompt) return res.status(400).send('');

  const spread = book.pages[spreadIdx];
  const pageText = side === 'l' ? spread.lt : spread.rt;

  try {
    const imageUrl = await google.generateImage(book.title, pageText, prompt, book.style, book.size);
    store.updateSpread(req.params.id, spreadIdx, side === 'l' ? { leftImage: imageUrl } : { rightImage: imageUrl });

    res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Illustration updated!' }));
    const updated = store.getById(req.params.id);
    res.render('partials/spread-editor', { layout: false, book: updated, spread: updated.pages[spreadIdx], spreadIdx });
  } catch (e) {
    res.status(500).send(`<p style="color:red;padding:1rem">${e.message}</p>`);
  }
});

// ── Spread operations: split ───────────────────────────────────────────────

router.get('/books/:id/spread/:i/split-form', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');
  const spreadIdx = parseInt(req.params.i);
  const spread = book.pages[spreadIdx];
  res.render('partials/modal-split', { layout: false, book, spreadIdx, spread });
});

router.post('/books/:id/spread/:i/split', (req, res) => {
  const { lt, rt } = req.body;
  const spreadIdx = parseInt(req.params.i);
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');

  const s = book.pages[spreadIdx];
  book.pages.splice(spreadIdx, 1,
    { lt: lt || '', rt: '', le: s.le, re: '📄', fb: [] },
    { lt: rt || '', rt: '', le: s.re, re: '📄', fb: [] }
  );
  store.update(req.params.id, { pages: book.pages });

  res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Spread split into two.' }));
  const updated = store.getById(req.params.id);
  res.render('partials/preview-panel', { layout: false, book: updated, spreadIdx });
});

// ── Spread operations: merge ───────────────────────────────────────────────

router.get('/books/:id/spread/:i/merge-form', (req, res) => {
  const book = store.getById(req.params.id);
  const spreadIdx = parseInt(req.params.i);
  if (!book || spreadIdx === 0) {
    res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'No previous spread to merge with.' }));
    return res.status(400).send('');
  }
  const prev = book.pages[spreadIdx - 1];
  const curr = book.pages[spreadIdx];
  res.render('partials/modal-merge', { layout: false, book, spreadIdx, prev, curr });
});

router.post('/books/:id/spread/:i/merge', (req, res) => {
  const { lt, rt } = req.body;
  const spreadIdx = parseInt(req.params.i);
  const book = store.getById(req.params.id);
  if (!book || spreadIdx === 0) return res.status(400).send('');

  const prev = book.pages[spreadIdx - 1];
  const curr = book.pages[spreadIdx];
  book.pages.splice(spreadIdx - 1, 2, {
    lt: lt || '', rt: rt || '',
    le: prev.le, re: curr.re,
    fb: [...(prev.fb || []), ...(curr.fb || [])],
  });
  store.update(req.params.id, { pages: book.pages });

  res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Spreads merged.' }));
  const updated = store.getById(req.params.id);
  const newIdx = Math.max(0, spreadIdx - 1);
  res.render('partials/preview-panel', { layout: false, book: updated, spreadIdx: newIdx });
});

// ── Spread operations: delete ──────────────────────────────────────────────

router.delete('/books/:id/spread/:i', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');
  const spreadIdx = parseInt(req.params.i);
  if (book.pages.length <= 1) {
    res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Cannot delete the only spread.' }));
    return res.status(400).send('');
  }
  book.pages.splice(spreadIdx, 1);
  store.update(req.params.id, { pages: book.pages });

  res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Spread deleted.' }));
  const newIdx = Math.min(spreadIdx, book.pages.length - 1);
  const updated = store.getById(req.params.id);
  res.render('partials/preview-panel', { layout: false, book: updated, spreadIdx: newIdx });
});

// ── Spread operations: move ────────────────────────────────────────────────

router.post('/books/:id/spread/:i/move', (req, res) => {
  const { direction } = req.body;
  const spreadIdx = parseInt(req.params.i);
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');

  const d = direction === 'left' ? -1 : 1;
  const n = spreadIdx + d;
  if (n < 0 || n >= book.pages.length) return res.status(400).send('');

  [book.pages[spreadIdx], book.pages[n]] = [book.pages[n], book.pages[spreadIdx]];
  store.update(req.params.id, { pages: book.pages });

  res.setHeader('HX-Trigger', JSON.stringify({ showToast: d < 0 ? 'Moved left.' : 'Moved right.' }));
  const updated = store.getById(req.params.id);
  res.render('partials/preview-panel', { layout: false, book: updated, spreadIdx: n });
});

// ── Publish ────────────────────────────────────────────────────────────────

router.post('/books/:id/publish', (req, res) => {
  const book = store.update(req.params.id, { status: 'ready' });
  if (!book) return res.status(404).send('');

  res.setHeader('HX-Trigger', JSON.stringify({ bookListUpdated: true, showToast: `"${book.title}" published!` }));
  const updated = store.getById(req.params.id);
  res.render('partials/preview-panel', { layout: false, book: updated, spreadIdx: 0 });
});

// ── Delete book ────────────────────────────────────────────────────────────

router.delete('/books/:id', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).send('');
  store.remove(req.params.id);
  res.setHeader('HX-Trigger', JSON.stringify({ showToast: 'Book removed.', bookListUpdated: true }));
  res.send('');
});

module.exports = router;
