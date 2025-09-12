const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

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
        { name: 'Perth', postcode: '6000' }, { name: 'Fremantle', postcode: '6160' },
        { name: 'Joondalup', postcode: '6027' }, { name: 'Rockingham', postcode: '6168' },
        { name: 'Mandurah', postcode: '6210' }, { name: 'Bunbury', postcode: '6230' },
        { name: 'Albany', postcode: '6330' }, { name: 'Kalgoorlie', postcode: '6430' },
        { name: 'Geraldton', postcode: '6530' }, { name: 'Broome', postcode: '6725' },
        { name: 'Scarborough', postcode: '6019' }, { name: 'Subiaco', postcode: '6008' },
        { name: 'Claremont', postcode: '6010' }, { name: 'Cottesloe', postcode: '6011' },
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
        'Lots of exclamation marks!', 'Never uses punctuation', 'Academic vocabulary', 'Simple language'
    ],
    occupations: [
        'Software Developer', 'Marketing Manager', 'Teacher', 'Graphic Designer', 'Consultant', 'Freelancer',
        'Student', 'Entrepreneur', 'Writer', 'Engineer', 'Data Scientist', 'Product Manager', 'UX Designer'
    ],
    educationDegrees: [
        'Bachelor of Science', 'Bachelor of Arts', 'Master of Business Administration', 'PhD', 'High School Diploma',
        'Associate Degree', 'Trade Certificate', 'Bachelor of Engineering', 'Master of Science'
    ],
    educationFields: [
        'Computer Science', 'Business', 'Psychology', 'Engineering', 'Medicine', 'Education', 'Marketing',
        'Design', 'Communications', 'Economics', 'Biology', 'Mathematics', 'Literature'
    ],
};

const defaultStreets = [
    'Main Street', 'High Street', 'Church Street', 'Victoria Street',
    'King Street', 'Queen Street', 'Park Road', 'Station Road',
    'George Street', 'William Street', 'Elizabeth Street', 'Market Street'
];

async function getStreetsForSuburb(suburbName, state = 'WA') {
    try {
        const query = `
            [out:json][timeout:10];
            area["name"="${suburbName}"]["admin_level"="9"]["boundary"="administrative"];
            (way["highway"]["name"](area););
            out body;
        `;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); 

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const jsonData = await response.json();
        const streetSet = new Set();
        jsonData.elements.forEach(element => {
            if (element.tags && element.tags.name) {
                streetSet.add(element.tags.name);
            }
        });

        const streets = Array.from(streetSet);
        if (streets.length > 0) {
            console.log(`Successfully fetched ${streets.length} streets for ${suburbName}.`);
            return streets;
        } else {
            console.log(`No streets found for ${suburbName}, using defaults.`);
            return defaultStreets;
        }
    } catch (error) {
        console.error(`Failed to fetch street data for ${suburbName}: ${error.message}. Using defaults.`);
        return defaultStreets;
    }
}

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/api/generate-alias', async (req, res) => {
    try {
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
        
        const favoriteColor = dataPool.colors[Math.floor(Math.random() * dataPool.colors.length)];
        const interests = getRandomItems(dataPool.interests, 3 + Math.floor(Math.random() * 3));
        const linguisticFeatures = getRandomItems(dataPool.linguisticFeatures, 2 + Math.floor(Math.random() * 2));
        const occupation = dataPool.occupations[Math.floor(Math.random() * dataPool.occupations.length)];
        const degree = dataPool.educationDegrees[Math.floor(Math.random() * dataPool.educationDegrees.length)];
        const field = dataPool.educationFields[Math.floor(Math.random() * dataPool.educationFields.length)];
        const education = `${degree} in ${field}`;
        
        res.json({
            firstName, lastName, fullName: `${firstName} ${lastName}`, gender,
            birthday, age: calculateAge(birthday), address, favoriteColor,
            interests, linguisticFeatures, occupation, education
        });
    } catch (error) {
        console.error("Error in /api/generate-alias:", error);
        res.status(500).json({ error: "Failed to generate alias data." });
    }
});

app.get('/api/generate-face', (req, res) => {
    const timestamp = Date.now();
    const options = {
        hostname: 'thispersondoesnotexist.com',
        path: `/?${timestamp}`,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
    };

    const proxyReq = https.get(options, (imgRes) => {
        res.writeHead(imgRes.statusCode, imgRes.headers);
        imgRes.pipe(res, { end: true });
    }).on('error', (error) => {
        console.error('Error fetching image:', error);
        res.status(500).json({ error: 'Failed to generate face' });
    });

    req.pipe(proxyReq, { end: true });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Ward server running locally on http://localhost:${PORT}`);
    });
}

module.exports = app;