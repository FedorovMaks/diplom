const express = require('express');
const { listGroups } = require('../db/groups');

const router = express.Router();

// Публичный список групп для форм опросов
router.get('/', async (_req, res, next) => {
  try {
    res.json(await listGroups());
  } catch (e) { next(e); }
});

module.exports = router;
