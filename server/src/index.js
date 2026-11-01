import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🎊 Utsav Server running on port ${PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('Server terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
