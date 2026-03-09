// Backend Node.js/Express pour gestion des utilisateurs sans MongoDB (stockage fichier JSON)
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

const USERS_FILE = './users.json';
const JWT_SECRET = 'votre_secret_a_remplacer';

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Inscription
app.post('/api/auth/register', async (req, res) => {
  const { login, password, role } = req.body;
  if (!login || !password || !role) return res.status(400).json({ error: 'Champs requis manquants.' });
  let users = readUsers();
  if (users.find(u => u.login === login)) return res.status(400).json({ error: 'Login déjà utilisé.' });
  const hash = await bcrypt.hash(password, 10);
  let userRole = role;
  let pendingAdmin = false;
  if (users.length === 0) userRole = 'admin'; // Premier inscrit = admin
  if (role === 'admin' && users.length > 0) { userRole = 'reader'; pendingAdmin = true; }
  users.push({ login, password: hash, role: userRole, pendingAdmin });
  writeUsers(users);
  res.json({ login, role: userRole, pendingAdmin });
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.login === login);
  if (!user) return res.status(400).json({ error: 'Utilisateur inconnu.' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: 'Mot de passe incorrect.' });
  if (user.pendingAdmin) return res.status(403).json({ error: 'Votre demande admin est en attente.' });
  const token = jwt.sign({ login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, role: user.role });
});

// Approuver une demande admin (admin uniquement)
app.post('/api/auth/approve-admin', (req, res) => {
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
  let users = readUsers();
  const user = users.find(u => u.login === login && u.pendingAdmin);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé ou déjà approuvé.' });
  user.role = 'admin';
  user.pendingAdmin = false;
  writeUsers(users);
  res.json({ login: user.login, role: 'admin' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('Serveur backend utilisateurs (fichier JSON) sur http://localhost:' + PORT);
});
