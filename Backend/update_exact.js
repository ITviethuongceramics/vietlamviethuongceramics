
const db = require('./data/db.js');
const fs = require('fs');

async function updateExactTypes() {
  const mapping = JSON.parse(fs.readFileSync('../cloudinary_mapping.json', 'utf-8'));
  const [apps] = await db.query('SELECT id, full_name, cv_link FROM applications WHERE cv_link IS NOT NULL');
  
  let updatedCount = 0;
  for (const app of apps) {
    if (!app.cv_link) continue;
    
    const parts = app.cv_link.split('/');
    const fname = parts[parts.length - 1];
    
    let matchedNewUrl = null;
    for (const [oldUrl, newUrl] of Object.entries(mapping)) {
      if (oldUrl.includes(fname) || newUrl.includes(fname)) {
        matchedNewUrl = newUrl;
        break;
      }
    }
    
    if (matchedNewUrl && matchedNewUrl !== app.cv_link) {
      await db.query('UPDATE applications SET cv_link = ? WHERE id = ?', [matchedNewUrl, app.id]);
      updatedCount++;
      console.log('Updated:', app.id, app.full_name, '->', matchedNewUrl);
    }
  }
  
  console.log('TOTAL APPLICATIONS UPDATED WITH EXACT RESOURCE TYPES:', updatedCount);
}

updateExactTypes().then(() => process.exit(0));
