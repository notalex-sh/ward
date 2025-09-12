let entities = [];
let currentEntityId = null;
let passwordCallback = null;
let pendingEntityData = null;
let pendingEntityType = null;
let hasUnsavedChanges = false;
let lastExportedState = null;
let editingField = null;

const dataPool = {
  firstNames: {
    male: [
      'James', 'William', 'Oliver', 'Jack', 'Noah', 'Thomas', 'Lucas', 'Henry', 'Alexander', 'Ethan',
      'Mason', 'Michael', 'Daniel', 'Jacob', 'Logan', 'Jackson', 'Levi', 'Sebastian', 'Mateo', 'Owen',
      'Liam', 'Lachlan', 'Cooper', 'Charlie', 'Max', 'Xavier', 'Leo', 'Isaac', 'Harry', 'Oscar',
      'Archie', 'Harrison', 'Archer', 'Harvey', 'Austin', 'Kai', 'Jordan', 'Blake', 'Hunter', 'Zach',
      'Riley', 'Nathan', 'Aiden', 'Caleb', 'Patrick', 'Declan', 'Finn', 'Asher', 'Jayden', 'Spencer'
    ],
    female: [
      'Charlotte', 'Amelia', 'Olivia', 'Isla', 'Mia', 'Ava', 'Grace', 'Chloe', 'Willow', 'Matilda',
      'Ivy', 'Ella', 'Sophie', 'Isabella', 'Ruby', 'Sienna', 'Evie', 'Harper', 'Lily', 'Zoe',
      'Aria', 'Hazel', 'Aurora', 'Violet', 'Mila', 'Abigail', 'Sadie', 'Evelyn', 'Freya', 'Penelope',
      'Zara', 'Poppy', 'Sage', 'Luna', 'Ellie', 'Thea', 'Piper', 'Georgia', 'Amara', 'Naomi'
    ]
  },
  lastNames: [
    'Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson',
    'Thompson', 'Moore', 'Clark', 'Walker', 'Wright', 'Harris', 'Lewis', 'Young', 'King', 'Hall',
    'Allen', 'Scott', 'Green', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Phillips', 'Campbell',
    'Nguyen', 'Edwards', 'Turner', 'Parker', 'Evans', 'Collins', 'Morris', 'Murphy', 'Cook', 'Sanders'
  ],
  colors: [
    'Blue', 'Green', 'Red', 'Purple', 'Orange', 'Yellow', 'Black', 'White', 'Pink', 'Teal', 'Gray', 'Indigo',
    'Violet', 'Magenta', 'Cyan', 'Maroon', 'Turquoise', 'Olive', 'Navy', 'Coral', 'Mint', 'Beige', 'Gold', 'Silver'
  ],
  interests: [
    'Photography', 'Gaming', 'Reading', 'Cooking', 'Travel', 'Music', 'Art', 'Sports', 'Technology',
    'Fashion', 'Fitness', 'Movies', 'Nature', 'Writing', 'Dancing', 'Collecting', 'Gardening',
    'DIY Projects', 'Meditation', 'Volunteering', 'Board Games', 'Podcasts', 'Astronomy', 'History',
    'Hiking', 'Surfing', 'Cycling', 'Running', 'Yoga', '3D Printing', 'Calligraphy', 'Investing',
    'Baking', 'Chess', 'Coding', 'Home Brewing', 'Birdwatching', 'Karaoke', 'Thrifting', 'Makeup'
  ],
  linguisticFeatures: [
    'Uses lots of emojis 😊', 'Formal writing style', 'Casual and friendly', 'Uses slang frequently',
    'Grammatically perfect', 'Makes occasional typos', 'Uses ALL CAPS for emphasis', 'Minimalist responses',
    'Writes long paragraphs', 'Short, punchy sentences', 'Uses British spelling', 'Uses American spelling',
    'Lots of exclamation marks!', 'Never uses punctuation', 'Academic vocabulary', 'Simple language',
    'Uses metaphors often', 'Very literal communication', 'Asks lots of questions', 'Makes pop culture references',
    'Bullet-point thinker •', 'Parenthetical asides (often)', 'Emoji at line-end', 'Hashtag usage #sparingly',
    'Ellipses user…', 'Prefers rhetorical questions?'
  ],
  contentThemes: [
    'Memes', 'Tech News', 'Gaming', 'Fashion', 'Food & Recipes', 'Travel Photos', 'Fitness Tips',
    'Movie Reviews', 'Music Discovery', 'Art Gallery', 'Nature Photography', 'Science Facts',
    'History Trivia', 'DIY Tutorials', 'Life Hacks', 'Motivational Quotes', 'Comedy Sketches',
    'Book Reviews', 'Pet Content', 'Sports Highlights', 'Cryptocurrency', 'Sustainable Living',
    'Home Design', 'Parenting', 'Productivity', 'Startup Tips', 'Education', 'Career Growth',
    'Finance Basics', 'Photography Tips', 'Mindfulness', 'Skincare', 'Tech Tutorials', 'AI Demos'
  ],
  postingStyles: [
    'Daily multiple posts', 'Weekly curated content', 'Sporadic but high quality', 'Scheduled posts only',
    'Real-time engagement', 'Story-focused', 'Video-heavy', 'Text-only posts', 'Infographic specialist',
    'Repost with commentary', 'Original content only', 'Mix of OC and shares', 'Thread storyteller',
    'Short-form first', 'Carousel explainers', 'Livestreams weekly', 'Community Q&A Fridays'
  ],
  targetAudiences: [
    'Gen Z', 'Millennials', 'Gen X', 'Boomers', 'Tech enthusiasts', 'Creative professionals',
    'Students', 'Parents', 'Entrepreneurs', 'Gamers', 'Fitness enthusiasts', 'Foodies',
    'Travel lovers', 'Pet owners', 'Music fans', 'Movie buffs', 'Book readers', 'Everyone',
    'Developers', 'Designers', 'Photographers', 'Writers', 'Founders', 'Investors', 'Educators'
  ]
};

// --- ENCRYPTION/DECRYPTION FUNCTIONS (from SAMS) ---

async function generateKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await generateKey(password, salt);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  const finalBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
  finalBuffer.set(salt, 0);
  finalBuffer.set(iv, salt.length);
  finalBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
  return finalBuffer;
}

async function decryptData(encryptedBlob, password) {
  try {
    const encryptedData = new Uint8Array(encryptedBlob);
    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const data = encryptedData.slice(28);
    const key = await generateKey(password, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
}

function initializeApp() {
    lastExportedState = JSON.stringify(entities);
}

function markAsChanged() {
    hasUnsavedChanges = true;
    const currentState = JSON.stringify(entities);
    if (currentState !== lastExportedState) {
        document.getElementById('unsaved-warning').classList.remove('hidden');
    } else {
        document.getElementById('unsaved-warning').classList.add('hidden');
    }
}

function markAsSaved() {
    hasUnsavedChanges = false;
    lastExportedState = JSON.stringify(entities);
    document.getElementById('unsaved-warning').classList.add('hidden');
}

function showNotification(message, type = 'info', options = {}) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const colors = {
        success: 'border-green-500 bg-green-500/10',
        error: 'border-red-500 bg-red-500/10',
        warning: 'border-yellow-500 bg-yellow-500/10',
        info: 'border-white bg-white/10'
    };
    
    const textTransformClass = options.preserveCase ? '' : 'uppercase';

    notification.className = `${colors[type]} border px-4 py-3 rounded flex items-center space-x-2 transition-all transform translate-x-full backdrop-blur-sm fade-in`;
    notification.innerHTML = `
        <span class="text-sm ${textTransformClass} tracking-wider">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 hover:text-white/50">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 10);

    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function showNewEntityModal() {
    document.getElementById('new-entity-modal').classList.remove('hidden');
    document.getElementById('preview-content').classList.add('hidden');
    document.getElementById('regenerate-btn').classList.add('hidden');
    document.getElementById('create-btn').classList.add('hidden');
}

function selectEntityType(type) {
    pendingEntityType = type;

    document.querySelectorAll('.entity-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    generateEntityData(type);
}

async function generateEntityData(type) {
    const previewContent = document.getElementById('preview-content');

    previewContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="loading-spinner mb-4"></div>
            <p class="text-sm text-white/50 uppercase tracking-wider">Generating ${type === 'person' ? 'Identity' : 'Page'}...</p>
            <p class="text-xs text-white/30 mt-2">This shouldn't take long</p>
        </div>
    `;
    previewContent.classList.remove('hidden');

    try {
        if (type === 'person') {
            const data = await generatePersonData();
            pendingEntityData = data;
        } else {
            const data = generateContentPageData();
            pendingEntityData = data;
        }

        updatePreview(pendingEntityData, type);
        document.getElementById('regenerate-btn').classList.remove('hidden');
        document.getElementById('create-btn').classList.remove('hidden');
    } catch (error) {
        console.error('Error generating entity:', error);
        previewContent.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500 mb-4">Failed to generate ${type}</p>
                <button onclick="regeneratePreview()" class="mono-button px-4 py-2 rounded">Try Again</button>
            </div>
        `;
    }
}

async function generatePersonData() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/generate-alias', {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error('Failed to generate alias');
        }

        const apiData = await response.json();

        return {
            ...apiData,
            age: calculateAge(apiData.birthday),
            favoriteColor: dataPool.colors[Math.floor(Math.random() * dataPool.colors.length)],
            interests: getRandomItems(dataPool.interests, 3 + Math.floor(Math.random() * 3)),
            linguisticFeatures: getRandomItems(dataPool.linguisticFeatures, 2 + Math.floor(Math.random() * 2)),
            occupation: generateOccupation(),
            education: generateEducation()
        };
    } catch (error) {
        console.log('API failed, using local generation:', error.message);
        return generateLocalPersonData();
    }
}

function generateLocalPersonData() {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = dataPool.firstNames[gender][Math.floor(Math.random() * dataPool.firstNames[gender].length)];
    const lastName = dataPool.lastNames[Math.floor(Math.random() * dataPool.lastNames.length)];

    const birthYear = new Date().getFullYear() - Math.floor(Math.random() * 47 + 18);
    const birthMonth = Math.floor(Math.random() * 12 + 1);
    const birthDay = Math.floor(Math.random() * 28 + 1);
    const birthday = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    return {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        gender,
        birthday,
        age: calculateAge(birthday),
        favoriteColor: dataPool.colors[Math.floor(Math.random() * dataPool.colors.length)],
        interests: getRandomItems(dataPool.interests, 3 + Math.floor(Math.random() * 3)),
        linguisticFeatures: getRandomItems(dataPool.linguisticFeatures, 2 + Math.floor(Math.random() * 2)),
        occupation: generateOccupation(),
        education: generateEducation(),
        address: {
            street: '123 Example Street',
            suburb: 'Perth',
            state: 'WA',
            postcode: '6000',
            country: 'Australia',
            full: '123 Example Street, Perth, WA 6000, Australia'
        }
    };
}

function generateContentPageData() {
    const themes = getRandomItems(dataPool.contentThemes, 1)[0];
    const pageName = generatePageName(themes);
    const handle = generateHandle(pageName);

    return {
        pageName,
        handle,
        theme: themes,
        description: generatePageDescription(themes),
        postingStyle: getRandomItems(dataPool.postingStyles, 1)[0],
        targetAudience: getRandomItems(dataPool.targetAudiences, 1 + Math.floor(Math.random() * 2)),
        postingFrequency: generatePostingFrequency(),
        contentPillars: generateContentPillars(themes),
        voiceTone: generateVoiceTone(),
        hashtags: generateHashtags(themes),
        bestPostingTimes: generatePostingTimes()
    };
}

function generatePageName(theme) {
  const t = (theme || '').trim();
  const prefixes = [
    'The', 'Daily', 'Epic', 'Ultimate', 'Best', 'Top', 'Viral', 'Amazing', 'Awesome',
    'Prime', 'Instant', 'Next', 'Now', 'Hyper', 'Super', 'Mega', 'Zero', 'Alpha', 'Omega',
    'Pure', 'True', 'Real', 'Classic', 'Urban', 'Cosmic', 'Quantum', 'Neon', 'Midnight',
    'First', 'Frontline', 'Insider', 'Peak', 'Core', 'All', 'Everyday', 'Local', 'Global'
  ];
  const suffixes = [
    'Hub', 'Zone', 'Central', 'World', 'Daily', 'Life', 'Vibes', 'Nation', 'Squad',
    'Vault', 'Feed', 'Lab', 'Works', 'Club', 'Factory', 'Studio', 'Stream', 'HQ',
    'Arena', 'Corner', 'Spot', 'Chronicles', 'Digest', 'Wire', 'Press', 'Report',
    'Collective', 'Loop', 'Matrix', 'Archive', 'Forum'
  ];
  const connectors = ['of', 'by', 'for'];

  const style = Math.random();
  if (style < 0.33) {
    // "<Prefix> <Theme>"
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${t}`;
  } else if (style < 0.66) {
    // "<Theme> <Suffix>"
    return `${t} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  } else {
    // "<Theme> <Connector> the <Suffix>" or hyphen mix
    const c = connectors[Math.floor(Math.random() * connectors.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const pattern = Math.random() < 0.5
      ? `${t} ${c} the ${s}`
      : `${t}-${s}`;
    return pattern;
  }
}

function generateHandle(pageName) {
  const base = (pageName || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
    .replace(/[^a-z0-9]+/g, '')                       
    .slice(0, 18) || 'page';

  const suffixTypes = [
    () => Math.floor(100 + Math.random() * 899).toString(),
    () => '_' + Math.floor(10 + Math.random() * 89).toString(),
    () => '.' + Math.floor(1000 + Math.random() * 8999).toString(),
    () => '_io',
    () => '_au',
    () => 'tv',
    () => Math.random().toString(36).slice(2, 5) 
  ];

  const suffix = suffixTypes[Math.floor(Math.random() * suffixTypes.length)]();
  return `@${base}${suffix}`;
}

function generatePageDescription(theme) {
  const t = (theme || '').toLowerCase();
  const templates = [
    `Your daily dose of ${t} 🔥`,
    `Bringing you the best ${t} from around the web`,
    `${theme} enthusiast | Curator of awesome content`,
    `All about ${t} | Follow for daily updates`,
    `${theme} content that makes your day better ✨`,
    `Fresh ${t} drops, trends, and takes — every day`,
    `Smart, snackable ${t} for busy brains`,
    `Deep dives & quick hits in ${t}`,
    `Because your feed deserves smarter ${t}`,
    `We sift the noise so you get only the best ${t}`,
    `Honest takes, zero fluff — ${t} that matters`,
    `From beginner to pro: ${t} tips, tools, and trends`,
    `Short, sharp, and scroll-stopping ${t} ⚡`,
    `Community-powered ${t} — join the convo`,
    `Daily inspiration & real talk in ${t}`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generatePostingFrequency() {
  const frequencies = [
    '3-5 posts/day', '1-2 posts/day', '5-7 posts/week', '3-4 posts/week', 'Daily posts',
    '2-3 reels/week', 'Stories daily, posts 2x/week', 'Longform weekly + shorts daily',
    'Weekdays only', 'Weekends focus', 'Every other day', 'Twice daily (AM/PM)'
  ];
  return frequencies[Math.floor(Math.random() * frequencies.length)];
}

function generateContentPillars(theme) {
  const pillars = {
    'Memes': ['Trending formats', 'Original content', 'Relatable humor', 'Pop culture', 'Topical remixes'],
    'Tech News': ['Product launches', 'Industry analysis', 'Reviews', 'Future tech', 'How-tos'],
    'Gaming': ['Game reviews', 'Tips & tricks', 'News', 'Streaming highlights', 'Esports'],
    'Fashion': ['Outfit ideas', 'Trend alerts', 'Style tips', 'Designer news', 'Thrift flips'],
    'Food & Recipes': ['Quick recipes', 'Restaurant reviews', 'Cooking tips', 'Food trends', 'Meal prep'],
    'Travel Photos': ['Hidden gems', 'City guides', 'Budget tips', 'Photo diaries', 'Gear'],
    'Fitness Tips': ['Routines', 'Form checks', 'Nutrition basics', 'Home workouts', 'Mobility'],
    'Movie Reviews': ['New releases', 'Underrated picks', 'Explainers', 'Rankings', 'Behind the scenes'],
    'Music Discovery': ['New drops', 'Playlists', 'Artist spotlights', 'Genres 101', 'Gear talk'],
    'Art Gallery': ['Process videos', 'Sketchbook tours', 'Artist features', 'Materials 101', 'Challenges'],
    'Nature Photography': ['Landscapes', 'Wildlife', 'Editing guides', 'Locations', 'Gear'],
    'Science Facts': ['Space', 'Bio', 'Physics', 'Mythbusting', 'Explainers'],
    'History Trivia': ['This day in history', 'Micro-bios', 'Artifacts', 'Maps', 'Timelines'],
    'DIY Tutorials': ['Home fixes', 'Woodwork', 'Crafts', 'Electronics', 'Upcycling'],
    'Life Hacks': ['Productivity', 'Money savers', 'Digital tricks', 'Mindset', 'Automation'],
    'Motivational Quotes': ['Morning boosts', 'Success stories', 'Mindfulness', 'Habits', 'Journaling'],
    'Comedy Sketches': ['Situational bits', 'Characters', 'Parodies', 'Duets', 'Outtakes'],
    'Book Reviews': ['New reads', 'Classics', 'Notes & highlights', 'TBRs', 'Author Q&As'],
    'Pet Content': ['Training', 'Care tips', 'Adoption stories', 'Funny fails', 'Before/after'],
    'Sports Highlights': ['Top plays', 'Analysis', 'History', 'Behind the scenes', 'Fan takes'],
    'Cryptocurrency': ['Market updates', 'Security basics', 'Chain explainers', 'DeFi', 'Builders'],
    'Sustainable Living': ['Low-waste tips', 'Thrift & repair', 'Energy savers', 'Gardening', 'Policy watch']
  };

  return pillars[theme] || ['Educational content', 'Entertainment', 'Community engagement', 'Trending topics', 'How-tos'];
}

function generateVoiceTone() {
  const tones = [
    'Friendly & approachable', 'Professional & informative', 'Humorous & witty',
    'Inspirational & motivating', 'Casual & conversational', 'Edgy & bold',
    'Analytical & data-driven', 'Playful & quirky', 'Chill & minimalist',
    'High-energy hype', 'Empathetic & supportive', 'Sincere & down-to-earth'
  ];
  return tones[Math.floor(Math.random() * tones.length)];
}

function generateHashtags(theme) {
  const base = (theme || '').replace(/\s+/g, '').toLowerCase();
  const baseVariants = [`#${base}`, `#${base}tips`, `#${base}life`, `#${base}daily`, `#learn${base}`];

  const additional = [
    '#viral', '#trending', '#fyp', '#daily', '#howto', '#tutorial',
    '#lifehacks', '#goals', '#motivation', '#community', '#creator', '#aesthetic',
    '#australia', '#perth', '#news', '#review', '#behindthescenes'
  ];

  const tags = [...new Set([...getRandomItems(baseVariants, 2 + Math.floor(Math.random() * 2)), ...getRandomItems(additional, 3)])];
  return tags.slice(0, 6);
}

function generatePostingTimes() {
  const times = [
    '7:30 AM', '8:00 AM', '9:00 AM', '10:30 AM', '12:00 PM',
    '1:00 PM', '3:00 PM', '5:30 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:30 PM'
  ];
  return getRandomItems(times, 2 + Math.floor(Math.random() * 3));
}

function generateOccupation() {
  const occupations = [
    'Software Developer', 'Marketing Manager', 'Teacher', 'Graphic Designer',
    'Consultant', 'Freelancer', 'Student', 'Entrepreneur', 'Writer', 'Engineer',
    'Data Analyst', 'Product Manager', 'UX Designer', 'Photographer', 'Videographer',
    'Content Creator', 'Sales Rep', 'Accountant', 'Nurse', 'Barista',
    'Electrician', 'Mechanic', 'Architect', 'Scientist', 'Researcher'
  ];
  return occupations[Math.floor(Math.random() * occupations.length)];
}

function generateEducation() {
  const degrees = [
    'Bachelor of Science', 'Bachelor of Arts', 'Master of Business', 'Master of Science', 'MBA', 'PhD',
    'High School Diploma', 'Associate Degree', 'Trade Certificate', 'Graduate Diploma', 'Certificate IV'
  ];
  const fields = [
    'Computer Science', 'Business', 'Psychology', 'Engineering', 'Medicine',
    'Education', 'Marketing', 'Design', 'Communications', 'Finance',
    'Law', 'Biology', 'Physics', 'Chemistry', 'Data Science', 'Journalism',
    'Environmental Science', 'Political Science', 'Sociology', 'Art History'
  ];
  return `${degrees[Math.floor(Math.random() * degrees.length)]} in ${fields[Math.floor(Math.random() * fields.length)]}`;
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

function generateUsernames(firstName, lastName, birthday) {
    const usernames = [];
    const year = birthday.split('-')[0].slice(-2);
    const birthYear = birthday.split('-')[0];
    const birthMonth = birthday.split('-')[1];

    usernames.push(`${firstName.toLowerCase()}${lastName.toLowerCase()}${year}`);
    usernames.push(`${firstName.toLowerCase()}.${lastName.toLowerCase()}`);
    usernames.push(`${firstName.toLowerCase()}_${lastName.toLowerCase()}`);
    usernames.push(`${firstName[0].toLowerCase()}${lastName.toLowerCase()}${birthYear}`);
    usernames.push(`${firstName.toLowerCase()}${birthMonth}${year}`);
    usernames.push('custom');

    return usernames;
}

function updatePreview(data, type) {
    const previewContent = document.getElementById('preview-content');

    if (type === 'person') {
        const usernames = generateUsernames(data.firstName, data.lastName, data.birthday);

        previewContent.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Name</label>
                    <p class="text-lg font-semibold">${data.fullName}</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Age</label>
                    <p class="text-lg">${data.age} years (${data.birthday})</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Gender</label>
                    <p class="text-lg">${data.gender}</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Favorite Color</label>
                    <p class="text-lg">${data.favoriteColor}</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Occupation</label>
                    <p class="text-lg">${data.occupation}</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Education</label>
                    <p class="text-lg">${data.education}</p>
                </div>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Address</label>
                <p class="text-sm mt-1">${data.address.full}</p>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Interests</label>
                <p class="text-sm mt-1">${data.interests.join(', ')}</p>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Linguistic Features</label>
                <p class="text-sm mt-1">${data.linguisticFeatures.join('; ')}</p>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider mb-2 block">Select Username</label>
                <div class="space-y-2">
                    ${usernames.map((username, index) => `
                        <label class="flex items-center p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer transition-colors">
                            <input type="radio" name="username-option" value="${username}" ${index === 0 ? 'checked' : ''}
                                   onchange="handleUsernameSelection('${username}')" class="mr-3">
                            <span class="font-mono">${username === 'custom' ? 'Enter custom username...' : username}</span>
                        </label>
                    `).join('')}
                    <input type="text" id="custom-username-input" class="mono-input w-full px-4 py-2 rounded text-white hidden"
                           placeholder="Enter custom username" onkeyup="updateCustomUsername(this.value)">
                </div>
            </div>
        `;
    } else {
        previewContent.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Page Name</label>
                    <input type="text" id="custom-page-name" class="mono-input w-full px-3 py-1 rounded text-white"
                           value="${data.pageName}" onkeyup="updatePageName(this.value)">
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Username</label>
                    <input type="text" id="custom-handle" class="mono-input w-full px-3 py-1 rounded text-white font-mono"
                           value="${data.handle}" onkeyup="updateHandle(this.value)">
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Theme</label>
                    <p class="text-lg">${data.theme}</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Posting Style</label>
                    <p class="text-lg">${data.postingStyle}</p>
                </div>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Description</label>
                <p class="text-sm mt-1">${data.description}</p>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Target Audience</label>
                <p class="text-sm mt-1">${data.targetAudience.join(', ')}</p>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Content Pillars</label>
                <p class="text-sm mt-1">${data.contentPillars.join(' | ')}</p>
            </div>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Voice Tone</label>
                    <p class="text-sm mt-1">${data.voiceTone}</p>
                </div>
                <div>
                    <label class="text-xs text-white/50 uppercase tracking-wider">Posting Frequency</label>
                    <p class="text-sm mt-1">${data.postingFrequency}</p>
                </div>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Best Posting Times</label>
                <p class="text-sm mt-1">${data.bestPostingTimes.join(', ')}</p>
            </div>

            <div class="mt-4">
                <label class="text-xs text-white/50 uppercase tracking-wider">Hashtags</label>
                <p class="text-sm mt-1">${data.hashtags.join(' ')}</p>
            </div>
        `;
    }
}

let customUsername = '';

function handleUsernameSelection(value) {
    const customInput = document.getElementById('custom-username-input');
    if (value === 'custom') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customUsername = '';
    }
}

function updateCustomUsername(value) {
    customUsername = value;
}

function updatePageName(value) {
    if (pendingEntityData) {
        pendingEntityData.pageName = value;
    }
}

function updateHandle(value) {
    if (pendingEntityData) {
        pendingEntityData.handle = value;
    }
}

async function regeneratePreview() {
    if (!pendingEntityType) return;

    const previewContent = document.getElementById('preview-content');

    previewContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="loading-spinner mb-4"></div>
            <p class="text-sm text-white/50 uppercase tracking-wider">Regenerating...</p>
        </div>
    `;

    try {
        if (pendingEntityType === 'person') {
            const data = await generatePersonData();
            pendingEntityData = data;
        } else {
            const data = generateContentPageData();
            pendingEntityData = data;
        }

        updatePreview(pendingEntityData, pendingEntityType);
    } catch (error) {
        console.error('Error regenerating:', error);
        previewContent.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-500 mb-4">Failed to regenerate</p>
                <button onclick="regeneratePreview()" class="mono-button px-4 py-2 rounded">Try Again</button>
            </div>
        `;
    }
}

function closeNewEntityModal() {
    document.getElementById('new-entity-modal').classList.add('hidden');
    pendingEntityData = null;
    pendingEntityType = null;
    customUsername = '';
}

async function confirmNewEntity() {
    if (!pendingEntityData || !pendingEntityType) return;

    let entity;

    if (pendingEntityType === 'person') {
        const selected = document.querySelector('input[name="username-option"]:checked');
        if (!selected) return;

        let username = selected.value;
        if (username === 'custom') {
            username = customUsername;
            if (!username) {
                showNotification('Enter custom username', 'error');
                return;
            }
        }

        entity = {
            id: generateUUID(),
            type: 'person',
            ...pendingEntityData,
            username,
            profilePhoto: null,
            profilePhotoLocked: false,
            passwords: [],
            totpSecrets: [],
            notes: '',
            createdAt: new Date().toISOString()
        };
    } else {
        const customPageName = document.getElementById('custom-page-name');
        const customHandle = document.getElementById('custom-handle');

        if (customPageName) pendingEntityData.pageName = customPageName.value;
        if (customHandle) pendingEntityData.handle = customHandle.value;

        entity = {
            id: generateUUID(),
            type: 'content',
            ...pendingEntityData,
            profilePhoto: null,
            profilePhotoLocked: false,
            passwords: [],
            totpSecrets: [],
            notes: '',
            createdAt: new Date().toISOString()
        };
    }

    entities.push(entity);
    renderTabs();
    selectEntity(entity.id);
    markAsChanged();
    closeNewEntityModal();
    showNotification(`NEW ${pendingEntityType.toUpperCase()} CREATED`, 'success');

    if (pendingEntityType === 'person') {
        setTimeout(() => {
            const photoContainer = document.getElementById('photo-container');
            if (photoContainer) {
                generateProfilePhoto();
            }
        }, 500);
    }
}

function selectEntity(id) {
    currentEntityId = id;
    renderTabs();
    renderContent();
}

function deleteEntity(id) {
    if (!confirm('Delete this entity permanently?')) return;

    entities = entities.filter(e => e.id !== id);
    if (currentEntityId === id) {
        if (entities.length > 0) {
            selectEntity(entities[0].id);
        } else {
            currentEntityId = null;
            renderTabs();
            renderContent();
        }
    } else {
        renderTabs();
    }
    markAsChanged();
    showNotification('ENTITY DELETED', 'success');
}

function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';

    entities.forEach(entity => {
        const displayName = entity.type === 'person' ? entity.fullName : entity.pageName;
        const icon = entity.type === 'person' ? '👤' : '📄';

        const tab = document.createElement('div');
        tab.className = `flex items-center px-4 py-2 hover:bg-white/10 transition-colors cursor-pointer ${
            entity.id === currentEntityId ? 'tab-active' : ''
        }`;
        tab.onclick = () => selectEntity(entity.id);

        tab.innerHTML = `
            <span class="mr-2">${icon}</span>
            <span class="mr-2 font-mono text-sm">${displayName}</span>
            <button onclick="event.stopPropagation(); deleteEntity('${entity.id}')" class="ml-2 text-white/50 hover:text-red-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        container.appendChild(tab);
    });
}

function renderContent() {
    const entity = entities.find(e => e.id === currentEntityId);
    const container = document.getElementById('content-container');

    if (!entity) {
        container.innerHTML = `
            <div class="max-w-4xl mx-auto mt-10" id="welcome-message">
                <div class="cyber-border rounded-lg text-center p-8 sm:p-12 fade-in">
                    <h2 class="text-4xl sm:text-6xl font-bold tracking-widest">WARD</h2>
                    <p class="text-base sm:text-lg text-white/70 mt-2 uppercase tracking-wider">Identity Management System</p>
                    <button onclick="showNewEntityModal()" class="mono-button px-6 py-3 rounded mt-8">CREATE NEW ENTITY</button>
                </div>
            </div>
        `;
        return;
    }

    if (entity.type === 'person') {
        renderPersonContent(entity);
    } else {
        renderContentPageContent(entity);
    }

    startTOTPTimers();
}

function renderPersonContent(entity) {
    const container = document.getElementById('content-container');
    container.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <div class="cyber-border rounded-lg p-4 sm:p-6 mb-6 fade-in">
                <h2 class="text-xl sm:text-2xl font-bold mb-6 uppercase tracking-wider">PERSONAL IDENTITY</h2>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="flex flex-col items-center">
                        <div id="photo-container" class="profile-frame mb-4 relative w-[256px] h-[256px]">
                            ${entity.profilePhoto ?
                                `<img src="${entity.profilePhoto}" class="w-full h-full object-cover">` :
                                `<div class="w-full h-full bg-black flex items-center justify-center">
                                    <div class="text-white/30 text-center">
                                        <p class="text-xs uppercase mb-2">No Photo</p>
                                        <p class="text-xs">Click Generate</p>
                                    </div>
                                </div>`
                            }
                        </div>
                        <div class="space-y-2 w-full max-w-[256px]">
                            ${!entity.profilePhotoLocked ? `
                                <button onclick="generateProfilePhoto()" class="mono-button px-4 py-2 rounded text-sm w-full">GENERATE</button>
                                ${entity.profilePhoto ? `
                                    <button onclick="lockProfilePhoto()" class="mono-button-secondary px-4 py-2 rounded text-sm w-full">LOCK</button>
                                ` : ''}
                            ` : `
                                <button onclick="downloadPhoto()" class="mono-button px-4 py-2 rounded text-sm w-full">DOWNLOAD</button>
                                <div class="flex items-center justify-center space-x-2">
                                    <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                    </svg>
                                    <span class="text-xs text-green-500 uppercase">Locked</span>
                                </div>
                            `}
                            <p class="text-xs text-white/40 text-center mt-2">
                                Photos generated using AI may not reflect profile details
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div class="editable-field">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Full Name</label>
                            <div class="flex items-center justify-between">
                                <p class="text-base sm:text-lg font-semibold">${entity.fullName}</p>
                                <button onclick="editField('fullName', 'text')" class="text-white/50 hover:text-white">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="editable-field">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Username</label>
                            <div class="flex items-center justify-between">
                                <p class="text-base sm:text-lg font-mono">${entity.username}</p>
                                <button onclick="editField('username', 'text')" class="text-white/50 hover:text-white">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-white/50 uppercase tracking-wider">Gender</label>
                                <p class="text-base sm:text-lg">${entity.gender}</p>
                            </div>
                            <div>
                                <label class="text-xs text-white/50 uppercase tracking-wider">Age</label>
                                <p class="text-base sm:text-lg">${entity.age} years</p>
                            </div>
                        </div>

                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Birthday</label>
                            <p class="text-base sm:text-lg">${entity.birthday}</p>
                        </div>

                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Favorite Color</label>
                             <p class="text-base sm:text-lg">${entity.favoriteColor}</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Occupation</label>
                            <p class="text-sm">${entity.occupation}</p>
                        </div>

                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Education</label>
                            <p class="text-sm">${entity.education}</p>
                        </div>

                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Address</label>
                            <p class="text-sm">${entity.address.full}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <label class="text-xs text-white/50 uppercase tracking-wider">Interests</label>
                        <p class="text-sm mt-1">${entity.interests.join(', ')}</p>
                    </div>

                    <div>
                        <label class="text-xs text-white/50 uppercase tracking-wider">Linguistic Features</label>
                        <p class="text-sm mt-1">${entity.linguisticFeatures.join('; ')}</p>
                    </div>
                </div>
            </div>

            ${renderPasswordSection(entity)}
            ${renderTOTPSection(entity)}
            ${renderNotesSection(entity)}
            ${renderResourcesSection()}
        </div>
    `;
}

function renderContentPageContent(entity) {
    const container = document.getElementById('content-container');
    container.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <div class="cyber-border rounded-lg p-4 sm:p-6 mb-6 fade-in">
                <h2 class="text-xl sm:text-2xl font-bold mb-6 uppercase tracking-wider">CONTENT PAGE</h2>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <div class="editable-field mb-3">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Page Name</label>
                            <div class="flex items-center justify-between">
                                <p class="text-lg font-semibold">${entity.pageName}</p>
                                <button onclick="editField('pageName', 'text')" class="text-white/50 hover:text-white">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="editable-field mb-3">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Username</label>
                            <div class="flex items-center justify-between">
                                <p class="text-lg font-mono">${entity.handle}</p>
                                <button onclick="editField('handle', 'text')" class="text-white/50 hover:text-white">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Theme</label>
                             <p class="text-base">${entity.theme}</p>
                        </div>

                        <div class="editable-field">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Description</label>
                            <div class="flex items-start justify-between">
                                <p class="text-sm mt-1">${entity.description}</p>
                                <button onclick="editField('description', 'textarea')" class="text-white/50 hover:text-white ml-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="mb-3">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Posting Style</label>
                            <p class="text-base">${entity.postingStyle}</p>
                        </div>

                        <div class="mb-3">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Voice Tone</label>
                            <p class="text-base">${entity.voiceTone}</p>
                        </div>

                        <div class="mb-3">
                            <label class="text-xs text-white/50 uppercase tracking-wider">Posting Frequency</label>
                            <p class="text-base">${entity.postingFrequency}</p>
                        </div>

                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Best Times</label>
                            <p class="text-sm">${entity.bestPostingTimes.join(', ')}</p>
                        </div>
                    </div>
                </div>

                <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <label class="text-xs text-white/50 uppercase tracking-wider">Target Audience</label>
                        <p class="text-sm mt-1">${entity.targetAudience.join(', ')}</p>
                    </div>

                    <div>
                        <label class="text-xs text-white/50 uppercase tracking-wider">Content Pillars</label>
                        <p class="text-sm mt-1">${entity.contentPillars.join(' | ')}</p>
                    </div>
                </div>

                <div class="mt-6">
                    <label class="text-xs text-white/50 uppercase tracking-wider">Hashtags</label>
                    <p class="text-sm mt-1 font-mono">${entity.hashtags.join(' ')}</p>
                </div>
            </div>

            ${renderPasswordSection(entity)}
            ${renderTOTPSection(entity)}
            ${renderNotesSection(entity)}
            ${renderResourcesSection()}
        </div>
    `;
}

function renderPasswordSection(entity) {
    return `
        <div class="cyber-border rounded-lg p-4 sm:p-6 mb-6 fade-in">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl sm:text-2xl font-bold uppercase tracking-wider">PASSWORDS</h2>
                <button onclick="showAddPasswordModal()" class="mono-button px-4 py-2 rounded text-sm">ADD PASSWORD</button>
            </div>

            <div id="passwords-list" class="space-y-3">
                ${renderPasswords(entity)}
            </div>
        </div>
    `;
}

function renderTOTPSection(entity) {
    return `
        <div class="cyber-border rounded-lg p-4 sm:p-6 mb-6 fade-in">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl sm:text-2xl font-bold uppercase tracking-wider">2FA CODES</h2>
                <button onclick="showAddTOTPModal()" class="mono-button px-4 py-2 rounded text-sm">ADD TOTP</button>
            </div>

            <div id="totp-list" class="space-y-3">
                ${renderTOTP(entity)}
            </div>
        </div>
    `;
}

function renderNotesSection(entity) {
    return `
        <div class="cyber-border rounded-lg p-4 sm:p-6 mb-6 fade-in">
            <h2 class="text-xl sm:text-2xl font-bold mb-6 uppercase tracking-wider">NOTES</h2>
            <textarea
                id="notes-textarea"
                class="mono-input w-full h-32 px-4 py-3 rounded text-white resize-none font-mono"
                placeholder="Add notes about this entity..."
                onchange="updateNotes(this.value)"
            >${entity.notes || ''}</textarea>
        </div>
    `;
}

function renderResourcesSection() {
    return `
        <div class="cyber-border rounded-lg p-4 sm:p-6 fade-in">
            <h2 class="text-xl sm:text-2xl font-bold mb-6 uppercase tracking-wider">CONTENT RESOURCES</h2>
            <div class="space-y-2">
                <a href="https://chat.openai.com/" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">ChatGPT</p>
                    <p class="text-xs text-white/60">AI assistant for text, ideas, and content generation.</p>
                </a>
                <a href="https://deepai.org/machine-learning-model/text2img" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">DeepAI Text2Img</p>
                    <p class="text-xs text-white/60">Free AI tool to generate images from text prompts.</p>
                </a>
                <a href="https://www.photoeditor.com/" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">PhotoEditor.com</p>
                    <p class="text-xs text-white/60">Browser-based tool for quick photo editing and adjustments.</p>
                </a>
                <a href="https://pixoate.com/photo-effects" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">Pixoate</p>
                    <p class="text-xs text-white/60">Apply a wide range of artistic effects and filters to photos.</p>
                </a>
                <a href="https://www.pexels.com/" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">Pexels</p>
                    <p class="text-xs text-white/60">Free high-quality stock photos and videos.</p>
                </a>
                <a href="https://unsplash.com/" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">Unsplash</p>
                    <p class="text-xs text-white/60">A large collection of freely-usable high-resolution images.</p>
                </a>
                <a href="https://pixabay.com/" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">Pixabay</p>
                    <p class="text-xs text-white/60">Vast library of free stock images, videos, and music.</p>
                </a>
                <a href="https://imgflip.com/memegenerator" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">Imgflip</p>
                    <p class="text-xs text-white/60">The web's most popular meme generator.</p>
                </a>
                <a href="https://www.reddit.com/search/" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">Reddit</p>
                    <p class="text-xs text-white/60">A massive source of communities, discussion, and content.</p>
                </a>
                <a href="https://cnvmp3.com/v33" target="_blank" class="block p-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                    <p class="font-semibold text-sm">CNVMP3</p>
                    <p class="text-xs text-white/60">Download social media videos as MP3 or MP4 files.</p>
                </a>
            </div>
        </div>
    `;
}
function editField(fieldName, fieldType, options = null) {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity) return;

    editingField = { name: fieldName, type: fieldType };
    const modal = document.getElementById('edit-field-modal');
    const title = document.getElementById('edit-field-title');
    const content = document.getElementById('edit-field-content');

    title.textContent = `Edit ${fieldName.replace(/([A-Z])/g, ' $1').trim()}`;

    let currentValue = entity[fieldName];
    let inputHTML = '';

    switch (fieldType) {
        case 'text':
            inputHTML = `<input type="text" id="edit-field-input" class="mono-input w-full px-4 py-2 rounded text-white" value="${currentValue || ''}">`;
            break;

        case 'textarea':
            inputHTML = `<textarea id="edit-field-input" class="mono-input w-full h-32 px-4 py-3 rounded text-white resize-none">${currentValue || ''}</textarea>`;
            break;

        case 'select':
            const selectOptions = JSON.parse(options.replace(/&quot;/g, '"'));
            inputHTML = `
                <select id="edit-field-input" class="mono-input w-full px-4 py-2 rounded text-white">
                    ${selectOptions.map(opt => `<option value="${opt}" ${currentValue === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            `;
            break;

        case 'multiselect':
            const multiOptions = JSON.parse(options.replace(/&quot;/g, '"'));
            const currentValues = Array.isArray(currentValue) ? currentValue : [];
            inputHTML = `
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${multiOptions.map(opt => `
                        <label class="flex items-center p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer">
                            <input type="checkbox" value="${opt}" ${currentValues.includes(opt) ? 'checked' : ''} class="mr-3 multiselect-option">
                            <span class="text-sm">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            break;

        case 'tags':
            const tagsValue = Array.isArray(currentValue) ? currentValue.join(', ') : '';
            inputHTML = `
                <input type="text" id="edit-field-input" class="mono-input w-full px-4 py-2 rounded text-white"
                       value="${tagsValue}" placeholder="Enter tags separated by commas">
                <p class="text-xs text-white/50 mt-2">Separate tags with commas</p>
            `;
            break;

        case 'address':
            const addr = currentValue || {};
            inputHTML = `
                <div class="space-y-3">
                    <input type="text" id="edit-street" class="mono-input w-full px-4 py-2 rounded text-white"
                           placeholder="Street" value="${addr.street || ''}">
                    <div class="grid grid-cols-2 gap-3">
                        <input type="text" id="edit-suburb" class="mono-input px-4 py-2 rounded text-white"
                               placeholder="Suburb" value="${addr.suburb || ''}">
                        <input type="text" id="edit-postcode" class="mono-input px-4 py-2 rounded text-white"
                               placeholder="Postcode" value="${addr.postcode || ''}">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <input type="text" id="edit-state" class="mono-input px-4 py-2 rounded text-white"
                               placeholder="State" value="${addr.state || ''}">
                        <input type="text" id="edit-country" class="mono-input px-4 py-2 rounded text-white"
                               placeholder="Country" value="${addr.country || ''}">
                    </div>
                </div>
            `;
            break;
    }

    content.innerHTML = inputHTML;
    modal.classList.remove('hidden');

    setTimeout(() => {
        const input = document.getElementById('edit-field-input');
        if (input) input.focus();
    }, 100);
}

function saveEditedField() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || !editingField) return;

    let newValue;

    switch (editingField.type) {
        case 'text':
        case 'textarea':
        case 'select':
            newValue = document.getElementById('edit-field-input').value;
            break;

        case 'multiselect':
            newValue = Array.from(document.querySelectorAll('.multiselect-option:checked'))
                .map(cb => cb.value);
            break;

        case 'tags':
            newValue = document.getElementById('edit-field-input').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            break;

        case 'address':
            const street = document.getElementById('edit-street').value;
            const suburb = document.getElementById('edit-suburb').value;
            const postcode = document.getElementById('edit-postcode').value;
            const state = document.getElementById('edit-state').value;
            const country = document.getElementById('edit-country').value;

            newValue = {
                street,
                suburb,
                state,
                postcode,
                country,
                full: `${street}, ${suburb}, ${state} ${postcode}, ${country}`
            };
            break;
    }

    if (editingField.name === 'fullName') {
        const parts = newValue.split(' ');
        entity.firstName = parts[0] || '';
        entity.lastName = parts.slice(1).join(' ') || '';
    }

    entity[editingField.name] = newValue;

    if (editingField.name === 'birthday') {
        entity.age = calculateAge(newValue);
    }

    markAsChanged();
    renderContent();
    closeEditFieldModal();
    showNotification('FIELD UPDATED', 'success');
}

function closeEditFieldModal() {
    document.getElementById('edit-field-modal').classList.add('hidden');
    editingField = null;
}

async function generateProfilePhoto() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || entity.type !== 'person') return;

    const photoContainer = document.getElementById('photo-container');
    if (photoContainer) {
        photoContainer.innerHTML = `
            <div class="w-full h-full bg-black flex items-center justify-center">
                <div class="loading-spinner"></div>
            </div>
        `;
    }

    showNotification('GENERATING PHOTO...', 'info');

    try {
        const response = await fetch(`/api/generate-face?timestamp=${Date.now()}`);
        const blob = await response.blob();

        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);

        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const outputSize = 512;
            canvas.width = outputSize;
            canvas.height = outputSize;
            const ctx = canvas.getContext('2d');

            const scale = (outputSize + 25) / Math.max(img.width, img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = (outputSize - scaledWidth) / 2;
            const offsetY = (outputSize - scaledHeight) / 2;

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, outputSize, outputSize);

            ctx.drawImage(
                img,
                0, 0, img.width, img.height,
                offsetX, offsetY, scaledWidth, scaledHeight
            );

            entity.profilePhoto = canvas.toDataURL('image/jpeg', 0.95);
            entity.profilePhotoLocked = false;

            URL.revokeObjectURL(objectUrl);

            markAsChanged();
            renderContent();
            showNotification('PHOTO GENERATED', 'success');
        };

        img.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            generateFallbackAvatar(entity);
        };

        img.src = objectUrl;

    } catch (error) {
        generateFallbackAvatar(entity);
    }
}

function generateFallbackAvatar(entity) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 510, 510);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const initials = entity.type === 'person'
        ? (entity.firstName[0] + entity.lastName[0])
        : entity.pageName.substring(0, 2).toUpperCase();

    ctx.fillText(initials, 256, 256);

    entity.profilePhoto = canvas.toDataURL('image/jpeg', 0.9);
    entity.profilePhotoLocked = false;
    markAsChanged();
    renderContent();
    showNotification('FALLBACK AVATAR GENERATED', 'warning');
}

function lockProfilePhoto() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || !entity.profilePhoto) return;

    entity.profilePhotoLocked = true;
    markAsChanged();
    downloadPhoto();
    renderContent();
    showNotification('PHOTO LOCKED & SAVED', 'success');
}

function downloadPhoto() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || !entity.profilePhoto) return;

    const link = document.createElement('a');
    const name = entity.type === 'person' ? entity.fullName : entity.pageName;
    link.download = `${name.replace(/\s+/g, '_')}_photo.jpg`;
    link.href = entity.profilePhoto;
    link.click();
    showNotification('PHOTO DOWNLOADED', 'success');
}

function renderPasswords(entity) {
    if (!entity.passwords || entity.passwords.length === 0) {
        return '<p class="text-white/30 uppercase tracking-wider text-sm">No passwords saved</p>';
    }

    return entity.passwords.map((pwd, index) => `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white/5 border border-white/10 rounded gap-2">
            <div class="flex-1">
                <p class="font-semibold text-sm sm:text-base">${pwd.service}</p>
                <p class="text-xs sm:text-sm text-white/50 font-mono">${pwd.username}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="copyPassword(${index})" class="mono-button-secondary px-2 sm:px-3 py-1 rounded text-xs sm:text-sm">COPY</button>
                <button onclick="showPasswordValue(${index})" class="mono-button-secondary px-2 sm:px-3 py-1 rounded text-xs sm:text-sm">VIEW</button>
                <button onclick="deletePassword(${index})" class="text-red-500 hover:text-red-400">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function renderTOTP(entity) {
    if (!entity.totpSecrets || entity.totpSecrets.length === 0) {
        return '<p class="text-white/30 uppercase tracking-wider text-sm">No TOTP configured</p>';
    }

    return entity.totpSecrets.map((totp, index) => `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 border border-white/10 rounded gap-4">
            <div class="flex-1">
                <p class="font-semibold mb-2">${totp.service}</p>
                <div class="flex items-center space-x-4">
                    <span class="totp-display font-mono" id="totp-code-${index}">------</span>
                    <div class="relative w-10 h-10">
                        <svg class="progress-ring w-10 h-10">
                            <circle cx="20" cy="20" r="18" stroke="rgba(255, 255, 255, 0.1)" stroke-width="2" fill="none"/>
                            <circle id="totp-progress-${index}" cx="20" cy="20" r="18" stroke="#ffffff" stroke-width="2" fill="none"
                                stroke-dasharray="113" stroke-dashoffset="113"/>
                        </svg>
                    </div>
                    <button onclick="copyTOTPCode(${index})" class="mono-button-secondary px-2 sm:px-3 py-1 rounded text-xs sm:text-sm">COPY</button>
                </div>
            </div>
            <button onclick="deleteTOTP(${index})" class="text-red-500 hover:text-red-400">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

function exportAsCSV() {
    if (entities.length === 0) {
        showNotification('NO ENTITIES TO EXPORT', 'warning');
        return;
    }

    const headers = [
        'Type', 'Name/Page', 'Username/Handle', 'Gender', 'Age', 'Birthday',
        'Favorite Color', 'Occupation', 'Education', 'Address', 'Interests',
        'Linguistic Features', 'Theme', 'Description', 'Target Audience',
        'Passwords', 'TOTP Secrets', 'Notes', 'Created At'
    ];

    let csv = headers.join(',') + '\n';

    entities.forEach(entity => {
        const row = [];

        row.push(entity.type);
        row.push(entity.type === 'person' ? entity.fullName : entity.pageName);
        row.push(entity.type === 'person' ? entity.username : entity.handle);
        row.push(entity.gender || '');
        row.push(entity.age || '');
        row.push(entity.birthday || '');
        row.push(entity.favoriteColor || '');
        row.push(entity.occupation || '');
        row.push(entity.education || '');
        row.push(entity.address ? entity.address.full : '');
        row.push(entity.interests ? entity.interests.join('; ') : '');
        row.push(entity.linguisticFeatures ? entity.linguisticFeatures.join('; ') : '');
        row.push(entity.theme || '');
        row.push(entity.description || '');
        row.push(entity.targetAudience ? entity.targetAudience.join('; ') : '');

        const passwords = entity.passwords ? entity.passwords.map(p =>
            `${p.service}:${p.username}:${atob(p.password)}`
        ).join(' | ') : '';
        row.push(`"${passwords}"`);

        const totps = entity.totpSecrets ? entity.totpSecrets.map(t =>
            `${t.service}:${t.secret}`
        ).join(' | ') : '';
        row.push(`"${totps}"`);

        row.push(`"${entity.notes || ''}"`);
        row.push(entity.createdAt);

        csv += row.map(field => {
            if (typeof field === 'string' && field.includes(',')) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        }).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ward_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('CSV EXPORTED', 'success');
}

function copyAsText() {
    if (entities.length === 0) {
        showNotification('NO ENTITIES TO COPY', 'warning');
        return;
    }

    let text = 'WARD IDENTITY EXPORT\n';
    text += '=' .repeat(50) + '\n\n';

    entities.forEach((entity, idx) => {
        text += `[${idx + 1}] ${entity.type.toUpperCase()}\n`;
        text += '-'.repeat(30) + '\n';

        if (entity.type === 'person') {
            text += `Name: ${entity.fullName}\n`;
            text += `Username: ${entity.username}\n`;
            text += `Gender: ${entity.gender}\n`;
            text += `Age: ${entity.age} (Born: ${entity.birthday})\n`;
            text += `Favorite Color: ${entity.favoriteColor}\n`;
            text += `Occupation: ${entity.occupation}\n`;
            text += `Education: ${entity.education}\n`;
            text += `Address: ${entity.address.full}\n`;
            text += `Interests: ${entity.interests.join(', ')}\n`;
            text += `Linguistic Features: ${entity.linguisticFeatures.join('; ')}\n`;
        } else {
            text += `Page Name: ${entity.pageName}\n`;
            text += `Handle: ${entity.handle}\n`;
            text += `Theme: ${entity.theme}\n`;
            text += `Description: ${entity.description}\n`;
            text += `Target Audience: ${entity.targetAudience.join(', ')}\n`;
            text += `Posting Style: ${entity.postingStyle}\n`;
            text += `Voice Tone: ${entity.voiceTone}\n`;
            text += `Content Pillars: ${entity.contentPillars.join(' | ')}\n`;
            text += `Hashtags: ${entity.hashtags.join(' ')}\n`;
        }

        if (entity.passwords && entity.passwords.length > 0) {
            text += '\nPasswords:\n';
            entity.passwords.forEach(pwd => {
                text += `  - ${pwd.service}: ${pwd.username} / ${atob(pwd.password)}\n`;
            });
        }

        if (entity.totpSecrets && entity.totpSecrets.length > 0) {
            text += '\nTOTP/2FA:\n';
            entity.totpSecrets.forEach(totp => {
                text += `  - ${totp.service}: ${totp.secret}\n`;
            });
        }

        if (entity.notes) {
            text += `\nNotes: ${entity.notes}\n`;
        }

        text += '\n' + '=' .repeat(50) + '\n\n';
    });

    navigator.clipboard.writeText(text);
    showNotification('COPIED TO CLIPBOARD', 'success');
}

function showAddPasswordModal() {
    document.getElementById('add-password-modal').classList.remove('hidden');
    updatePasswordStrength();
}

function closeAddPasswordModal() {
    document.getElementById('add-password-modal').classList.add('hidden');
    document.getElementById('password-service').value = '';
    document.getElementById('password-username').value = '';
    document.getElementById('password-value').value = '';
}

function generatePassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$&?_-';
    let password = '';

    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    document.getElementById('password-value').value = password;
    updatePasswordStrength();
}

function togglePasswordVisibility() {
    const input = document.getElementById('password-value');
    const eye = document.getElementById('password-eye');

    if (input.type === 'password') {
        input.type = 'text';
        eye.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
        `;
    } else {
        input.type = 'password';
        eye.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        `;
    }
}

function calculatePasswordStrength(password) {
    if (!password) return 0;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    return Math.min(5, Math.ceil(strength * 5 / 6));
}

function updatePasswordStrength() {
    const password = document.getElementById('password-value').value;
    const strength = calculatePasswordStrength(password);

    for (let i = 1; i <= 5; i++) {
        const bar = document.getElementById(`strength-${i}`);
        if (i <= strength) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    }
}

function savePassword() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity) return;

    const service = document.getElementById('password-service').value;
    const username = document.getElementById('password-username').value;
    const password = document.getElementById('password-value').value;

    if (!service || !username || !password) {
        showNotification('FILL ALL FIELDS', 'error');
        return;
    }

    if (!entity.passwords) entity.passwords = [];

    entity.passwords.push({
        service,
        username,
        password: btoa(password)
    });

    markAsChanged();
    renderContent();
    closeAddPasswordModal();
    showNotification('PASSWORD SAVED', 'success');
}

function showPasswordValue(index) {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || !entity.passwords[index]) return;

    const pwd = entity.passwords[index];
    const password = atob(pwd.password);

    showNotification(`PASSWORD: ${password}`, 'info', { preserveCase: true });
}

function copyPassword(index) {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || !entity.passwords[index]) return;

    const password = atob(entity.passwords[index].password);
    navigator.clipboard.writeText(password);
    showNotification('PASSWORD COPIED', 'success');
}

function deletePassword(index) {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity) return;

    entity.passwords.splice(index, 1);
    markAsChanged();
    renderContent();
    showNotification('PASSWORD DELETED', 'success');
}

function showAddTOTPModal() {
    document.getElementById('add-totp-modal').classList.remove('hidden');
}

function closeAddTOTPModal() {
    document.getElementById('add-totp-modal').classList.add('hidden');
    document.getElementById('totp-service').value = '';
    document.getElementById('totp-secret').value = '';
}

function saveTOTP() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity) return;

    const service = document.getElementById('totp-service').value;
    const secret = document.getElementById('totp-secret').value;

    if (!service || !secret) {
        showNotification('FILL ALL FIELDS', 'error');
        return;
    }

    if (!entity.totpSecrets) entity.totpSecrets = [];

    entity.totpSecrets.push({
        service,
        secret
    });

    markAsChanged();
    renderContent();
    closeAddTOTPModal();
    showNotification('TOTP ADDED', 'success');
}

function deleteTOTP(index) {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity) return;

    entity.totpSecrets.splice(index, 1);
    markAsChanged();
    renderContent();
    showNotification('TOTP REMOVED', 'success');
}

function copyTOTPCode(index) {
    const codeElement = document.getElementById(`totp-code-${index}`);
    if (codeElement) {
        navigator.clipboard.writeText(codeElement.textContent);
        showNotification('CODE COPIED', 'success');
    }
}

function generateTOTPCode(secret) {
    const time = Math.floor(Date.now() / 1000 / 30);
    const key = base32ToHex(secret);
    const message = time.toString(16).padStart(16, '0');

    const hash = CryptoJS.HmacSHA1(
        CryptoJS.enc.Hex.parse(message),
        CryptoJS.enc.Hex.parse(key)
    );

    const offset = parseInt(hash.toString().substr(-1), 16);
    const binary = parseInt(hash.toString().substr(offset * 2, 8), 16) & 0x7fffffff;
    const otp = (binary % 1000000).toString().padStart(6, '0');

    return otp;
}

function base32ToHex(base32) {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let hex = '';

    for (let i = 0; i < base32.length; i++) {
        const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }

    for (let i = 0; i + 4 <= bits.length; i += 4) {
        const chunk = bits.substr(i, 4);
        hex += parseInt(chunk, 2).toString(16);
    }

    return hex;
}

let totpInterval = null;

function startTOTPTimers() {
    if (totpInterval) clearInterval(totpInterval);

    updateTOTPCodes();
    totpInterval = setInterval(updateTOTPCodes, 1000);
}

function updateTOTPCodes() {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity || !entity.totpSecrets) return;

    const timeRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    const progress = (timeRemaining / 30) * 113;

    entity.totpSecrets.forEach((totp, index) => {
        const codeElement = document.getElementById(`totp-code-${index}`);
        const progressElement = document.getElementById(`totp-progress-${index}`);

        if (codeElement) {
            try {
                const code = generateTOTPCode(totp.secret);
                codeElement.textContent = code;
            } catch (error) {
                codeElement.textContent = 'ERROR';
            }
        }

        if (progressElement) {
            progressElement.style.strokeDashoffset = (113 - progress).toString();
        }
    });
}

function updateNotes(value) {
    const entity = entities.find(e => e.id === currentEntityId);
    if (!entity) return;

    entity.notes = value;
    markAsChanged();
}

function exportFile() {
    document.getElementById('export-modal').classList.remove('hidden');
    document.getElementById('export-filename').value = `ward_${new Date().toISOString().split('T')[0]}.ward`;
}

function closeExportModal() {
    document.getElementById('export-modal').classList.add('hidden');
}

function confirmExport() {
    const filename = document.getElementById('export-filename').value;
    if (!filename) {
        showNotification('ENTER FILENAME', 'error');
        return;
    }

    closeExportModal();
    showPasswordModal(async (password) => {
        showNotification('ENCRYPTING FILE...', 'info');
        try {
            const encryptedBlob = await encryptData(entities, password);
            const blob = new Blob([encryptedBlob], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename.endsWith('.ward') ? filename : filename + '.ward';
            a.click();
            URL.revokeObjectURL(url);
            markAsSaved();
            showNotification('FILE EXPORTED', 'success');
        } catch (error) {
            showNotification('ENCRYPTION FAILED', 'error');
        }
    });
}


function importFile() {
    const input = document.getElementById('file-input');
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const encryptedBlob = event.target.result;
            showPasswordModal(async (password) => {
                showNotification('DECRYPTING FILE...', 'info');
                try {
                    const decrypted = await decryptData(encryptedBlob, password);
                    entities = decrypted;
                    renderTabs();
                    if (entities.length > 0) {
                        selectEntity(entities[0].id);
                    }
                    markAsSaved();
                    showNotification('FILE IMPORTED', 'success');
                } catch (error) {
                    showNotification('DECRYPT FAILED - WRONG PASSWORD', 'error');
                }
            });
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
}


function showPasswordModal(callback) {
    passwordCallback = callback;
    document.getElementById('password-modal').classList.remove('hidden');
    document.getElementById('modal-password').focus();
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.add('hidden');
    document.getElementById('modal-password').value = '';
    passwordCallback = null;
}

function confirmPassword() {
    const password = document.getElementById('modal-password').value;
    if (!password) {
        showNotification('ENTER PASSWORD', 'error');
        return;
    }

    if (passwordCallback) {
        passwordCallback(password);
    }
    closePasswordModal();
}

function showHelpModal() {
    document.getElementById('help-modal').classList.remove('hidden');
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.add('hidden');
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 's':
                    e.preventDefault();
                    exportFile();
                    break;
                case 'o':
                    e.preventDefault();
                    importFile();
                    break;
                case 'n':
                    e.preventDefault();
                    showNewEntityModal();
                    break;
                case 'e':
                    e.preventDefault();
                    exportAsCSV();
                    break;
                case 'c':
                    if (e.shiftKey) {
                        e.preventDefault();
                        copyAsText();
                    }
                    break;
            }
        }

        if (e.key === 'Escape') {
            closePasswordModal();
            closeAddPasswordModal();
            closeAddTOTPModal();
            closeNewEntityModal();
            closeExportModal();
            closeHelpModal();
            closeEditFieldModal();
        }
    });

    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupKeyboardShortcuts();

    const passwordInput = document.getElementById('password-value');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordStrength);
    }
});
