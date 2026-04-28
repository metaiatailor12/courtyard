const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');
const { env, connectDatabase } = require('./config');
const router = require('./routes');
const { notFound, errorHandler } = require('./middleware');
const { expireSubscriptions } = require('./services');
const { ensureSeedAdminUser } = require('./firebase');
const { seedDefaultSettings } = require('./firestoreServices');
const { initializeEmailService } = require('./emailService');

const app = express();

const allowedOrigins = String(env.clientOrigin || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tcy-backend',
    message: 'Use /api for API routes',
    api: '/api',
    health: '/api/health',
  });
});

app.use('/api', router);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDatabase();
  await ensureSeedAdminUser();
  await seedDefaultSettings();
  initializeEmailService();

  cron.schedule('5 0 * * *', async () => {
    try {
      await expireSubscriptions();
    } catch (error) {
      console.error('Failed to expire subscriptions', error);
    }
  });

  app.listen(env.port, () => {
    console.log(`Backend API (firestore) running on http://localhost:${env.port}/api`);
  });
}

if (require.main === module) {
  start().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;
