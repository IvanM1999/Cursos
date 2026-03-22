const API = 'http://localhost:3000/api';
let token = '';

async function login() {
   const res = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         email: email.value,
         password: pass.value
      })
   });
   
   const data = await res.json();
   token = data.token;
   
   loadCursos();
}

async function loadCursos() {
   const cursos = await fetch(API + '/cursos').then(r => r.json());
   
   app.innerHTML = cursos.map(c => `
    <div class="card">${c.titulo}</div>
  `).join('');
}

async function addCurso() {
   await fetch(API + '/admin/add-curso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: titulo.value })
   });
   
   location.reload();
} <tag>
   Tab to edit
</tag>