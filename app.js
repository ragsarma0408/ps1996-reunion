/* ============================================================
  PS Senior Secondary School – Class of 1996 Reunion App
  Connected to Google Sheets + Google Drive for photos.
  ============================================================ */
const PASSWORD = 'Batch1996';
const CUTOFF = new Date('2026-09-30T23:59:59+05:30'); // IST
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyTtfj4jDY68IQpNSrVE0jv0RSyilPU0mO5X_XY_3FmOqfqV0BA9P8TLi74XBkkVatMjg/exec";

// ---------- Storage helpers (now talk to Google) ----------
async function loadFromGoogle() {
 try {
   const res = await fetch(GOOGLE_SCRIPT_URL);
   if (!res.ok) throw new Error("Network error");
   return await res.json();
 } catch (err) {
   console.warn("Could not load from Google, using local cache", err);
   return null;
 }
}
function load(key, fallback = []) {
 try {
   const raw = localStorage.getItem('ps1996_' + key);
   return raw ? JSON.parse(raw) : fallback;
 } catch {
   return fallback;
 }
}
function save(key, data) {
 localStorage.setItem('ps1996_' + key, JSON.stringify(data));
}
async function sendToSheet(payload) {
 try {
   const res = await fetch(GOOGLE_SCRIPT_URL, {
     method: "POST",
     body: JSON.stringify(payload),
     headers: { "Content-Type": "text/plain;charset=utf-8" } // important for Apps Script
   });
   const result = await res.json();
   return result;
 } catch (err) {
   console.error("Send failed", err);
   return { status: "error", message: err.toString() };
 }
}
// ---------- Password Gate ----------
const gate = document.getElementById('password-gate');
const app = document.getElementById('app');
const pwForm = document.getElementById('password-form');
const pwInput = document.getElementById('password-input');
const pwError = document.getElementById('password-error');
if (sessionStorage.getItem('ps1996_auth') === '1') {
 gate.classList.add('hidden');
 app.classList.remove('hidden');
} else {
 gate.classList.remove('hidden');
 app.classList.add('hidden');
}
pwForm.addEventListener('submit', (e) => {
 e.preventDefault();
 if (pwInput.value.trim() === PASSWORD) {
   sessionStorage.setItem('ps1996_auth', '1');
   gate.classList.add('hidden');
   app.classList.remove('hidden');
   initApp();
 } else {
   pwError.classList.remove('hidden');
   pwInput.value = '';
   pwInput.focus();
 }
});
// ---------- Navigation ----------
function showSection(id) {
 document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
 document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
 const section = document.getElementById('section-' + id);
 if (section) section.classList.add('active');
 const link = document.querySelector(`.nav-link[data-section="${id}"]`);
 if (link) link.classList.add('active');
 document.getElementById('main-nav').classList.remove('open');
 window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('.nav-link').forEach(link => {
 link.addEventListener('click', (e) => {
   e.preventDefault();
   showSection(link.dataset.section);
 });
});
document.getElementById('nav-toggle').addEventListener('click', () => {
 document.getElementById('main-nav').classList.toggle('open');
});
// ---------- Image resize to base64 ----------
function fileToBase64(file, maxSize = 800, quality = 0.72) {
 return new Promise((resolve, reject) => {
   const reader = new FileReader();
   reader.onload = () => {
     const img = new Image();
     img.onload = () => {
       let { width, height } = img;
       if (width > maxSize || height > maxSize) {
         if (width > height) {
           height = Math.round(height * maxSize / width);
           width = maxSize;
         } else {
           width = Math.round(width * maxSize / height);
           height = maxSize;
         }
       }
       const canvas = document.createElement('canvas');
       canvas.width = width;
       canvas.height = height;
       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0, width, height);
       resolve(canvas.toDataURL('image/jpeg', quality));
     };
     img.onerror = reject;
     img.src = reader.result;
   };
   reader.onerror = reject;
   reader.readAsDataURL(file);
 });
}
// ---------- Voting open? ----------
function isVotingOpen() {
 return new Date() <= CUTOFF;
}
// ---------- Stats ----------
function updateStats() {
 const regs = load('registrations');
 const memories = load('memories');
 document.getElementById('stat-registered').textContent = regs.length;
 document.getElementById('stat-inperson').textContent = regs.filter(r => r.participation === 'in-person').length;
 document.getElementById('stat-virtual').textContent = regs.filter(r => r.participation === 'virtual').length;
 document.getElementById('stat-memories').textContent = memories.length;
}
// ---------- Register ----------
function renderParticipants() {
 const list = document.getElementById('participants-list');
 const regs = load('registrations');
 if (!regs.length) {
   list.innerHTML = '<p class="muted">No one has registered yet. Be the first!</p>';
   return;
 }
 const sorted = [...regs].reverse();
 list.innerHTML = sorted.map(r => `
<div class="participant-item">
<span>${escapeHtml(r.name)}</span>
<span class="badge ${r.participation}">${r.participation === 'in-person' ? 'In Person' : 'Virtual'}</span>
</div>
 `).join('');
}
document.getElementById('register-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const name = document.getElementById('reg-name').value.trim();
 const email = document.getElementById('reg-email').value.trim();
 const phone = document.getElementById('reg-phone').value.trim();
 const participation = document.querySelector('input[name="participation"]:checked').value;
 const notes = document.getElementById('reg-notes').value.trim();
 // local duplicate check
 const regs = load('registrations');
 if (regs.some(r => r.email.toLowerCase() === email.toLowerCase())) {
   alert('This email is already registered.');
   return;
 }
 const newReg = {
   id: Date.now(),
   name, email, phone, participation, notes,
   ts: new Date().toISOString()
 };
 // Send to Google Sheet
 const result = await sendToSheet({
   type: "registration",
   name, email, phone, participation, notes
 });
 if (result.status === "success") {
   regs.push(newReg);
   save('registrations', regs);
   document.getElementById('reg-success').classList.remove('hidden');
   e.target.reset();
   renderParticipants();
   updateStats();
   setTimeout(() => document.getElementById('reg-success').classList.add('hidden'), 4000);
 } else {
   alert("Could not save. Please try again.\n" + (result.message || ""));
 }
});
// ---------- Date & Location Votes ----------
const DATE_LABELS = {
 'dec5-6': '5–6 December 2026',
 'dec12-13': '12–13 December 2026',
 'dec19-20': '19–20 December 2026',
 'dec26-27': '26–27 December 2026'
};
const LOC_LABELS = {
 resort: 'Resort in Chennai (dinner / party / DJ)',
 cruise: 'Short Ocean Cruise from Chennai'
};
function renderVoteStatus() {
 const el = document.getElementById('vote-status');
 if (isVotingOpen()) {
   el.textContent = 'Voting is OPEN · closes 30 Sep 2026';
   el.className = 'vote-status open';
 } else {
   el.textContent = 'Voting is CLOSED · results below';
   el.className = 'vote-status closed';
   document.getElementById('date-vote-btn').disabled = true;
   document.getElementById('loc-vote-btn').disabled = true;
 }
}
function tallyVotes(key) {
 const votes = load(key);
 const counts = {};
 votes.forEach(v => {
   counts[v.option] = (counts[v.option] || 0) + 1;
 });
 return counts;
}
function renderTallies(containerId, counts, labels) {
 const el = document.getElementById(containerId);
 const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
 const entries = Object.entries(labels).map(([k, label]) => ({
   key: k, label, count: counts[k] || 0
 })).sort((a, b) => b.count - a.count);
 el.innerHTML = entries.map(e => `
<div class="tally-row">
<span>${e.label}</span>
<div class="tally-bar-wrap"><div class="tally-bar" style="width:${Math.round(e.count / total * 100)}%"></div></div>
<strong>${e.count}</strong>
</div>
 `).join('');
}
function showResults() {
 const dateCounts = tallyVotes('dateVotes');
 const locCounts = tallyVotes('locVotes');
 renderTallies('date-tallies', dateCounts, DATE_LABELS);
 renderTallies('loc-tallies', locCounts, LOC_LABELS);
 document.getElementById('date-results').classList.remove('hidden');
 document.getElementById('loc-results').classList.remove('hidden');
}
document.getElementById('date-vote-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 if (!isVotingOpen()) {
   alert('Voting has closed.');
   return;
 }
 const option = document.querySelector('input[name="date-option"]:checked').value;
 const voter = document.getElementById('date-voter').value.trim();
 const result = await sendToSheet({
   type: "dateVote",
   voter,
   option
 });
 if (result.status === "success") {
   const votes = load('dateVotes');
   const existing = votes.findIndex(v => v.voter.toLowerCase() === voter.toLowerCase());
   if (existing >= 0) {
     votes[existing].option = option;
     votes[existing].ts = new Date().toISOString();
   } else {
     votes.push({ voter, option, ts: new Date().toISOString() });
   }
   save('dateVotes', votes);
   alert('Date vote recorded. Thank you!');
   e.target.reset();
   showResults();
 } else {
   alert("Could not save vote. Please try again.");
 }
});
document.getElementById('loc-vote-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 if (!isVotingOpen()) {
   alert('Voting has closed.');
   return;
 }
 const option = document.querySelector('input[name="loc-option"]:checked').value;
 const voter = document.getElementById('loc-voter').value.trim();
 const result = await sendToSheet({
   type: "locVote",
   voter,
   option
 });
 if (result.status === "success") {
   const votes = load('locVotes');
   const existing = votes.findIndex(v => v.voter.toLowerCase() === voter.toLowerCase());
   if (existing >= 0) {
     votes[existing].option = option;
     votes[existing].ts = new Date().toISOString();
   } else {
     votes.push({ voter, option, ts: new Date().toISOString() });
   }
   save('locVotes', votes);
   alert('Location vote recorded. Thank you!');
   e.target.reset();
   showResults();
 } else {
   alert("Could not save vote. Please try again.");
 }
});
// ---------- Memories / Collage ----------
function renderCollage() {
 const grid = document.getElementById('collage');
 const memories = load('memories');
 document.getElementById('collage-count').textContent =
   memories.length === 0 ? '0 memories shared' :
   memories.length === 1 ? '1 memory shared' : `${memories.length} memories shared`;
 if (!memories.length) {
   grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center;padding:2rem 0">No memories yet. Share the first one!</p>';
   return;
 }
 const sorted = [...memories].reverse();
 grid.innerHTML = sorted.map(m => `
<article class="memory-card">
<img src="${m.photo || m.PhotoURL || ''}" alt="Photo from ${escapeHtml(m.name)}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x200?text=Photo'">
<div class="memory-body">
<div class="name">${escapeHtml(m.name)}</div>
<div class="text">${escapeHtml(m.text)}</div>
</div>
</article>
 `).join('');
}
document.getElementById('memory-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const name = document.getElementById('mem-name').value.trim();
 const text = document.getElementById('mem-text').value.trim();
 const file = document.getElementById('mem-photo').files[0];
 if (!file) return;
 try {
   const photoBase64 = await fileToBase64(file);
   // Send to Google (photo goes to Drive, text + link to Sheet)
   const result = await sendToSheet({
     type: "memory",
     name,
     text,
     photoBase64: photoBase64
   });
   if (result.status === "success") {
     const memories = load('memories');
     memories.push({
       id: Date.now(),
       name,
       text,
       photo: result.photoURL || photoBase64,   // use Drive link if available
       ts: new Date().toISOString()
     });
     save('memories', memories);
     document.getElementById('mem-success').classList.remove('hidden');
     e.target.reset();
     renderCollage();
     updateStats();
     setTimeout(() => document.getElementById('mem-success').classList.add('hidden'), 4000);
   } else {
     alert("Could not save memory. Please try again.\n" + (result.message || ""));
   }
 } catch (err) {
   alert('Could not process the image. Please try a smaller photo.');
   console.error(err);
 }
});
// ---------- Volunteers ----------
const ROLE_LABELS = {
 morning: 'Morning Event Coordinator',
 evening: 'Evening Event Coordinator',
 treasurer: 'Treasurer'
};
function renderVolunteers() {
 const grid = document.getElementById('volunteers-list');
 const vols = load('volunteers');
 if (!vols.length) {
   grid.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">No volunteers yet. Be the first to step up!</p>';
   return;
 }
 const sorted = [...vols].reverse();
 grid.innerHTML = sorted.map(v => `
<div class="volunteer-card">
<img src="${v.photo || v.PhotoURL || ''}" alt="${escapeHtml(v.name)}"
          onerror="this.src='https://via.placeholder.com/80?text=Photo'">
<div class="vname">${escapeHtml(v.name)}</div>
<div class="vrole">${ROLE_LABELS[v.role] || v.role}</div>
     ${v.note ? `<div class="vnote">${escapeHtml(v.note)}</div>` : ''}
</div>
 `).join('');
}
document.getElementById('volunteer-form').addEventListener('submit', async (e) => {
 e.preventDefault();
 const name = document.getElementById('vol-name').value.trim();
 const email = document.getElementById('vol-email').value.trim();
 const role = document.querySelector('input[name="vol-role"]:checked').value;
 const note = document.getElementById('vol-note').value.trim();
 const file = document.getElementById('vol-photo').files[0];
 if (!file) return;
 try {
   const photoBase64 = await fileToBase64(file, 400, 0.75);
   const result = await sendToSheet({
     type: "volunteer",
     name,
     email,
     role,
     note,
     photoBase64: photoBase64
   });
   if (result.status === "success") {
     const vols = load('volunteers');
     vols.push({
       id: Date.now(),
       name, email, role, note,
       photo: result.photoURL || photoBase64,
       ts: new Date().toISOString()
     });
     save('volunteers', vols);
     document.getElementById('vol-success').classList.remove('hidden');
     e.target.reset();
     renderVolunteers();
     setTimeout(() => document.getElementById('vol-success').classList.add('hidden'), 4000);
   } else {
     alert("Could not save. Please try again.\n" + (result.message || ""));
   }
 } catch (err) {
   alert('Could not process the photo. Please try again.');
   console.error(err);
 }
});
// ---------- Utils ----------
function escapeHtml(str) {
 if (!str) return '';
 return str
   .replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#39;');
}
// ---------- Init ----------
async function initApp() {
 // Try to load latest shared data from Google
 const remote = await loadFromGoogle();
 if (remote && !remote.error) {
   if (remote.registrations) save('registrations', remote.registrations.map(r => ({
     name: r.Name, email: r.Email, phone: r.Phone,
     participation: r.Participation, notes: r.Notes, ts: r.Timestamp
   })));
   if (remote.dateVotes) save('dateVotes', remote.dateVotes.map(v => ({
     voter: v.Voter, option: v.Option, ts: v.Timestamp
   })));
   if (remote.locVotes) save('locVotes', remote.locVotes.map(v => ({
     voter: v.Voter, option: v.Option, ts: v.Timestamp
   })));
   if (remote.memories) save('memories', remote.memories.map(m => ({
     name: m.Name, text: m.Text, photo: m.PhotoURL, ts: m.Timestamp
   })));
   if (remote.volunteers) save('volunteers', remote.volunteers.map(v => ({
     name: v.Name, email: v.Email, role: v.Role, note: v.Note,
     photo: v.PhotoURL, ts: v.Timestamp
   })));
 }
 updateStats();
 renderParticipants();
 renderVoteStatus();
 showResults();
 renderCollage();
 renderVolunteers();
}
// If already authenticated on load
if (sessionStorage.getItem('ps1996_auth') === '1') {
 initApp();
}
