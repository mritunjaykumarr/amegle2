// --- CONFIGURATION ---
const videoList = [
    'videos/sample1.mp4',
    'videos/sample2.mp4',
    'videos/sample3.mp4',
    // Add paths up to 100...
];

let currentVideoIndex = 0;
let callTimer;
let secondsElapsed = 0;
let userMediaStream = null;
let chatTimers = [];
let isPremiumLocked = false;

// --- DOM ELEMENTS ---
const navbar = document.querySelector('.navbar');
const footer = document.querySelector('.footer');
const landingPage = document.getElementById('landing-page');
const callScreen = document.getElementById('call-screen');
const startBtn = document.getElementById('start-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const loadingOverlay = document.getElementById('loading-overlay');
const paywall = document.getElementById('paywall');
const chatMessages = document.getElementById('chat-messages');
const timerDisplay = document.getElementById('call-timer');
const nextBtn = document.getElementById('next-call');

// --- CUSTOM COUNTRY GRID LOGIC ---
const countryDropdown = document.getElementById('country-dropdown');
const selectedBox = countryDropdown.querySelector('.selected-option');
const grid = countryDropdown.querySelector('.options-grid');
const countryOptions = countryDropdown.querySelectorAll('.option');

selectedBox.addEventListener('click', (e) => {
    e.stopPropagation();
    grid.classList.toggle('hidden');
    const icon = selectedBox.querySelector('i');
    if (icon) icon.style.transform = grid.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
});

countryOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        const flag = opt.querySelector('.flag') ? opt.querySelector('.flag').innerText : '';
        const name = opt.querySelector('.c-name') ? opt.querySelector('.c-name').innerText : opt.innerText;
        
        selectedBox.querySelector('span').innerHTML = `${flag} ${name}`;
        countryDropdown.setAttribute('data-selected', opt.getAttribute('data-value'));
        grid.classList.add('hidden');
        if (selectedBox.querySelector('i')) selectedBox.querySelector('i').style.transform = 'rotate(0deg)';
    });
});

window.addEventListener('click', () => {
    grid.classList.add('hidden');
    if (selectedBox.querySelector('i')) selectedBox.querySelector('i').style.transform = 'rotate(0deg)';
});

// --- CORE APP LOGIC ---

// Initialize the 3D state
window.addEventListener('DOMContentLoaded', () => {
    remoteVideo.classList.add('slide-active');
});

startBtn.addEventListener('click', async () => {
    const nameInput = document.getElementById('username');
    const name = nameInput.value.trim() || "Guest";
    document.getElementById('display-name').innerText = name;
    
    try {
        // Request Camera & Mic
        userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = userMediaStream;
        
        // Remove Nav and Footer for immersion
        if(navbar) navbar.style.display = 'none';
        if(footer) footer.style.display = 'none';

        landingPage.classList.add('hidden');
        callScreen.classList.remove('hidden');

        initiateVideoCall(name);

        // START THE PAYWALL TIMER (35 seconds)
        setTimeout(triggerPaywall, 35000); 

    } catch (err) {
        alert("Camera and Microphone access is required to start the call.");
        console.error(err);
    }
});

function initiateVideoCall(name) {
    if (isPremiumLocked) return;

    loadingOverlay.classList.remove('hidden');
    remoteVideo.style.opacity = "0";
    
    setTimeout(() => {
        loadingOverlay.classList.add('hidden');
        remoteVideo.style.opacity = "1";
        remoteVideo.play().catch(e => console.log("Auto-play prevented"));
        remoteVideo.muted = false; 
        
        if (!callTimer) startCallTimer();
        startAutoChat(name);
    }, 2000);
}

// Next Button with 3D Slide Transition
nextBtn.addEventListener('click', () => {
    if (isPremiumLocked) return;

    // 1. Start Slide Out Animation
    remoteVideo.classList.remove('slide-active');
    remoteVideo.classList.add('slide-out');

    setTimeout(() => {
        remoteVideo.pause();
        clearChat();
        
        // Change Video Source
        currentVideoIndex = (currentVideoIndex + 1) % videoList.length;
        remoteVideo.src = videoList[currentVideoIndex];
        
        // 2. Prepare Slide In
        remoteVideo.classList.remove('slide-out');
        remoteVideo.classList.add('slide-in-prepare');

        void remoteVideo.offsetWidth; // Force reflow

        loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            remoteVideo.classList.remove('slide-in-prepare');
            remoteVideo.classList.add('slide-active');
            
            remoteVideo.play();
            remoteVideo.muted = false;
            startAutoChat(document.getElementById('display-name').innerText);
        }, 800); 

    }, 600); 
});

// Timer & Chat Functions
function startCallTimer() {
    callTimer = setInterval(() => {
        secondsElapsed++;
        let mins = Math.floor(secondsElapsed / 60);
        let secs = secondsElapsed % 60;
        timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function startAutoChat(name) {
    const messages = [
        { text: `Hey ${name} 😊`, delay: 3000 },
        { text: `How are you?`, delay: 8000 },
        { text: `Where are you calling from?`, delay: 14000 }
    ];

    messages.forEach(msg => {
        let t = setTimeout(() => {
            if (!isPremiumLocked) appendMessage(msg.text, 'remote');
        }, msg.delay);
        chatTimers.push(t);
    });
}

function clearChat() {
    chatMessages.innerHTML = '';
    chatTimers.forEach(t => clearTimeout(t));
    chatTimers = [];
}

function appendMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${type === 'user' ? 'user-msg' : ''}`;
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// User Message Input
document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    if (input.value.trim() !== "") {
        appendMessage(input.value, 'user');
        input.value = "";
    }
});

// Paywall System
function triggerPaywall() {
    isPremiumLocked = true;
    
    // 1. Kill streams
    if (userMediaStream) {
        userMediaStream.getTracks().forEach(track => track.stop());
    }

    // 2. Stop everything
    remoteVideo.pause();
    clearInterval(callTimer);
    clearChat();

    // 3. UI Blur and Lockdown
    document.getElementById('remote-container').style.filter = "blur(15px)";
    document.getElementById('local-container').style.filter = "blur(15px)";
    document.getElementById('chat-box').style.display = "none";
    document.querySelector('.controls').style.display = "none";

    // 4. Reveal Paywall
    const paywallModal = document.getElementById('paywall');
    paywallModal.classList.remove('hidden');
    paywallModal.style.display = "flex"; 
}