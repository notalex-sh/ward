const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SYSTEM_PASSWORD = process.env.WARD_PASSWORD || "ward2024";

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Enhanced data pools for generation
const dataPool = {
    firstNames: {
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
    },
    lastNames: [
        'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson',
        'Thompson', 'Nguyen', 'Thomas', 'Walker', 'Harris', 'Lee', 'Ryan', 'Robinson', 'Kelly', 'King',
        'Davis', 'Wright', 'Evans', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel',
        'Campbell', 'Miller', 'Clark', 'Garcia', 'Martinez', 'Scott', 'Murphy', 'Singh', 'Young', 'Mitchell'
    ],
    waSuburbs: [
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
    ],
    colors: ['Blue', 'Green', 'Red', 'Purple', 'Orange', 'Yellow', 'Black', 'White', 'Pink', 'Teal', 'Gray', 'Indigo'],
    interests: [
        'Photography', 'Gaming', 'Reading', 'Cooking', 'Travel', 'Music', 'Art', 'Sports', 'Technology', 
        'Fashion', 'Fitness', 'Movies', 'Nature', 'Writing', 'Dancing', 'Collecting', 'Gardening', 
        'DIY Projects', 'Meditation', 'Volunteering', 'Board Games', 'Podcasts', 'Astronomy', 'History',
        'Hiking', 'Yoga', 'Painting', 'Singing', 'Coding', 'Blockchain', 'Coffee', 'Wine Tasting',
        'Surfing', 'Skiing', 'Rock Climbing', 'Martial Arts', 'Chess', 'Anime', 'Comics', 'Vintage Cars'
    ],
    linguisticFeatures: [
        'Uses lots of emojis 😊', 'Formal writing style', 'Casual and friendly', 'Uses slang frequently',
        'Grammatically perfect', 'Makes occasional typos', 'Uses ALL CAPS for emphasis', 'Minimalist responses',
        'Writes long paragraphs', 'Short, punchy sentences', 'Uses British spelling', 'Uses American spelling',
        'Lots of exclamation marks!', 'Never uses punctuation', 'Academic vocabulary', 'Simple language',
        'Uses metaphors often', 'Very literal communication', 'Asks lots of questions', 'Makes pop culture references',
        'Uses hashtags frequently', 'Avoids contractions', 'Double spaces after periods', 'Uses oxford comma',
        'Starts sentences with conjunctions', 'Uses passive voice', 'Very direct and blunt', 'Diplomatic and careful'
    ],
    occupations: [
        'Software Developer', 'Marketing Manager', 'Teacher', 'Graphic Designer', 'Consultant', 
        'Freelancer', 'Student', 'Entrepreneur', 'Writer', 'Engineer', 'Data Scientist',
        'Product Manager', 'Sales Executive', 'HR Manager', 'Accountant', 'Lawyer', 'Doctor',
        'Nurse', 'Architect', 'Chef', 'Photographer', 'Real Estate Agent', 'Financial Analyst',
        'Project Manager', 'UX Designer', 'Content Creator', 'Social Media Manager'
    ],
    educationDegrees: [
        'Bachelor of Science', 'Bachelor of Arts', 'Master of Business Administration', 'PhD', 
        'High School Diploma', 'Associate Degree', 'Trade Certificate', 'Bachelor of Engineering',
        'Master of Science', 'Bachelor of Commerce', 'Doctor of Medicine', 'Juris Doctor'
    ],
    educationFields: [
        'Computer Science', 'Business', 'Psychology', 'Engineering', 'Medicine', 'Education', 
        'Marketing', 'Design', 'Communications', 'Economics', 'Biology', 'Mathematics',
        'Literature', 'History', 'Chemistry', 'Physics', 'Law', 'Accounting', 'Finance',
        'Information Technology', 'Data Science', 'Artificial Intelligence'
    ],
    contentThemes: [
        'Memes', 'Tech News', 'Gaming', 'Fashion', 'Food & Recipes', 'Travel Photos', 'Fitness Tips',
        'Movie Reviews', 'Music Discovery', 'Art Gallery', 'Nature Photography', 'Science Facts',
        'History Trivia', 'DIY Tutorials', 'Life Hacks', 'Motivational Quotes', 'Comedy Sketches',
        'Book Reviews', 'Pet Content', 'Sports Highlights', 'Cryptocurrency', 'Sustainable Living',
        'Mental Health', 'Parenting Tips', 'Career Advice', 'Educational Content', 'Luxury Lifestyle',
        'Street Art', 'Anime Culture', 'True Crime', 'Space Exploration', 'Car Enthusiast'
    ],
    postingStyles: [
        'Daily multiple posts', 'Weekly curated content', 'Sporadic but high quality', 'Scheduled posts only',
        'Real-time engagement', 'Story-focused', 'Video-heavy', 'Text-only posts', 'Infographic specialist',
        'Repost with commentary', 'Original content only', 'Mix of OC and shares', 'Thread storyteller',
        'Carousel posts', 'Live streaming regular', 'Poll and quiz creator', 'Behind-the-scenes content'
    ],
    targetAudiences: [
        'Gen Z', 'Millennials', 'Gen X', 'Boomers', 'Tech enthusiasts', 'Creative professionals',
        'Students', 'Parents', 'Entrepreneurs', 'Gamers', 'Fitness enthusiasts', 'Foodies',
        'Travel lovers', 'Pet owners', 'Music fans', 'Movie buffs', 'Book readers', 'Everyone',
        'Young professionals', 'Remote workers', 'Artists', 'Investors', 'Educators', 'Healthcare workers'
    ],
    voiceTones: [
        'Friendly & approachable', 'Professional & informative', 'Humorous & witty', 
        'Inspirational & motivating', 'Casual & conversational', 'Edgy & bold',
        'Mysterious & intriguing', 'Educational & helpful', 'Sarcastic & ironic',
        'Enthusiastic & energetic', 'Calm & soothing', 'Authoritative & expert'
    ]
};

// Cache for street names
const streetCache = new Map();

async function getStreetsForSuburb(suburbName, state = 'WA') {
    const cacheKey = `${suburbName}-${state}`;
    if (streetCache.has(cacheKey)) {
        return streetCache.get(cacheKey);
    }

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
                        resolve(['Main Street', 'High Street', 'Church Street', 'Victoria Street']);
                    }
                } catch (error) {
                    console.error("Failed to parse Overpass API response:", error);
                    resolve(['Victoria Street', 'King Street', 'Queen Street']); 
                }
            });
        });

        req.on('error', (error) => {
            console.error("Error calling Overpass API:", error);
            resolve(['St Georges Terrace', 'Wellington Street', 'Murray Street']);
        });

        req.write('data=' + encodeURIComponent(query));
        req.end();
    });
}

// Helper functions
function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/verify-system-password', (req, res) => {
    const { password } = req.body;
    
    if (password === SYSTEM_PASSWORD) {
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// Enhanced alias generation for personal profiles
app.get('/api/generate-alias', async (req, res) => {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = dataPool.firstNames[gender][Math.floor(Math.random() * dataPool.firstNames[gender].length)];
    const lastName = dataPool.lastNames[Math.floor(Math.random() * dataPool.lastNames.length)];
    
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - Math.floor(Math.random() * 47 + 18);
    const birthMonth = Math.floor(Math.random() * 12 + 1);
    const birthDay = Math.floor(Math.random() * 28 + 1);
    const birthday = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
    
    const streetNumber = Math.floor(Math.random() * 200 + 1);
    const suburb = dataPool.waSuburbs[Math.floor(Math.random() * dataPool.waSuburbs.length)];
    
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
    
    // Enhanced with new fields
    const favoriteColor = dataPool.colors[Math.floor(Math.random() * dataPool.colors.length)];
    const interests = getRandomItems(dataPool.interests, 3 + Math.floor(Math.random() * 3));
    const linguisticFeatures = getRandomItems(dataPool.linguisticFeatures, 2 + Math.floor(Math.random() * 2));
    const occupation = dataPool.occupations[Math.floor(Math.random() * dataPool.occupations.length)];
    const degree = dataPool.educationDegrees[Math.floor(Math.random() * dataPool.educationDegrees.length)];
    const field = dataPool.educationFields[Math.floor(Math.random() * dataPool.educationFields.length)];
    const education = `${degree} in ${field}`;
    
    res.json({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        gender,
        birthday,
        age: calculateAge(birthday),
        address,
        favoriteColor,
        interests,
        linguisticFeatures,
        occupation,
        education
    });
});

// New endpoint for content page generation
app.get('/api/generate-content-page', (req, res) => {
    const theme = dataPool.contentThemes[Math.floor(Math.random() * dataPool.contentThemes.length)];
    const prefixes = ['The', 'Daily', 'Epic', 'Ultimate', 'Best', 'Top', 'Viral', 'Amazing', 'Awesome', 'Creative'];
    const suffixes = ['Hub', 'Zone', 'Central', 'World', 'Daily', 'Life', 'Vibes', 'Nation', 'Squad', 'Studio'];
    
    let pageName;
    if (Math.random() > 0.5) {
        pageName = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${theme}`;
    } else {
        pageName = `${theme} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }
    
    const handle = `@${pageName.toLowerCase().replace(/\s+/g, '')}${Math.floor(Math.random() * 999)}`;
    
    const descriptionTemplates = [
        `Your daily dose of ${theme.toLowerCase()} content 🔥`,
        `Bringing you the best ${theme.toLowerCase()} from around the web`,
        `${theme} enthusiast | Curator of awesome content`,
        `All about ${theme.toLowerCase()} | Follow for daily updates`,
        `${theme} content that makes your day better ✨`,
        `Discover amazing ${theme.toLowerCase()} content here`,
        `The ultimate source for ${theme.toLowerCase()} inspiration`
    ];
    
    const description = descriptionTemplates[Math.floor(Math.random() * descriptionTemplates.length)];
    const postingStyle = dataPool.postingStyles[Math.floor(Math.random() * dataPool.postingStyles.length)];
    const targetAudience = getRandomItems(dataPool.targetAudiences, 1 + Math.floor(Math.random() * 2));
    const voiceTone = dataPool.voiceTones[Math.floor(Math.random() * dataPool.voiceTones.length)];
    
    const frequencies = ['3-5 posts/day', '1-2 posts/day', '5-7 posts/week', '3-4 posts/week', 'Daily posts'];
    const postingFrequency = frequencies[Math.floor(Math.random() * frequencies.length)];
    
    const contentPillars = generateContentPillars(theme);
    const hashtags = generateHashtags(theme);
    const bestPostingTimes = generatePostingTimes();
    
    res.json({
        pageName,
        handle,
        theme,
        description,
        postingStyle,
        targetAudience,
        postingFrequency,
        contentPillars,
        voiceTone,
        hashtags,
        bestPostingTimes
    });
});

function generateContentPillars(theme) {
    const pillars = {
        'Memes': ['Trending formats', 'Original content', 'Relatable humor', 'Pop culture', 'Current events'],
        'Tech News': ['Product launches', 'Industry analysis', 'Reviews', 'Future tech', 'Startups'],
        'Gaming': ['Game reviews', 'Tips & tricks', 'News', 'Streaming highlights', 'Esports'],
        'Fashion': ['Outfit ideas', 'Trend alerts', 'Style tips', 'Designer news', 'Street style'],
        'Food & Recipes': ['Quick recipes', 'Restaurant reviews', 'Cooking tips', 'Food trends', 'Healthy eating']
    };
    
    return pillars[theme] || ['Educational content', 'Entertainment', 'Community engagement', 'Trending topics', 'User-generated content'];
}

function generateHashtags(theme) {
    const baseTag = `#${theme.replace(/\s+/g, '').toLowerCase()}`;
    const generalTags = ['#viral', '#trending', '#daily', '#instagood', '#follow', '#like', '#content', '#fyp', '#explore'];
    return [baseTag, ...getRandomItems(generalTags, 3 + Math.floor(Math.random() * 2))];
}

function generatePostingTimes() {
    const times = ['7:00 AM', '9:00 AM', '12:00 PM', '1:00 PM', '3:00 PM', '5:00 PM', '6:00 PM', '8:00 PM', '9:00 PM'];
    return getRandomItems(times, 2 + Math.floor(Math.random() * 2));
}

// TOTP generation endpoint
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

// Encryption endpoints
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

// Proxy for thispersondoesnotexist.com
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