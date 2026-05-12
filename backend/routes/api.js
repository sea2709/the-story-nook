const express = require('express');
const router = express.Router();
const store = require('../services/bookStore');

router.get('/books', (req, res) => {
  res.json(store.getPublished());
});

router.get('/books/:id', (req, res) => {
  const book = store.getById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json(book);
});

module.exports = router;
