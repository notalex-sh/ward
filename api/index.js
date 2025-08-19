const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SYSTEM_PASSWORD = process.env.WARD_PASSWORD;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));


// --- DATA FOR GENERATION ---
const firstNames = {
  male: [
    'James', 'William', 'Oliver', 'Jack', 'Noah', 'Thomas', 'Lucas', 'Henry', 'Alexander', 'Ethan', 
    'Mason', 'Michael', 'Daniel', 'Jacob', 'Logan', 'Jackson', 'Levi', 'Sebastian', 'Mateo', 'Owen',
    'Liam', 'Lachlan', 'Cooper', 'Charlie', 'Max', 'Xavier', 'Leo', 'Isaac', 'Harry', 'Oscar',
    'Archie', 'Hunter', 'Ryan', 'George', 'Elijah', 'Joshua', 'Finn', 'Theodore', 'Caleb', 'Samuel'
  ],
  female: [
    'Charlotte', 'Amelia', 'Olivia', 'Isla', 'Mia', 'Ava', 'Grace', 'Chloe', 'Willow', 'Matilda', 
    'Ivy', 'Ella', 'Sophie', 'Isabella', 'Ruby', 'Sienna', 'Evie', 'Harper', 'Lily', 'Zoe',
    'Evelyn', 'Audrey', 'Zara', 'Scarlett', 'Emily', 'Violet', 'Poppy', 'Freya', 'Alice', 'Lucy',
    'Hazel', 'Georgia', 'Penelope', 'Eliza', 'Imogen', 'Layla', 'Aurora', 'Eleanor', 'Claire'
  ]
};

const lastNames = [
  'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson',
  'Thompson', 'Nguyen', 'Thomas', 'Walker', 'Harris', 'Lee', 'Ryan', 'Robinson', 'Kelly', 'King',
  'Davis', 'Wright', 'Evans', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel',
  'Campbell', 'Miller', 'Clark', 'Garcia', 'Martinez', 'Scott', 'Murphy', 'Singh', 'Young', 'Mitchell'
];

const waSuburbs = [
  { name: 'Perth', postcode: '6000' },
  { name: 'Fremantle', postcode: '6160' },
  { name: 'Joondalup', postcode: '6027' },
  { name: 'Rockingham', postcode: '6168' },
  { name: 'Mandurah', postcode: '6210' },
  { name: 'Bunbury', postcode: '6230' },
  { name: 'Albany', postcode: '6330' },
  { name: 'Kalgoorlie', postcode: '6430' },
  { name: 'Geraldton', postcode: '6530' },
  { name: 'Broome', postcode: '6725' },
  { name: 'Scarborough', postcode: '6019' },
  { name: 'Subiaco', postcode: '6008' },
  { name: 'Claremont', postcode: '6010' },
  { name: 'Cottesloe', postcode: '6011' },
  { name: 'Midland', postcode: '6056' }
];


// cache to store street names and avoid spamming the API
const streetCache = new Map();

async function getStreetsForSuburb(suburbName, state = 'WA') {
    const cacheKey = `${suburbName}-${state}`;
    if (streetCache.has(cacheKey)) {
        return streetCache.get(cacheKey);
    }

    // overpass QL query to find all streets in a given suburb/city
    const query = `
        [out:json];
        area["name"="${suburbName}"]["admin_level"="9"]["boundary"="administrative"];
        (
          way["highway"]["name"](area);
        );
        out body;
    `;
    
    const options = {
        hostname: 'overpass-api.de',
        path: '/api/interpreter',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    const streetSet = new Set();
                    jsonData.elements.forEach(element => {
                        if (element.tags && element.tags.name) {
                            streetSet.add(element.tags.name);
                        }
                    });

                    const streets = Array.from(streetSet);
                    if (streets.length > 0) {
                        streetCache.set(cacheKey, streets);
                        resolve(streets);
                    } else {
                        resolve(['Main Street', 'High Street', 'Church Street']);
                    }
                } catch (error) {
                    console.error("Failed to parse Overpass API response:", error);
                    resolve(['Victoria Street']); 
                }
            });
        });

        req.on('error', (error) => {
            console.error("Error calling Overpass API:", error);
            resolve(['St Georges Terrace']);
        });

        req.write('data=' + encodeURIComponent(query));
        req.end();
    });
}

// routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// auth app via password verification
app.post('/api/verify-system-password', (req, res) => {
  const { password } = req.body;
  
  if (password === SYSTEM_PASSWORD) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// generate alias endpoint
app.get('/api/generate-alias', async (req, res) => {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = firstNames[gender][Math.floor(Math.random() * firstNames[gender].length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  // generate birthday (18-65 years old)
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * 47 + 18);
  const birthMonth = Math.floor(Math.random() * 12 + 1);
  const birthDay = Math.floor(Math.random() * 28 + 1);
  const birthday = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  
  // generate address
  const streetNumber = Math.floor(Math.random() * 200 + 1);
  const suburb = waSuburbs[Math.floor(Math.random() * waSuburbs.length)];
  
  // fetch real streets for the selected suburb
  const availableStreets = await getStreetsForSuburb(suburb.name);
  const streetName = availableStreets[Math.floor(Math.random() * availableStreets.length)];
  
  const address = {
    street: `${streetNumber} ${streetName}`,
    suburb: suburb.name,
    state: 'WA',
    postcode: suburb.postcode,
    country: 'Australia',
    full: `${streetNumber} ${streetName}, ${suburb.name}, WA ${suburb.postcode}, Australia`
  };
  
  res.json({
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender,
    birthday,
    address
  });
});

// TOTP generation endpoint (thanks https://piellardj.github.io/totp-generator/)
app.post('/api/generate-totp', (req, res) => {
  const { secret } = req.body;
  
  if (!secret) {
    return res.status(400).json({ error: 'Secret key required' });
  }
  
  const time = Math.floor(Date.now() / 1000 / 30);
  const hash = crypto.createHmac('sha1', Buffer.from(secret, 'base32'))
    .update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'))
    .digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  const otp = (binary % 1000000).toString().padStart(6, '0');
  const timeRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  
  res.json({ otp, timeRemaining });
});

// encryption endpoints
app.post('/api/encrypt', async (req, res) => {
  const { data, password } = req.body;
  
  try {
    const salt = crypto.randomBytes(32);
    const iterations = 100000;
    const key = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    const result = {
      encrypted,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      iterations
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Encryption failed' });
  }
});

app.post('/api/decrypt', async (req, res) => {
  const { encryptedData, password } = req.body;
  
  try {
    const { encrypted, salt, iv, authTag, iterations } = encryptedData;
    
    const key = crypto.pbkdf2Sync(
      password,
      Buffer.from(salt, 'base64'),
      iterations,
      32,
      'sha256'
    );
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    res.json({ data: JSON.parse(decrypted) });
  } catch (error) {
    res.status(400).json({ error: 'Decryption failed - incorrect password or corrupted data' });
  }
});


// proxy for thispersondoesnotexist.com to handle CORS
app.get('/api/generate-face', (req, res) => {
  const timestamp = Date.now();
  const options = {
    hostname: 'thispersondoesnotexist.com',
    path: `/?${timestamp}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'image/jpeg,image/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };

  https.get(options, (imgRes) => {
    res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    imgRes.pipe(res);
  }).on('error', (error) => {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to generate face' });
  });
});

app.listen(PORT, () => {
  console.log(`Ward server running on http://localhost:${PORT}`);
});

module.exports = app;