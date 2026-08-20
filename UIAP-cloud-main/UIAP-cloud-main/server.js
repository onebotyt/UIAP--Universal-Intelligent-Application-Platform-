require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./src/routes/auth');
const modulesRoutes = require('./src/routes/modules');
const organizationsRoutes = require('./src/routes/organizations');
const transactionsRoutes = require('./src/routes/transactions');
const edgeRoutes = require('./src/routes/edge');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use(express.static('public'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/dashboard/auth', authRoutes);
app.use('/dashboard/modules', modulesRoutes);
app.use('/dashboard/organizations', organizationsRoutes);
app.use('/dashboard/transactions', transactionsRoutes);
app.use('/edge/v1', edgeRoutes);

const path = require('path');

app.get('*', (req, res, next) => {
  const apiPrefixes = [
    '/api/',
    '/dashboard/auth',
    '/dashboard/modules',
    '/dashboard/organizations',
    '/dashboard/transactions',
    '/edge/v1'
  ];
  
  if (apiPrefixes.some(prefix => req.path.startsWith(prefix))) {
    return next();
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Basic error handler so unhandled route errors don't crash the process silently
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[uiap-cloud] Dashboard API listening on http://localhost:${PORT}`);
});
