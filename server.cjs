const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// ✅ Handle POST / for Lovable email trigger
app.post('/', async (req, res) => {
  console.log('Email request received from Lovable:', req.body);
  return res.status(200).json({ success: true });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// ✅ SPA fallback (FIXED for Node 22)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
