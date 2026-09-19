// Vercel serverless entry. The same Express app also runs in `npm run dev`
// through the Vite middleware, so dev and prod behave identically.
import app from '../server/app.js';
export default app;
