require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const surveysRouter = require('./routes/surveys');
const teachersRouter = require('./routes/teachers');
const adminRouter = require('./routes/admin');

const app = express();

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

app.use('/api/survey', surveysRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/admin', adminRouter);

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.publicMessage || 'Внутренняя ошибка сервера' });
});

// Локальный запуск (node server.js). На Vercel модуль импортируется как функция.
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Survey app listening on http://localhost:${port}`);
  });
}

module.exports = app;
