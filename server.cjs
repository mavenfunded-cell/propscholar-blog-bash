const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: allow JSON body
app.use(express.json());

// ✅ ADD THIS BLOCK (VERY IMPORTANT)
app.post('/', async (req, res) => {
  console.log('Email request received from Lovable:', req.body);

  // For now, just acknowledge success
  // (email sending can be added later)

  return res.status(200).json({ success: true });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - send all GET requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
