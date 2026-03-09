// Script de test d'inscription pour backend-users-fs.js
// Lancez : node test-register.js
const fetch = require('node-fetch');

(async () => {
  const res = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'testuser', password: 'testpass', role: 'editor' })
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Réponse:', data);
})();
