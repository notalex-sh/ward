let aliases = [];
let currentAliasId = null;
let passwordCallback = null;
let pendingAliasData = null;
let hasUnsavedChanges = false;
let lastExportedState = null;
let isAuthenticated = false;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
});

// authentication
function checkAuthentication() {
    if (!isAuthenticated) {
        document.getElementById('password-gate-modal').classList.remove('hidden');
        document.getElementById('gate-password').focus();
    } else {
        initializeApp();
    }
}

async function verifySystemPassword() {
    const password = document.getElementById('gate-password').value;
    
    try {
        const response = await fetch('/api/verify-system-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.authenticated) {
            isAuthenticated = true;
            document.getElementById('password-gate-modal').classList.add('hidden');
            initializeApp();
        } else {
            document.getElementById('gate-error').classList.remove('hidden');
            document.getElementById('gate-password').value = '';
        }
    } catch (error) {
        document.getElementById('gate-error').classList.remove('hidden');
        document.getElementById('gate-password').value = '';
    }
}

function initializeApp() {
    lastExportedState = JSON.stringify(aliases);
}

function showHelpModal() {
    document.getElementById('help-modal').classList.remove('hidden');
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.add('hidden');
}

function markAsChanged() {
    hasUnsavedChanges = true;
    const currentState = JSON.stringify(aliases);
    if (currentState !== lastExportedState) {
        document.getElementById('unsaved-warning').classList.remove('hidden');
    } else {
        document.getElementById('unsaved-warning').classList.add('hidden');
    }
}

function markAsSaved() {
    hasUnsavedChanges = false;
    lastExportedState = JSON.stringify(aliases);
    document.getElementById('unsaved-warning').classList.add('hidden');
}

// notifications
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const colors = {
        success: 'border-green-500 bg-green-500/10',
        error: 'border-red-500 bg-red-500/10',
        warning: 'border-yellow-500 bg-yellow-500/10',
        info: 'border-white bg-white/10'
    };
    
    notification.className = `${colors[type]} border px-4 py-3 rounded flex items-center space-x-2 transition-all transform translate-x-full backdrop-blur-sm`;
    notification.innerHTML = `
        <span class="text-sm uppercase tracking-wider">${message}</span>
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

// alias management etc
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function showNewAliasModal() {
    const aliasData = await fetchAliasData();
    pendingAliasData = aliasData;
    
    document.getElementById('new-alias-modal').classList.remove('hidden');
    updatePreview(aliasData);
}

async function regeneratePreview() {
    const aliasData = await fetchAliasData();
    pendingAliasData = aliasData;
    updatePreview(aliasData);
}

function updatePreview(data) {
    const previewContent = document.getElementById('preview-content');

    const usernames = generateUsernames(data.firstName, data.lastName, data.birthday);
    
    previewContent.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="text-xs text-white/50 uppercase tracking-wider">Name</label>
                <p class="text-lg font-semibold">${data.fullName}</p>
            </div>
            <div>
                <label class="text-xs text-white/50 uppercase tracking-wider">Gender</label>
                <p class="text-lg">${data.gender}</p>
            </div>
            <div>
                <label class="text-xs text-white/50 uppercase tracking-wider">Birthday</label>
                <p class="text-lg">${data.birthday}</p>
            </div>
            <div>
                <label class="text-xs text-white/50 uppercase tracking-wider">Age</label>
                <p class="text-lg">${calculateAge(data.birthday)} years</p>
            </div>
        </div>
        
        <div class="mt-4">
            <label class="text-xs text-white/50 uppercase tracking-wider">Address</label>
            <p class="text-sm mt-1">${data.address.street}</p>
            <p class="text-sm">${data.address.suburb}, ${data.address.state} ${data.address.postcode}</p>
            <p class="text-sm">${data.address.country}</p>
        </div>
        
        <div class="mt-4">
            <label class="text-xs text-white/50 uppercase tracking-wider mb-2 block">Select Username</label>
            <div class="space-y-2">
                ${usernames.map((username, index) => `
                    <label class="flex items-center p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer transition-colors">
                        <input type="radio" name="username-option" value="${username}" ${index === 0 ? 'checked' : ''} class="mr-3">
                        <span class="font-mono">${username}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
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

function closeNewAliasModal() {
    document.getElementById('new-alias-modal').classList.add('hidden');
    pendingAliasData = null;
}

async function confirmNewAlias() {
    const selected = document.querySelector('input[name="username-option"]:checked');
    if (!selected || !pendingAliasData) return;
    
    const alias = {
        id: generateUUID(),
        ...pendingAliasData,
        username: selected.value,
        profilePhoto: null,
        profilePhotoLocked: false,
        passwords: [],
        totpSecrets: [],
        notes: '',
        createdAt: new Date().toISOString()
    };
    
    aliases.push(alias);
    renderTabs();
    selectAlias(alias.id);
    markAsChanged();
    closeNewAliasModal();
    showNotification('NEW IDENTITY CREATED', 'success');
    
    setTimeout(() => generateProfilePhoto(), 500);
}

function generateUsernames(firstName, lastName, birthday) {
    const usernames = [];
    const year = birthday.split('-')[0].slice(-2);
    const birthYear = birthday.split('-')[0];
    const birthMonth = birthday.split('-')[1];
    const birthDay = birthday.split('-')[2];
    
    const patterns = [
        `${firstName.toLowerCase()}${lastName.toLowerCase()}${year}`,
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
        `${firstName[0].toLowerCase()}${lastName.toLowerCase()}${birthYear}`,
        `${firstName.toLowerCase()}${birthMonth}${birthDay}`,
    ];
    
    return patterns;
}

async function fetchAliasData() {
    try {
        const response = await fetch('/api/generate-alias');
        const data = await response.json();
        return data;
    } catch (error) {
        return generateLocalAlias();
    }
}

function generateLocalAlias() {
    const firstNames = {
        male: ['James', 'William', 'Oliver', 'Jack', 'Noah'],
        female: ['Charlotte', 'Amelia', 'Olivia', 'Isla', 'Mia']
    };
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    const suburbs = ['Perth', 'Fremantle', 'Joondalup', 'Rockingham', 'Mandurah'];
    
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = firstNames[gender][Math.floor(Math.random() * 5)];
    const lastName = lastNames[Math.floor(Math.random() * 5)];
    const birthYear = 1970 + Math.floor(Math.random() * 35);
    const birthMonth = Math.floor(Math.random() * 12 + 1);
    const birthDay = Math.floor(Math.random() * 28 + 1);
    
    return {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        gender,
        birthday: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
        address: {
            street: '123 Example Street',
            suburb: suburbs[Math.floor(Math.random() * 5)],
            state: 'WA',
            postcode: '6000',
            country: 'Australia',
            full: '123 Example Street, Perth, WA 6000, Australia'
        }
    };
}

function selectAlias(id) {
    currentAliasId = id;
    renderTabs();
    renderContent();
}

function deleteAlias(id) {
    if (!confirm('Delete this alias permanently?')) return;
    
    aliases = aliases.filter(a => a.id !== id);
    if (currentAliasId === id) {
        selectAlias(aliases[0].id);
    }
    renderTabs();
    markAsChanged();
    showNotification('ALIAS DELETED', 'success');
}

// 5ab rendering
function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    
    aliases.forEach(alias => {
        const tab = document.createElement('div');
        tab.className = `flex items-center px-4 py-2 hover:bg-white/10 transition-colors cursor-pointer ${
            alias.id === currentAliasId ? 'tab-active' : ''
        }`;
        tab.onclick = () => selectAlias(alias.id);
        
        tab.innerHTML = `
            <span class="mr-2 font-mono">${alias.fullName}</span>
            <button onclick="event.stopPropagation(); deleteAlias('${alias.id}')" class="ml-2 text-white/50 hover:text-red-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        
        container.appendChild(tab);
    });
}

// content rendering
function renderContent() {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    const container = document.getElementById('content-container');
    container.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <!-- Profile Section -->
            <div class="cyber-border rounded-lg p-6 mb-6">
                <h2 class="text-2xl font-bold mb-6 uppercase tracking-wider">IDENTITY PROFILE</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Photo Section -->
                    <div class="flex flex-col items-center">
                        <div id="photo-container" class="profile-frame mb-4 relative w-[256px] h-[256px]">
                            ${alias.profilePhoto ? 
                                `<img src="${alias.profilePhoto}" class="w-full h-full object-cover">` :
                                `<div class="w-full h-full bg-black flex items-center justify-center">
                                    <div class="loading-spinner"></div>
                                </div>`
                            }
                        </div>
                        <div class="space-y-2 w-full max-w-[256px]">
                            ${!alias.profilePhotoLocked ? `
                                <button onclick="generateProfilePhoto()" class="mono-button px-4 py-2 rounded text-sm w-full">GENERATE</button>
                                ${alias.profilePhoto ? `
                                    <button onclick="lockProfilePhoto()" class="mono-button-secondary px-4 py-2 rounded text-sm w-full">LOCK & SAVE</button>
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
                        </div>
                    </div>
                    
                    <!-- Basic Info -->
                    <div class="space-y-3">
                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Full Name</label>
                            <p class="text-lg font-semibold">${alias.fullName}</p>
                        </div>
                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Username</label>
                            <p class="text-lg font-mono">${alias.username || 'NOT SET'}</p>
                        </div>
                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Gender</label>
                            <p class="text-lg">${alias.gender}</p>
                        </div>
                        <div>
                            <label class="text-xs text-white/50 uppercase tracking-wider">Birthday</label>
                            <p class="text-lg">${alias.birthday}</p>
                        </div>
                    </div>
                    
                    <!-- Address -->
                    <div>
                        <label class="text-xs text-white/50 uppercase tracking-wider">Address</label>
                        <p class="text-sm mt-2">${alias.address.street}</p>
                        <p class="text-sm">${alias.address.suburb}, ${alias.address.state} ${alias.address.postcode}</p>
                        <p class="text-sm">${alias.address.country}</p>
                    </div>
                </div>
            </div>
            
            <!-- Password Manager Section -->
            <div class="cyber-border rounded-lg p-6 mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold uppercase tracking-wider">PASSWORDS</h2>
                    <button onclick="showAddPasswordModal()" class="mono-button px-4 py-2 rounded text-sm">ADD PASSWORD</button>
                </div>
                
                <div id="passwords-list" class="space-y-3">
                    ${renderPasswords(alias)}
                </div>
            </div>
            
            <!-- TOTP Section -->
            <div class="cyber-border rounded-lg p-6 mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold uppercase tracking-wider">2FA CODES</h2>
                    <button onclick="showAddTOTPModal()" class="mono-button px-4 py-2 rounded text-sm">ADD TOTP</button>
                </div>
                
                <div id="totp-list" class="space-y-3">
                    ${renderTOTP(alias)}
                </div>
            </div>
            
            <!-- Notes Section -->
            <div class="cyber-border rounded-lg p-6">
                <h2 class="text-2xl font-bold mb-6 uppercase tracking-wider">NOTES</h2>
                <textarea 
                    id="notes-textarea"
                    class="mono-input w-full h-32 px-4 py-3 rounded text-white resize-none font-mono"
                    placeholder="Add notes about this alias..."
                    onchange="updateNotes(this.value)"
                >${alias.notes || ''}</textarea>
            </div>
        </div>
    `;
    
    startTOTPTimers();
}

function renderPasswords(alias) {
    if (!alias.passwords || alias.passwords.length === 0) {
        return '<p class="text-white/30 uppercase tracking-wider">No passwords saved</p>';
    }
    
    return alias.passwords.map((pwd, index) => `
        <div class="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
            <div class="flex-1">
                <p class="font-semibold">${pwd.service}</p>
                <p class="text-sm text-white/50 font-mono">${pwd.username}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="copyPassword(${index})" class="mono-button-secondary px-3 py-1 rounded text-sm">COPY</button>
                <button onclick="showPasswordValue(${index})" class="mono-button-secondary px-3 py-1 rounded text-sm">VIEW</button>
                <button onclick="deletePassword(${index})" class="text-red-500 hover:text-red-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function renderTOTP(alias) {
    if (!alias.totpSecrets || alias.totpSecrets.length === 0) {
        return '<p class="text-white/30 uppercase tracking-wider">No TOTP configured</p>';
    }
    
    return alias.totpSecrets.map((totp, index) => `
        <div class="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded">
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
                    <button onclick="copyTOTPCode(${index})" class="mono-button-secondary px-3 py-1 rounded text-sm">COPY</button>
                </div>
            </div>
            <button onclick="deleteTOTP(${index})" class="text-red-500 hover:text-red-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

// profile photo management
async function generateProfilePhoto() {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    showNotification('GENERATING PHOTO...', 'info');
    
    try {
        const response = await fetch(`/api/generate-face?timestamp=${Date.now()}`);
        const blob = await response.blob();
        
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        
        img.onload = async function() {
            console.log('Original image dimensions:', img.width, 'x', img.height);
            
            const canvas = document.createElement('canvas');
            const outputSize = 512;
            canvas.width = outputSize;
            canvas.height = outputSize;
            const ctx = canvas.getContext('2d');
            
            // calculate scale to fit the entire image and slightly crop it
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
            
            alias.profilePhoto = canvas.toDataURL('image/jpeg', 0.95);
            alias.profilePhotoLocked = false;

            URL.revokeObjectURL(objectUrl);
            
            markAsChanged();
            renderContent();
            showNotification('PHOTO GENERATED', 'success');
        };
        
        img.onerror = function() {
            console.error('Failed to load image from proxy');
            URL.revokeObjectURL(objectUrl);
            generateFallbackAvatar(alias);
        };
        
        img.src = objectUrl;
        
    } catch (error) {
        console.error('Error generating photo:', error);
        generateFallbackAvatar(alias);
    }
}

// fallback avatars kinda eh
function generateFallbackAvatar(alias) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 510, 510);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = alias.firstName[0] + alias.lastName[0];
    ctx.fillText(initials, 256, 256);
    
    alias.profilePhoto = canvas.toDataURL('image/jpeg', 0.9);
    alias.profilePhotoLocked = false;
    markAsChanged();
    renderContent();
    showNotification('FALLBACK AVATAR GENERATED', 'warning');
}

async function lockProfilePhoto() {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias || !alias.profilePhoto) return;
    
    alias.profilePhotoLocked = true;
    markAsChanged();

    downloadPhoto();
    
    renderContent();
    showNotification('PHOTO LOCKED & SAVED', 'success');
}

function downloadPhoto() {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias || !alias.profilePhoto) return;
    
    const link = document.createElement('a');
    link.download = `${alias.fullName.replace(/\s+/g, '_')}_photo.jpg`;
    link.href = alias.profilePhoto;
    link.click();
    showNotification('PHOTO DOWNLOADED', 'success');
}

//password stuff

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
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$&?';
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
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    const service = document.getElementById('password-service').value;
    const username = document.getElementById('password-username').value;
    const password = document.getElementById('password-value').value;
    
    if (!service || !username || !password) {
        showNotification('FILL ALL FIELDS', 'error');
        return;
    }
    
    if (!alias.passwords) alias.passwords = [];
    
    alias.passwords.push({
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
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias || !alias.passwords[index]) return;
    
    const pwd = alias.passwords[index];
    const password = atob(pwd.password);
    
    showNotification(`PASSWORD: ${password}`, 'info');
}

function copyPassword(index) {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias || !alias.passwords[index]) return;
    
    const password = atob(alias.passwords[index].password);
    navigator.clipboard.writeText(password);
    showNotification('PASSWORD COPIED', 'success');
}

function deletePassword(index) {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    alias.passwords.splice(index, 1);
    markAsChanged();
    renderContent();
    showNotification('PASSWORD DELETED', 'success');
}

// TOTP management
function showAddTOTPModal() {
    document.getElementById('add-totp-modal').classList.remove('hidden');
}

function closeAddTOTPModal() {
    document.getElementById('add-totp-modal').classList.add('hidden');
    document.getElementById('totp-service').value = '';
    document.getElementById('totp-secret').value = '';
}

function saveTOTP() {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    const service = document.getElementById('totp-service').value;
    const secret = document.getElementById('totp-secret').value;
    
    if (!service || !secret) {
        showNotification('FILL ALL FIELDS', 'error');
        return;
    }
    
    if (!alias.totpSecrets) alias.totpSecrets = [];
    
    alias.totpSecrets.push({
        service,
        secret
    });
    
    markAsChanged();
    renderContent();
    closeAddTOTPModal();
    showNotification('TOTP ADDED', 'success');
}

function deleteTOTP(index) {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    alias.totpSecrets.splice(index, 1);
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

// TOTP code generation
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
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias || !alias.totpSecrets) return;
    
    const timeRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);
    const progress = (timeRemaining / 30) * 113;
    
    alias.totpSecrets.forEach((totp, index) => {
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

// Notes management
function updateNotes(value) {
    const alias = aliases.find(a => a.id === currentAliasId);
    if (!alias) return;
    
    alias.notes = value;
    markAsChanged();
}


// File operations
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
    showPasswordModal((password) => {
        encryptAndDownload(aliases, password, filename);
        markAsSaved();
    });
}

function importFile() {
    const input = document.getElementById('file-input');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const encryptedData = JSON.parse(event.target.result);
                
                showPasswordModal(async (password) => {
                    try {
                        const decrypted = await decryptData(encryptedData, password);
                        aliases = decrypted;
                        renderTabs();
                        if (aliases.length > 0) {
                            selectAlias(aliases[0].id);
                        }
                        markAsSaved();
                        showNotification('FILE IMPORTED', 'success');
                    } catch (error) {
                        showNotification('DECRYPT FAILED - WRONG PASSWORD', 'error');
                    }
                });
            } catch (error) {
                showNotification('INVALID FILE FORMAT', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// crypto functions

async function encryptAndDownload(data, password, filename) {
    const salt = CryptoJS.lib.WordArray.random(256/8);
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 100000
    });
    
    const iv = CryptoJS.lib.WordArray.random(128/8);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    
    const encryptedData = {
        salt: salt.toString(),
        iv: iv.toString(),
        data: encrypted.toString(),
        iterations: 100000,
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(encryptedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.ward') ? filename : filename + '.ward';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('FILE EXPORTED', 'success');
}

async function decryptData(encryptedData, password) {
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: encryptedData.iterations || 100000
    });
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

// random utils

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

document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password-value');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordStrength);
    }
});

// all the keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isAuthenticated) {
        verifySystemPassword();
        return;
    }
    
    if (!isAuthenticated) return;
    
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
                showNewAliasModal();
                break;
        }
    }
    
    if (e.key === 'Escape') {
        closePasswordModal();
        closeAddPasswordModal();
        closeAddTOTPModal();
        closeNewAliasModal();
        closeExportModal();
        closeHelpModal();
    }
});

window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});