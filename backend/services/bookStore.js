const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '../data/books.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')).books || [];
  } catch {
    return [];
  }
}

function write(books) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ books }, null, 2));
}

module.exports = {
  getAll: () => read(),
  getPublished: () => read().filter(b => b.status === 'ready'),

  getById(id) {
    return read().find(b => b.id === id) || null;
  },

  create(data) {
    const books = read();
    const book = { id: uuidv4(), createdAt: new Date().toISOString(), ...data };
    books.push(book);
    write(books);
    return book;
  },

  update(id, changes) {
    const books = read();
    const idx = books.findIndex(b => b.id === id);
    if (idx === -1) return null;
    books[idx] = { ...books[idx], ...changes };
    write(books);
    return books[idx];
  },

  remove(id) {
    write(read().filter(b => b.id !== id));
  },

  updateSpread(bookId, spreadIdx, changes) {
    const books = read();
    const book = books.find(b => b.id === bookId);
    if (!book || !book.pages[spreadIdx]) return null;
    book.pages[spreadIdx] = { ...book.pages[spreadIdx], ...changes };
    write(books);
    return book;
  },

  addFeedback(bookId, spreadIdx, feedback) {
    const books = read();
    const book = books.find(b => b.id === bookId);
    if (!book || !book.pages[spreadIdx]) return null;
    if (!book.pages[spreadIdx].fb) book.pages[spreadIdx].fb = [];
    book.pages[spreadIdx].fb.push(feedback);
    write(books);
    return book;
  },
};
