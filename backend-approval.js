// Backend Node.js/Express avec gestion admin automatique et approbation admin
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
  role: { type: String, enum: ['reader', 'editor', 'admin'], default: 'reader' },
  pendingAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const JWT_SECRET = 'votre_secret_a_remplacer';

// Inscription
app.post('/api/auth/register', async (req, res) => {
  const { login, password, role } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Champs requis manquants.' });
  const hash = await bcrypt.hash(password, 10);
  const userCount = await User.countDocuments();
  let userRole = 'reader';
  let pendingAdmin = false;
  if (userCount === 0) {
    userRole = 'admin'; // Premier inscrit = admin
  } else if (role === 'admin') {
    userRole = 'reader';
    pendingAdmin = true; // Demande d'admin en attente
  } else if (role === 'editor') {
    userRole = 'editor';
  }
  try {
    const user = await User.create({ login, password: hash, role: userRole, pendingAdmin });
    res.json({ login: user.login, role: user.role, pendingAdmin });
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
  if (user.pendingAdmin) return res.status(403).json({ error: 'Votre demande admin est en attente.' });
  const token = jwt.sign({ login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, role: user.role });
});

// Approuver une demande admin (admin uniquement)
app.post('/api/auth/approve-admin', async (req, res) => {
  const { login } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token manquant.' });
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide.' });
  }
  if (decoded.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut approuver.' });
  const user = await User.findOneAndUpdate({ login, pendingAdmin: true }, { role: 'admin', pendingAdmin: false });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé ou déjà approuvé.' });
  res.json({ login: user.login, role: 'admin' });
});

// Pour la sauvegarde du graphe (exemple)
const GraphSchema = new mongoose.Schema({
  data: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});
const Graph = mongoose.model('Graph', GraphSchema);

app.post('/api/graph/save', async (req, res) => {
  const { data } = req.body;
  await Graph.findOneAndUpdate({}, { data, updatedAt: new Date() }, { upsert: true });
  res.json({ ok: true });
});

app.get('/api/graph/load', async (req, res) => {
  const graph = await Graph.findOne();
  res.json(graph ? graph.data : null);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('Serveur backend avec gestion admin/approbation/sauvegarde sur http://localhost:' + PORT);
});
