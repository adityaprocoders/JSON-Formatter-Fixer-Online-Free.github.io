require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Use Routes
app.use('/', require("./routes/index"));

// 🎯 FIX: Changed router.get to app.get
app.get('/privacy-policy', (req, res) => {
    res.render('privacy'); 
});

app.get('/terms', (req, res) => {
    res.render('terms'); 
});

app.get('/contact', (req, res) => {
    res.render('contact'); 
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));