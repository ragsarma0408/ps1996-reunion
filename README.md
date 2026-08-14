# PS Senior Secondary School – Class of 1996  
## 30-Year Reunion Private Website

A self-contained, password-protected website for the Batch of 1996 from **P.S. Senior Secondary School, Mylapore, Chennai**.

### Features

- **Private access** – password gate (shared only with batchmates)
- **Self-nomination** – register as In-Person or Virtual participant
- **Date voting** – choose among four weekends in December 2026  
  Cut-off: **30 September 2026**
- **Location voting** – Morning at school + either  
  - Resort dinner / party / DJ in Chennai, or  
  - Short ocean cruise from Chennai  
  Same cut-off date
- **Memories & Collage** – submit a short memory + photo; it appears automatically in a shared collage
- **Volunteer roles** – self-nominate for  
  1. Morning Event Coordinator  
  2. Evening Event Coordinator  
  3. Treasurer  
  Photo thumbnails of volunteers are displayed

### Password

```
Batch1996
```

(Share this only with genuine batchmates.)

### How to use (Demo / Single-browser)

1. Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge).
2. Enter the password.
3. All data is stored in the browser’s `localStorage`.  
   It works perfectly for testing and for a small group that shares one computer or exports data.

### Important – Multi-user / Production use

Because this is a pure front-end site, **each person’s browser has its own data**.  
For a real shared experience across many people you should:

**Option A (easiest)**  
Host the files on Netlify, Vercel, GitHub Pages or any static host, then replace the localStorage layer with:

- Firebase / Firestore  
- Supabase  
- or even a Google Sheet + Apps Script / Glide  

**Option B**  
Use the site as a beautiful front-end and collect responses via linked Google Forms that feed a shared Sheet. The collage can still be built by an organizer who periodically updates a simple JSON file.

### Files

```
ps1996-reunion/
├── index.html      # Main page
├── styles.css      # Design system
├── app.js          # All logic (voting, collage, volunteers, storage)
└── README.md       # This file
```

### Customisation tips

- Change the password in `app.js` → `const PASSWORD = '...'`
- Adjust cut-off date in `app.js` → `const CUTOFF = new Date(...)`
- Add or remove date options in both the HTML form and the `DATE_LABELS` object in `app.js`
- School crest / colours can be tweaked in `styles.css` (`--navy`, `--gold`)

### Privacy note

No data leaves the user’s browser unless you later add a backend.  
Photos are resized and stored as compressed JPEG data URLs to keep storage size reasonable.

---

*Built for the Class of 1996 – P.S. Senior Secondary School, Chennai*  
*“Sheelena Shobhate Vidya”*
