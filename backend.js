// Backend Node.js/Express pour stocker les données du graphe sectorisé dans MongoDB

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Connexion à MongoDB (modifiez l'URL selon votre config)
mongoose.connect('mongodb://localhost:27017/graphe', { useNewUrlParser: true, useUnifiedTopology: true });

const PersonSchema = new mongoose.Schema({
  nom: String,
  prenom: String,
  naissance: String, // format YYYY-MM-DD
  deces: String,     // format YYYY-MM-DD
  sexe: String,
  img: String,
  adopte: Boolean,
  id: String // identifiant SVG
});

const Person = mongoose.model('Person', PersonSchema);

// Enregistrer ou mettre à jour une personne
app.post('/api/person', async (req, res) => {
  const { id, nom, prenom, naissance, deces, sexe, img, adopte } = req.body;
  try {
    let person = await Person.findOneAndUpdate(
      { id },
      { nom, prenom, naissance, deces, sexe, img, adopte },
      { upsert: true, new: true }
    );
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement.' });
  }
});

// Récupérer toutes les personnes
app.get('/api/person', async (req, res) => {
  const persons = await Person.find();
  res.json(persons);
});

// Lancer le serveur
const PORT = 3001;
app.listen(PORT, () => {
  console.log('Serveur backend démarré sur http://localhost:' + PORT);
});
