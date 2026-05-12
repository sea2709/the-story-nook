require('dotenv').config();
const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');

const app = express();
const PORT = process.env.PORT || 3000;

app.engine('hbs', engine({
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  defaultLayout: 'admin',
  helpers: {
    eq:       (a, b) => a === b,
    ne:       (a, b) => a !== b,
    gt:       (a, b) => a > b,
    lt:       (a, b) => a < b,
    add:      (a, b) => Number(a) + Number(b),
    inc:      n => Number(n) + 1,
    dec:      n => Number(n) - 1,
    multiply: (a, b) => Number(a) * Number(b),
    pageNum:  (i, side) => i * 2 + (side === 'l' ? 1 : 2),
    json:     v => JSON.stringify(v),
    or:       (a, b) => a || b,

    stepClass(status) {
      return { wait: 'wait', run: 'run', done: 'done', error: 'error' }[status] || 'wait';
    },
    stepIcon(status) {
      return { wait: '○', run: '◉', done: '✓', error: '✕' }[status] || '○';
    },
    stepLabel(i) {
      return ['Extract text via Claude Vision', 'Analyze scenes & story arc', 'Generate illustrations', 'Assemble draft book'][i] || '';
    },
    spreadLabel(i) {
      return `${i * 2 + 1}–${i * 2 + 2}`;
    },
    statusClass: s => `s-${s}`,
  },
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
}

app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\nThe Story Nook backend  →  http://localhost:${PORT}`);
  console.log(`Admin portal            →  http://localhost:${PORT}/admin\n`);
});
