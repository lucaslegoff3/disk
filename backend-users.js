// Backend Node.js/Express pour gestion des utilisateurs avec rôles (lecteur/éditeur)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/graphe', { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new mongoose.Schema({
  login: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['reader', 'editor'], default: 'reader' }
});
const User = mongoose.model('User', UserSchema);

const JWT_SECRET = 'votre_secret_a_remplacer';

// Inscription
app.post('/api/auth/register', async (req, res) => {
  const { login, password, role } = req.body;
  if (!login || !password || !role) return res.status(400).json({ error: 'Champs requis manquants.' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ login, password: hash, role });
    res.json({ login: user.login, role: user.role });
  } catch (err) {
    res.status(400).json({ error: 'Login déjà utilisé.' });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  const user = await User.findOne({ login });
  if (!user) return res.status(400).json({ error: 'Utilisateur inconnu.' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Mot de passe incorrect.' });
  const token = jwt.sign({ login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, role: user.role });
});

// Middleware d'authentification
function auth(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token manquant.' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (role && decoded.role !== role) return res.status(403).json({ error: 'Accès refusé.' });
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Token invalide.' });
    }
  };
}

// Exemple d'accès protégé (éditeur uniquement)
app.post('/api/person', auth('editor'), async (req, res) => {
  // ... même code que précédemment pour enregistrer une personne ...
});

// Exemple d'accès en lecture (tous connectés)
app.get('/api/person', auth(), async (req, res) => {
  // ... même code que précédemment pour récupérer les personnes ...
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('Serveur backend avec gestion utilisateurs sur http://localhost:' + PORT);
});
