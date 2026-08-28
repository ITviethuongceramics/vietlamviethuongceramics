
const db = require('./data/db.js');
const fs = require('fs');

async function updateExactCloudinaryUrls() {
  const mapping = JSON.parse(fs.readFileSync('../cloudinary_mapping.json', 'utf-8'));
  const cleanMap = {};
  
  for (const [oldUrl, newUrl] of Object.entries(mapping)) {
    const match = oldUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (match) {
      cleanMap[match[1]] = newUrl;
    }
  }
  
  console.log('📌 BUILT', Object.keys(cleanMap).length, 'EXACT RELATIVE PATH MAPPINGS!');
  
  const [apps] = await db.query('SELECT id, full_name, cv_link FROM applications WHERE cv_link IS NOT NULL');
  let updatedCount = 0;
  
  for (const app of apps) {
    const match = app.cv_link.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (match) {
      const rel = match[1];
      if (cleanMap[rel] && cleanMap[rel] !== app.cv_link) {
        await db.query('UPDATE applications SET cv_link = ? WHERE id = ?', [cleanMap[rel], app.id]);
        updatedCount++;
      }
    }
  }
  
  console.log('🎉 TOTAL APPLICATIONS UPDATED WITH EXACT ACCURATE CLOUDINARY URLs:', updatedCount, '/', apps.length);
}

updateExactCloudinaryUrls().then(() => process.exit(0));
