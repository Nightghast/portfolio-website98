/*
 * Windows 98 Style Website Template
 * Based on the original Windows template from HTML5-Templates.com
 * Original: https://html5-templates.com/preview/windows.html
 *
 * TABLE OF CONTENTS
 * 1.  Global State
 * 2.  Window Management (open/close/minimize/maximize/focus)
 * 3.  Taskbar
 * 4.  Desktop Icon Selection
 * 5.  Start Menu
 * 6.  Shutdown Easter Egg (fireworks + goodbye message)
 * 7.  Calculator
 * 8.  Drag & Drop (window dragging)
 * 9.  Clock
 * 10. Theme System
 * 11. Fake Virus Prank
 * 12. Live Stream Chat
 * 13. Live Viewer Count
 * 14. Projects Table
 * 15. Global Event Listeners & Init
 *
 * See "ISSUES FOUND" at the bottom for a few bugs spotted while reorganizing.
 */


/* ==========================================================================
   1. GLOBAL STATE
   ========================================================================== */

let openWindows = new Set();
let activeWindow = null;
let zIndexCounter = 1000;
let draggedElement = null;
let offset = { x: 0, y: 0 };
let selectedIcon = null;

let calcExpression = '';
let calcDisplay = '0';

let currentPreviewTheme = 'default';
let appliedTheme = 'default';

let chatIndex = 0;
let viewerCount = 1284;


/* ==========================================================================
   2. WINDOW MANAGEMENT
   ========================================================================== */

function openWindow(windowId) {
    const windowEl = document.getElementById(windowId + '-window');
    if (!windowEl) return;

    // Cascade this window's position if it would otherwise land exactly
    // on top of a window that's already open. Fixes windows that share
    // the same default top/left in the HTML (e.g. stream + about used
    // to both start at 80px/150px and fully overlap on first open).
    cascadeWindowPosition(windowEl);

    windowEl.classList.add('visible');
    windowEl.classList.remove('inactive');
    openWindows.add(windowId);
    setActiveWindow(windowId);
    addToTaskbar(windowId);
    closeStartMenu();
    playWindowsSound('open');

    clearIconSelection();
}

function cascadeWindowPosition(windowEl) {
    const CASCADE_STEP = 40; // px to shift a conflicting window by, per attempt
    const width = parseInt(windowEl.style.width, 10) || windowEl.offsetWidth || 300;
    const height = parseInt(windowEl.style.height, 10) || windowEl.offsetHeight || 200;

    let top = parseInt(windowEl.style.top, 10) || 0;
    let left = parseInt(windowEl.style.left, 10) || 0;

    // Keep nudging diagonally while this window's box is fully contained
    // by — or fully contains — another visible window's box. Checking
    // both directions matters: a smaller window can be swallowed by a
    // larger one that's already open (About under Stream), AND a large
    // window opening later can swallow a smaller one that was already
    // open and sitting underneath it (Recycle Bin over About/Education/
    // Calculator) — without this second check, opening a big window
    // like Recycle Bin could bury whatever was open before it with zero
    // clickable area left on the buried window.
    let attempts = 0;
    while (attempts < 15 && hasContainmentConflict(top, left, width, height, windowEl)) {
        top += CASCADE_STEP;
        left += CASCADE_STEP;
        attempts++;
    }

    windowEl.style.top = top + 'px';
    windowEl.style.left = left + 'px';
}

function hasContainmentConflict(top, left, width, height, excludeEl) {
    const right = left + width;
    const bottom = top + height;

    return Array.from(document.querySelectorAll('.window.visible')).some(w => {
        if (w === excludeEl) return false;

        const wTop = parseInt(w.style.top, 10) || 0;
        const wLeft = parseInt(w.style.left, 10) || 0;
        const wWidth = parseInt(w.style.width, 10) || w.offsetWidth;
        const wHeight = parseInt(w.style.height, 10) || w.offsetHeight;
        const wRight = wLeft + wWidth;
        const wBottom = wTop + wHeight;

        // Is our box fully inside w's box?
        const weAreInsideW = left >= wLeft && top >= wTop && right <= wRight && bottom <= wBottom;

        // Is w's box fully inside our box? (the Recycle Bin case)
        const wIsInsideUs = wLeft >= left && wTop >= top && wRight <= right && wBottom <= bottom;

        return weAreInsideW || wIsInsideUs;
    });
}

function closeWindow(windowId) {
    const windowEl = document.getElementById(windowId + '-window');
    if (!windowEl) return;

    windowEl.classList.remove('visible', 'active');
    windowEl.classList.add('inactive');
    openWindows.delete(windowId);
    removeFromTaskbar(windowId);
    playWindowsSound('close');

    if (openWindows.size > 0) {
        const nextWindow = Array.from(openWindows)[0];
        setActiveWindow(nextWindow);
    } else {
        activeWindow = null;
    }
}

function minimizeWindow(windowId) {
    const windowEl = document.getElementById(windowId + '-window');
    if (!windowEl) return;

    windowEl.classList.remove('visible');
    windowEl.classList.remove('active');
    windowEl.classList.add('inactive');

    const taskbarItem = document.querySelector(`[data-window="${windowId}"]`);
    if (taskbarItem) {
        taskbarItem.classList.remove('active');
    }
}

function maximizeWindow(windowId) {
    const windowEl = document.getElementById(windowId + '-window');
    if (!windowEl) return;

    if (windowEl.style.width === '100vw' || windowEl.classList.contains('maximized')) {
        windowEl.classList.remove('maximized');
        windowEl.style.width = windowEl.dataset.originalWidth || '450px';
        windowEl.style.height = windowEl.dataset.originalHeight || '350px';
        windowEl.style.top = windowEl.dataset.originalTop || '100px';
        windowEl.style.left = windowEl.dataset.originalLeft || '200px';
    } else {
        windowEl.dataset.originalWidth = windowEl.style.width;
        windowEl.dataset.originalHeight = windowEl.style.height;
        windowEl.dataset.originalTop = windowEl.style.top;
        windowEl.dataset.originalLeft = windowEl.style.left;

        windowEl.classList.add('maximized');
        windowEl.style.width = '100vw';
        windowEl.style.height = 'calc(100vh - 28px)';
        windowEl.style.top = '0';
        windowEl.style.left = '0';
    }
}

function setActiveWindow(windowId) {
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active');
        w.classList.add('inactive');
        w.style.zIndex = 1000;
    });

    document.querySelectorAll('.taskbar-item').forEach(t => {
        t.classList.remove('active');
    });

    const windowEl = document.getElementById(windowId + '-window');
    if (windowEl) {
        windowEl.classList.add('active');
        windowEl.classList.remove('inactive');
        zIndexCounter++;
        windowEl.style.zIndex = ++zIndexCounter;
        activeWindow = windowId;
    }

    const taskbarItem = document.querySelector(`[data-window="${windowId}"]`);
    if (taskbarItem) {
        taskbarItem.classList.add('active');
    }
}

function toggleWindow(windowId) {
    const windowEl = document.getElementById(windowId + '-window');
    if (!windowEl) return;

    if (windowEl.classList.contains('visible') && activeWindow === windowId) {
        minimizeWindow(windowId);
    } else {
        windowEl.classList.add('visible');
        setActiveWindow(windowId);
    }
}

function getWindowTitle(windowId) {
    const titles = {
        'stream': 'Stream',
        'about': 'About Me',
        'education': 'Education',
        'projects': 'My Projects',
        'calculator': 'Calculator',
        'themes': 'Display Properties',
        'notepad': 'Notepad',
        'paint': 'Paint',
        'recycle': 'Recycle Bin',
        'cv': 'CV'
    };
    return titles[windowId] || windowId;
}


/* ==========================================================================
   3. TASKBAR
   ========================================================================== */

function addToTaskbar(windowId) {
    const taskbarItems = document.getElementById('taskbar-items');

    if (document.querySelector(`[data-window="${windowId}"]`)) return;

    const item = document.createElement('div');
    item.className = 'taskbar-item';
    item.setAttribute('data-window', windowId);
    item.textContent = getWindowTitle(windowId);
    item.onclick = () => toggleWindow(windowId);

    taskbarItems.appendChild(item);
}

function removeFromTaskbar(windowId) {
    const item = document.querySelector(`[data-window="${windowId}"]`);
    if (item) {
        item.remove();
    }
}


/* ==========================================================================
   4. DESKTOP ICON SELECTION
   ========================================================================== */

function clearIconSelection() {
    document.querySelectorAll('.icon').forEach(icon => {
        icon.classList.remove('selected');
    });
    selectedIcon = null;
}


/* ==========================================================================
   5. START MENU
   ========================================================================== */

function toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.querySelector('.start-button');

    if (startMenu.classList.contains('visible')) {
        startMenu.classList.remove('visible');
        startButton.classList.remove('active');
    } else {
        startMenu.classList.add('visible');
        startButton.classList.add('active');
    }
}

function closeStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.querySelector('.start-button');
    startMenu.classList.remove('visible');
    startButton.classList.remove('active');
}


/* ==========================================================================
   6. SHUTDOWN EASTER EGG (fireworks + goodbye message)
   ========================================================================== */

function showShutdownDialog() {
    closeStartMenu();

    // Create fireworks container
    const fireworks = document.createElement('div');
    fireworks.id = 'fireworks-container';
    document.body.appendChild(fireworks);

    // Create multiple fireworks
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            createFirework(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight * 0.7
            );
        }, i * 300);
    }

    // Show message after fireworks start
    setTimeout(() => {
        fireworks.remove();

        alert(
            'Thanks for visiting my website and checking out my profile!\n\n' +
            'Don\u2019t forget to connect with me on LinkedIn. I\u2019d love to stay in touch!'
        );
    }, 3500);
}

function createFirework(x, y) {
    const particleCount = 25;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';

        // Random angle
        const angle = (Math.PI * 2 * i) / particleCount;

        // Random explosion distance
        const distance = 40 + Math.random() * 80;

        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');

        // Random size
        const size = 2 + Math.random() * 3;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        // Random colour
        const colours = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ffffff'];
        particle.style.background = colours[Math.floor(Math.random() * colours.length)];

        document.getElementById('fireworks-container').appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, 1200);
    }
}


/* ==========================================================================
   7. CALCULATOR
   ========================================================================== */

function calcInput(value) {
    const display = document.getElementById('calc-display');
    if (calcDisplay === '0' && value !== '.') {
        calcDisplay = value;
    } else {
        calcDisplay += value;
    }
    display.value = calcDisplay;
}

function clearCalc() {
    calcDisplay = '0';
    calcExpression = '';
    document.getElementById('calc-display').value = calcDisplay;
}

function calcBackspace() {
    if (calcDisplay.length > 1) {
        calcDisplay = calcDisplay.slice(0, -1);
    } else {
        calcDisplay = '0';
    }
    document.getElementById('calc-display').value = calcDisplay;
}

function calcEqual() {
    // NOTE: uses eval() on the display string — see "ISSUES FOUND" below.
    try {
        const expression = calcDisplay.replace(/\u00d7/g, '*');
        const result = eval(expression);
        calcDisplay = result.toString();
        document.getElementById('calc-display').value = calcDisplay;
    } catch (error) {
        calcDisplay = 'Error';
        document.getElementById('calc-display').value = calcDisplay;
        playWindowsSound('error');
        setTimeout(() => {
            clearCalc();
        }, 1500);
    }
}


/* ==========================================================================
   8. DRAG & DROP (window dragging)
   ========================================================================== */

function initDragAndDrop() {
    document.addEventListener('mousedown', function (e) {
        const header = e.target.closest('.window-header');
        if (header && !e.target.closest('.window-controls')) {
            draggedElement = header.parentElement;
            const rect = draggedElement.getBoundingClientRect();
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;

            const windowId = draggedElement.id.replace('-window', '');
            setActiveWindow(windowId);

            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', function (e) {
        if (draggedElement) {
            const x = e.clientX - offset.x;
            const y = e.clientY - offset.y;

            const maxX = window.innerWidth - draggedElement.offsetWidth;
            const maxY = window.innerHeight - draggedElement.offsetHeight - 28;

            draggedElement.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            draggedElement.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
        }
    });

    document.addEventListener('mouseup', function () {
        draggedElement = null;
    });
}


/* ==========================================================================
   9. CLOCK
   ========================================================================== */

function updateClock() {
    const clockEl = document.getElementById('clock');
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    clockEl.textContent = timeString;
}


/* ==========================================================================
   9b. SOUND EFFECTS
   ========================================================================== */

// Map each sound name to a file. Put your .wav/.mp3 files in a "sounds/"
// folder next to script.js (or change the paths below to match wherever
// you host them). See the note under this file's usage instructions for
// where to legally source these — don't rip real Windows system sounds,
// those are Microsoft's copyrighted assets.
const soundFiles = {
    startup: 'sounds/startup.mp3',
    open: 'sounds/open.mp3',
    close: 'sounds/close.mp3',
    error: 'sounds/error.mp3'
};

// Preload each sound once so playback doesn't stall waiting on a network
// fetch the first time it's triggered.
const sounds = {};
Object.keys(soundFiles).forEach(name => {
    const audio = new Audio(soundFiles[name]);
    audio.preload = 'auto';
    audio.volume = 0.5;
    sounds[name] = audio;
});

/**
 * Plays a registered UI sound by name (e.g. playWindowsSound('open')).
 * Safe to call even if the audio file is missing or the browser blocks
 * autoplay — failures are swallowed rather than throwing.
 */
function playWindowsSound(soundName) {
    const audio = sounds[soundName];
    if (!audio) {
        console.warn(`playWindowsSound: no sound registered for "${soundName}"`);
        return;
    }

    // Rewind so rapidly repeated triggers (e.g. quickly opening several
    // windows) restart the clip instead of being silently ignored while
    // a previous play is still finishing.
    audio.currentTime = 0;

    audio.play().catch(() => {
        // Browsers block audio until the user has interacted with the
        // page at least once — this is expected, not a bug, most often
        // seen on the very first call (the startup chime).
    });
}

/**
 * Most browsers refuse to play audio before the user has interacted
 * with the page at all, so the startup chime can't just fire on
 * DOMContentLoaded. Instead we arm a one-time listener and play it on
 * whichever comes first: a click or a keypress.
 */
function playStartupChimeOnFirstInteraction() {
    const trigger = () => {
        playWindowsSound('startup');
        document.removeEventListener('click', trigger);
        document.removeEventListener('keydown', trigger);
    };
    document.addEventListener('click', trigger, { once: true });
    document.addEventListener('keydown', trigger, { once: true });
}


/* ==========================================================================
   10. THEME SYSTEM
   ========================================================================== */

const themes = {
    default: {
        desktop: '#008080',
        window: '#c0c0c0',
        titlebar: 'linear-gradient(90deg, #000080 0%, #0040c0 100%)',
        text: '#000000',
        button: '#c0c0c0'
    },
    pink: {
        desktop: '#f8bbd9',
        window: '#fdf2f8',
        titlebar: 'linear-gradient(90deg, #ec4899 0%, #be185d 100%)',
        text: '#000000',
        button: '#fdf2f8'
    },
    cyberpunk: {
        desktop: 'linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #000a1a 100%)',
        window: '#0d1117',
        titlebar: 'linear-gradient(90deg, #ff00ff 0%, #00ffff 100%)',
        text: '#00ffff',
        button: '#21262d'
    },
    lilac: {
        desktop: '#c8b2db',
        window: '#e6e6fa',
        titlebar: 'linear-gradient(90deg, #9370db 0%, #663399 100%)',
        text: '#000000',
        button: '#e6e6fa'
    },
    green: {
        desktop: '#228b22',
        window: '#f0fff0',
        titlebar: 'linear-gradient(90deg, #008000 0%, #004000 100%)',
        text: '#000000',
        button: '#f0fff0'
    }
};
// NOTE: 'pink' has real values here (used to render the live preview swatch),
// but the CSS only defines :root[data-theme="cyberpunk"|"lilac"|"green"].
// There's no :root[data-theme="pink"] block in the stylesheet, so
// applyCurrentTheme('pink') will set data-theme="pink" on <html> but the
// actual window/taskbar chrome won't re-theme — only the small preview
// panel (which is styled directly via JS below) will show pink. See the
// CSS "ISSUES FOUND" note about the dead Pastel Pink theme — this is the
// other half of that same gap.

function previewTheme(themeName) {
    currentPreviewTheme = themeName;
    updateThemePreview(themeName);
}

function updateThemePreview(themeName) {
    const theme = themes[themeName];
    const previewDesktop = document.getElementById('preview-desktop');
    const previewWindow = document.getElementById('preview-window');
    const previewTitlebar = document.getElementById('preview-titlebar');
    const previewContent = document.getElementById('preview-content');
    const previewButton = document.getElementById('preview-button');

    if (theme && previewDesktop && previewWindow && previewTitlebar && previewContent && previewButton) {
        previewDesktop.style.background = theme.desktop;
        previewWindow.style.background = theme.window;
        previewWindow.style.borderColor = theme.window;
        previewTitlebar.style.background = theme.titlebar;
        previewContent.style.background = theme.window;
        previewContent.style.color = theme.text;
        previewButton.style.background = theme.button;
        previewButton.style.borderColor = theme.button;
        previewButton.style.color = theme.text;
    }
}

function applyCurrentTheme() {
    changeTheme(currentPreviewTheme);
    appliedTheme = currentPreviewTheme;
    alert('Theme applied successfully!');
}

function changeTheme(themeName) {
    const root = document.documentElement;

    if (themeName === 'default') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', themeName);
    }
}

function resetTheme() {
    changeTheme('default');
    previewTheme('default');
    appliedTheme = 'default';
    currentPreviewTheme = 'default';

    document.getElementById('default-theme').checked = true;
}


/* ==========================================================================
   11. FAKE VIRUS PRANK
   ========================================================================== */

function virusPrank() {
    // Prevent it from being triggered repeatedly
    if (document.body.classList.contains('virus-active')) return;

    document.body.classList.add('virus-active');

    // Create fake virus overlay
    const overlay = document.createElement('div');
    overlay.className = 'virus-overlay';

    overlay.innerHTML = `
        <div class="virus-warning">
            <div class="virus-title">
                \u26a0 SYSTEM WARNING
            </div>

            <div class="virus-body">
                <div class="virus-icon-large">\u2620</div>

                <h2>VIRUS DETECTED!</h2>

                <p>
                    Multiple security threats have been detected
                    on your computer.
                </p>

                <div class="virus-progress">
                    <div></div>
                </div>

                <p class="virus-status">
                    Scanning system...
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Fake popup windows
    let popupCount = 0;

    const popupInterval = setInterval(() => {
        createFakeVirusWindow();
        popupCount++;

        if (popupCount >= 8) {
            clearInterval(popupInterval);
        }
    }, 350);

    // Finish prank
    setTimeout(() => {
        overlay.remove();
        document.body.classList.remove('virus-active');

        // Fake "system shutdown" effect
        showFakeShutdown();
    }, 5000);
}

function createFakeVirusWindow() {
    const popup = document.createElement('div');
    popup.className = 'fake-virus-window';

    popup.style.left = Math.random() * (window.innerWidth - 320) + 'px';
    popup.style.top = Math.random() * (window.innerHeight - 180) + 'px';

    popup.innerHTML = `
        <div class="fake-virus-header">
            \u26a0 Windows Security
        </div>

        <div class="fake-virus-content">
            <div class="fake-warning-icon">\u26a0</div>

            <strong>Security Alert!</strong>

            <p>
                Suspicious activity detected.
            </p>

            <button onclick="this.closest('.fake-virus-window').remove()">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(popup);

    // Automatically disappear
    setTimeout(() => {
        popup.remove();
    }, 3500);
}

function showFakeShutdown() {
    const shutdown = document.createElement('div');
    shutdown.className = 'fake-shutdown';

    shutdown.innerHTML = `
        <div>
            <div class="shutdown-logo">\ud83e\ude9f</div>

            <h2>Windows is shutting down...</h2>

            <p>Please wait...</p>

            <div class="shutdown-bar"></div>
        </div>
    `;

    document.body.appendChild(shutdown);

    setTimeout(() => {
        shutdown.remove();

        // Reload the portfolio
        location.reload();
    }, 3000);
}


/* ==========================================================================
   12. LIVE STREAM CHAT
   ========================================================================== */

const chatMessages = [
    { username: "Reception Y", message: "Good Morning!", color: "green" },
    { username: "TechGuy99", message: "Love the website \ud83d\ude02", color: "red" },
    { username: "KJ", message: "Coffee????", color: "green" },
    { username: "RetroKid", message: "Feels like 1999 again!", color: "purple" },
    { username: "GamerX2", message: "What are you working on?", color: "orange" },
    { username: "DirectorJ", message: "Can you please unlock my account?", color: "green" },
    { username: "RetroGamer", message: "Windows XP vibes \ud83d\udc40", color: "red" },
    { username: "TechAlex", message: "The animations are really cool!", color: "orange" },
    { username: "ByteMaster", message: "Nice portfolio!", color: "blue" },
    { username: "DO-RC97", message: "Hee-Hee!", color: "green" },
    { username: "CyberNinja", message: "The desktop looks awesome \ud83d\udd25", color: "purple" },
    { username: "ITGuy", message: "Are you actually using Windows 98?", color: "orange" },
    { username: "Bestfriend E", message: "I like Blue!", color: "green" },
    { username: "PixelGirl", message: "The icons are so cute!", color: "red" },
    { username: "HR26", message: "Bell Boy!", color: "green" },
    { username: "RetroFan", message: "This takes me back \ud83d\ude02", color: "purple" },
    { username: "Z", message: "My G ^>^", color: "green" }
];

function addChatMessage() {
    const chatContainer = document.getElementById("chat-messages");

    if (!chatContainer) {
        console.error("ERROR: #chat-messages was not found!");
        return;
    }

    const chat = chatMessages[chatIndex];

    const message = document.createElement("div");
    message.className = "chat-message";

    message.innerHTML = `
        <strong class="username ${chat.color}">
            ${chat.username}
        </strong>
        <span>${chat.message}</span>
    `;

    chatContainer.appendChild(message);

    chatIndex++;
    if (chatIndex >= chatMessages.length) {
        chatIndex = 0;
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;

    console.log("Chat message added:", chat.username, chat.message);
}

function startLiveChat() {
    console.log("Live chat started!");

    // Add 5 messages immediately
    for (let i = 0; i < 5; i++) {
        addChatMessage();
    }

    // Add a new message every 3 seconds
    setInterval(function () {
        addChatMessage();
    }, 3000);
}


/* ==========================================================================
   13. LIVE VIEWER COUNT
   ========================================================================== */

function updateViewerCount() {
    const viewerElement = document.getElementById("viewer-count");
    if (!viewerElement) return;

    // Randomly increase or decrease the viewer count
    const change = Math.floor(Math.random() * 21) - 10;
    viewerCount += change;

    // Prevent the viewer count from becoming unrealistically low
    if (viewerCount < 1000) {
        viewerCount = 1000;
    }

    viewerElement.textContent = viewerCount.toLocaleString();
}


/* ==========================================================================
   14. PROJECTS TABLE
   ========================================================================== */

function initProjectsTable() {
    document.querySelectorAll('.projects-table tbody tr').forEach(row => {
        row.addEventListener('click', function () {
            document
                .querySelectorAll('.projects-table tbody tr')
                .forEach(r => r.classList.remove('selected'));

            this.classList.add('selected');
        });

        row.addEventListener('dblclick', function () {
            const url = this.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        });
    });
}


/* ==========================================================================
   14b. PAINT TOOL (added later)
   ========================================================================== */

// Classic Windows 98 Paint 20-color default palette.
const PAINT_COLORS = [
    '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200',
    '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
    '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0',
    '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'
];

let paintCanvas = null;
let paintCtx = null;
let paintTool = 'pencil';
let paintColor = '#000000';
let paintBrushSize = 3;
let paintIsDrawing = false;
let paintStartX = 0;
let paintStartY = 0;
let paintSnapshot = null; // canvas pixels captured at stroke-start, used to redraw live line/rectangle previews

function initPaintCanvas() {
    paintCanvas = document.getElementById('paint-canvas');
    if (!paintCanvas) return; // Paint window/canvas not present on this page — nothing to wire up

    paintCtx = paintCanvas.getContext('2d');

    // Start on a white canvas — canvases are transparent by default, and
    // "erasing" onto transparent would show the desktop wallpaper through
    // the window instead of a blank page.
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

    buildPaintPalette();

    paintCanvas.addEventListener('pointerdown', handlePaintPointerDown);
    paintCanvas.addEventListener('pointermove', handlePaintPointerMove);
    window.addEventListener('pointerup', handlePaintPointerUp);
}

function buildPaintPalette() {
    const palette = document.getElementById('paint-palette');
    if (!palette) return;

    PAINT_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'paint-swatch';
        swatch.style.background = color;
        swatch.title = color;
        swatch.onclick = () => setPaintColor(color);
        palette.appendChild(swatch);
    });
}

function setPaintTool(tool, buttonEl) {
    paintTool = tool;

    document.querySelectorAll('.paint-tool').forEach(btn => btn.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');
}

function setPaintColor(color) {
    paintColor = color;

    const indicator = document.getElementById('paint-current-color');
    if (indicator) indicator.style.background = color;

    const picker = document.getElementById('paint-color-picker');
    if (picker) picker.value = color;
}

function updatePaintBrushSize(value) {
    paintBrushSize = parseInt(value, 10) || 1;
}

function getPaintCoords(e) {
    // Canvas internal resolution and its on-screen CSS size can differ
    // (e.g. shrunk to fit a small window), so scale pointer coords into
    // canvas space rather than using raw client coordinates.
    const rect = paintCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (paintCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (paintCanvas.height / rect.height)
    };
}

function handlePaintPointerDown(e) {
    paintIsDrawing = true;
    const { x, y } = getPaintCoords(e);
    paintStartX = x;
    paintStartY = y;

    if (paintTool === 'fill') {
        floodFillPaintCanvas(Math.round(x), Math.round(y), paintColor);
        paintIsDrawing = false;
        return;
    }

    // Snapshot before drawing so line/rectangle previews can be redrawn
    // fresh on every pointermove instead of stacking on top of each other.
    paintSnapshot = paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height);

    if (paintTool === 'pencil' || paintTool === 'eraser') {
        drawPaintDot(x, y);
    }

    paintCanvas.setPointerCapture(e.pointerId);
}

function handlePaintPointerMove(e) {
    if (!paintIsDrawing) return;
    const { x, y } = getPaintCoords(e);

    if (paintTool === 'pencil' || paintTool === 'eraser') {
        drawPaintLine(paintStartX, paintStartY, x, y);
        paintStartX = x;
        paintStartY = y;
    } else if (paintTool === 'line') {
        paintCtx.putImageData(paintSnapshot, 0, 0);
        drawPaintLine(paintStartX, paintStartY, x, y);
    } else if (paintTool === 'rectangle') {
        paintCtx.putImageData(paintSnapshot, 0, 0);
        drawPaintRect(paintStartX, paintStartY, x, y);
    }
}

function handlePaintPointerUp() {
    paintIsDrawing = false;
    paintSnapshot = null;
}

function drawPaintDot(x, y) {
    paintCtx.fillStyle = paintTool === 'eraser' ? '#ffffff' : paintColor;
    paintCtx.beginPath();
    paintCtx.arc(x, y, paintBrushSize / 2, 0, Math.PI * 2);
    paintCtx.fill();
}

function drawPaintLine(x1, y1, x2, y2) {
    paintCtx.strokeStyle = paintTool === 'eraser' ? '#ffffff' : paintColor;
    paintCtx.lineWidth = paintBrushSize;
    paintCtx.lineCap = 'round';
    paintCtx.lineJoin = 'round';
    paintCtx.beginPath();
    paintCtx.moveTo(x1, y1);
    paintCtx.lineTo(x2, y2);
    paintCtx.stroke();
}

function drawPaintRect(x1, y1, x2, y2) {
    paintCtx.strokeStyle = paintColor;
    paintCtx.lineWidth = paintBrushSize;
    paintCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function clearPaintCanvas() {
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
}

function downloadPaintCanvas() {
    const link = document.createElement('a');
    link.download = 'painting.png';
    link.href = paintCanvas.toDataURL('image/png');
    link.click();
}

/**
 * Stack-based flood fill. Uses a color-distance tolerance rather than an
 * exact match so anti-aliased pencil/line edges don't leave a thin
 * unfilled sliver right at the fill boundary.
 */
function floodFillPaintCanvas(startX, startY, fillColorHex) {
    const width = paintCanvas.width;
    const height = paintCanvas.height;
    if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

    const imageData = paintCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fillColor = hexToRgb(fillColorHex);
    const startIndex = (startY * width + startX) * 4;
    const targetColor = [data[startIndex], data[startIndex + 1], data[startIndex + 2], data[startIndex + 3]];

    // Already the target color — nothing to fill.
    if (colorsMatch(targetColor, [fillColor.r, fillColor.g, fillColor.b, 255], 0)) return;

    const tolerance = 40;
    const stack = [[startX, startY]];

    while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= width || y >= height) continue;

        const index = (y * width + x) * 4;
        const currentColor = [data[index], data[index + 1], data[index + 2], data[index + 3]];
        if (!colorsMatch(currentColor, targetColor, tolerance)) continue;

        data[index] = fillColor.r;
        data[index + 1] = fillColor.g;
        data[index + 2] = fillColor.b;
        data[index + 3] = 255;

        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    paintCtx.putImageData(imageData, 0, 0);
}

function colorsMatch(a, b, tolerance) {
    return Math.abs(a[0] - b[0]) <= tolerance &&
        Math.abs(a[1] - b[1]) <= tolerance &&
        Math.abs(a[2] - b[2]) <= tolerance &&
        Math.abs(a[3] - b[3]) <= tolerance;
}

function hexToRgb(hex) {
    const parsed = hex.replace('#', '');
    return {
        r: parseInt(parsed.substring(0, 2), 16),
        g: parseInt(parsed.substring(2, 4), 16),
        b: parseInt(parsed.substring(4, 6), 16)
    };
}


/* ==========================================================================
   14c. RECYCLE BIN (added later)
   ========================================================================== */

// "Deleted" IT-humor content — feel free to edit/replace these.
// Any item can optionally include an "image" path — if present, a small
// clickable thumbnail is shown next to the name that opens a larger
// preview. Add real image files under e.g. images/recycle/ and point
// "image" at them; items without one just render as plain text like before.
const recycleBinItems = [
    { icon: '🖨️', name: 'printer_drivers.exe', type: 'Deleted File', reason: 'Never worked in the first place', date: '2025' },
    { icon: '🔐', name: 'Password123.txt', type: 'Deleted File', reason: 'Security risk (allegedly)', date: '2024' },
    { icon: '', name: 'Alex-Intern.png', type: 'Deleted File', reason: 'Shoves me into the water.', date: '2026', image: 'images/alexint.png' },
    { icon: '☕', name: 'coffee_break.mp4', type: 'Deleted File', reason: 'Filmed during a "critical update"', date: '2025' },
    { icon: '🎫', name: 'that_one_ticket.txt', type: 'Deleted File', reason: 'User: "it\'s not working." No further details provided.', date: '2025' },
    { icon: '💾', name: 'backup_FINAL_v2_reallyfinal.zip', type: 'Deleted File', reason: 'There were 7 "final" versions. None were final.', date: '2024' },
    { icon: '', name: 'SGopi.png', type: 'Deleted File', reason: 'Empathy!', date: '2026', image: 'images/sgopi.png' },
    { icon: '🔁', name: 'turn_it_off_and_on_again.bat', type: 'Deleted File', reason: 'Ran successfully. Fixed everything. Nobody knows why.', date: '2023' }
];

let recycleBinHasItems = true;

// Called by the desktop icon's onclick="recycle()" — kept as its own
// function name (rather than calling openWindow directly) so the icon
// markup doesn't need to change if this logic grows later.
function recycle() {
    openWindow('recycle');
    renderRecycleBin();
}

function renderRecycleBin() {
    const tbody = document.getElementById('recycle-table-body');
    if (!tbody) return; // Recycle Bin window/table not present on this page

    tbody.innerHTML = '';

    if (!recycleBinHasItems) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="recycle-empty-msg">🗑️ The Recycle Bin is empty. It\'s gone. For real this time.</td>';
        tbody.appendChild(row);
        updateRecycleBinStatus();
        return;
    }

    // Built with DOM methods (rather than innerHTML template strings)
    // so the thumbnail's click handler can be a real closure — no string
    // escaping needed for names/reasons that contain quotes or apostrophes.
    recycleBinItems.forEach(item => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        if (item.image) {
            const wrapper = document.createElement('span');
            wrapper.className = 'recycle-name-cell';

            const thumb = document.createElement('img');
            thumb.src = item.image;
            thumb.alt = item.name;
            thumb.className = 'recycle-thumb';
            thumb.title = 'Click to view larger';
            thumb.onclick = () => openRecycleImage(item.image, item.name);

            wrapper.appendChild(thumb);
            wrapper.appendChild(document.createTextNode(`${item.icon} ${item.name}`));
            nameCell.appendChild(wrapper);
        } else {
            nameCell.textContent = `${item.icon} ${item.name}`;
        }

        const typeCell = document.createElement('td');
        typeCell.textContent = item.type;

        const reasonCell = document.createElement('td');
        reasonCell.textContent = item.reason;

        const dateCell = document.createElement('td');
        dateCell.textContent = item.date;

        row.append(nameCell, typeCell, reasonCell, dateCell);
        tbody.appendChild(row);
    });

    updateRecycleBinStatus();
}

/**
 * Opens a full-size preview of a Recycle Bin item's thumbnail image in a
 * simple lightbox overlay (styled like a little Windows image viewer).
 * Click the dimmed background or the × to close.
 */
function openRecycleImage(src, caption) {
    const overlay = document.createElement('div');
    overlay.className = 'image-lightbox-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    const box = document.createElement('div');
    box.className = 'image-lightbox-box';

    const header = document.createElement('div');
    header.className = 'image-lightbox-header';

    const title = document.createElement('span');
    title.textContent = caption;

    const closeBtn = document.createElement('a');
    closeBtn.href = '#';
    closeBtn.className = 'window-button close-btn';
    closeBtn.textContent = '\u00d7';
    closeBtn.onclick = (e) => {
        e.preventDefault();
        overlay.remove();
    };

    header.append(title, closeBtn);

    const img = document.createElement('img');
    img.src = src;
    img.alt = caption;

    box.append(header, img);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function updateRecycleBinStatus() {
    const statusCount = document.getElementById('recycle-status-count');
    if (statusCount) {
        statusCount.textContent = recycleBinHasItems ? `${recycleBinItems.length} objects` : '0 objects';
    }
    updateRecycleBinIcon();
}

// Swaps the desktop icon between the filled trash-can (has items) and
// the outline trash-can (empty) — matches real Windows' full/empty bin.
function updateRecycleBinIcon() {
    const iconEl = document.querySelector('#recycle-desktop-icon i');
    if (!iconEl) return;
    iconEl.className = recycleBinHasItems ? 'fas fa-trash-can' : 'far fa-trash-can';
}

function promptEmptyRecycleBin() {
    if (!recycleBinHasItems) return; // already empty, nothing to confirm

    // Reuses the existing .fake-virus-window/.fake-virus-header/
    // .fake-virus-content styling from the virus prank (that CSS is a
    // neutral blue Windows dialog, not the red virus warning — only
    // .virus-title itself is red), so no new CSS is needed for this.
    const dialog = document.createElement('div');
    dialog.className = 'fake-virus-window';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.width = '300px';
    dialog.style.zIndex = 3000000;
    dialog.style.animation = 'none'; // this isn't a prank popup, skip the shake-in

    dialog.innerHTML = `
        <div class="fake-virus-header">🗑️ Confirm Multiple File Delete</div>
        <div class="fake-virus-content">
            <p>Are you sure you want to permanently delete these ${recycleBinItems.length} items?</p>
            <br>
            <button type="button" onclick="confirmEmptyRecycleBin(this)">Yes</button>
            <button type="button" onclick="this.closest('.fake-virus-window').remove()">No</button>
        </div>
    `;

    document.body.appendChild(dialog);
}

function confirmEmptyRecycleBin(buttonEl) {
    recycleBinHasItems = false;
    renderRecycleBin();
    playWindowsSound('close');
    buttonEl.closest('.fake-virus-window').remove();
}


/* ==========================================================================
   14d. CV REQUEST POPUP (added later)
   ========================================================================== */

// Update this to your actual contact email.
const CV_CONTACT_EMAIL = 'alexanderurielnavarra@yahoo.com';

/**
 * Shows a small "CV available on request" popup instead of directly
 * downloading a file. Reuses the same .fake-virus-window/.fake-virus-header/
 * .fake-virus-content dialog styling as the Recycle Bin's confirm dialog —
 * no new CSS needed.
 */
function showCVMessage() {
    closeStartMenu();

    const dialog = document.createElement('div');
    dialog.className = 'fake-virus-window';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.width = '300px';
    dialog.style.zIndex = 3000000;
    dialog.style.animation = 'none'; // this isn't a prank popup, skip the shake-in

    const header = document.createElement('div');
    header.className = 'fake-virus-header';
    header.textContent = '\ud83d\udcc4 CV / Resume';

    const content = document.createElement('div');
    content.className = 'fake-virus-content';

    const message = document.createElement('p');
    message.textContent = 'Due to security reasons, I cannot provide my CV online. Please email me to get my CV.';

    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${CV_CONTACT_EMAIL}?subject=${encodeURIComponent('CV Request')}`;
    emailLink.className = 'dialog-button';
    emailLink.style.textDecoration = 'none';
    emailLink.style.display = 'inline-block';
    emailLink.textContent = '\ud83d\udce7 Email Me';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => dialog.remove();

    content.append(message, document.createElement('br'), emailLink, closeBtn);
    dialog.append(header, content);
    document.body.appendChild(dialog);
}


/* ==========================================================================
   15. GLOBAL EVENT LISTENERS & INIT
   ========================================================================== */

document.addEventListener('click', function (e) {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.querySelector('.start-button');

    if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
        closeStartMenu();
    }

    // NOTE: renamed from "window" to "clickedWindow" — the original code
    // declared `const window = e.target.closest('.window')`, which shadows
    // the global `window` object for the rest of this function. It happened
    // not to break anything here, but it's a landmine for future edits
    // (any code added below that expects `window.innerWidth` etc. inside
    // this handler would silently break). See "ISSUES FOUND" below.
    const clickedWindow = e.target.closest('.window');
    if (clickedWindow) {
        const windowId = clickedWindow.id.replace('-window', '');
        setActiveWindow(windowId);
    }

    const icon = e.target.closest('.icon');
    if (icon) {
        clearIconSelection();
        icon.classList.add('selected');
        selectedIcon = icon;
    } else if (!clickedWindow) {
        clearIconSelection();
    }
});

document.addEventListener('dblclick', function (e) {
    const icon = e.target.closest('.icon');
    if (icon) {
        icon.click();
    }
});

document.addEventListener('dragstart', function (e) {
    e.preventDefault();
});

document.addEventListener('keydown', function (e) {
    if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
    }

    if (e.key === 'Escape') {
        closeStartMenu();
    }
});

// Single consolidated init — the original file had four separate
// DOMContentLoaded listeners (drag/clock/auto-open stream, live chat,
// viewer count, projects table). Combined here so init order is explicit
// and easy to follow; behavior is unchanged.
document.addEventListener('DOMContentLoaded', function () {
    initDragAndDrop();
    initProjectsTable();
    initPaintCanvas();
    renderRecycleBin();
    playStartupChimeOnFirstInteraction();

    updateClock();
    setInterval(updateClock, 1000);

    startLiveChat();
    setInterval(updateViewerCount, 2000);

    setTimeout(() => {
        if (!activeWindow) { // only auto-open stream if the user hasn't clicked anything yet
            openWindow('stream');
        }
    }, 500);
});


/* ==========================================================================
   ISSUES FOUND WHILE REORGANIZING (not changed automatically — your call)
   ==========================================================================

   1. `calcEqual()` runs `eval()` directly on the calculator's display
      string. Low risk here since input only comes from your own numeric
      buttons, but if you ever let the display be set from a URL param,
      pasted text, or any other outside source, this becomes a code-
      injection vector. Worth swapping for a small expression parser (or
      `new Function('return ' + expr)()` with strict character
      whitelisting) if the calculator's input surface ever grows.

   2. The global click handler declared `const window = e.target.closest(
      '.window')`, shadowing the built-in `window` object for that
      function's scope. It wasn't causing a bug today (nothing else in
      that handler needed the real `window`), but it's the kind of thing
      that silently breaks a future edit. Renamed to `clickedWindow` in
      the version above.

   3. `themes.pink` has real color values and is wired up in the theme
      preview/apply logic, but the CSS has no `:root[data-theme="pink"]`
      block (only cyberpunk/lilac/green exist there — see the CSS
      reorganization notes). So picking "pink" in the UI updates the
      small preview swatch but won't actually re-theme the site once
      applied. Either add the pink CSS block or remove pink from the `themes`
      object/picker until it's implemented.

   4. Four separate `DOMContentLoaded` listeners were merged into one at
      the bottom. Purely organizational — execution order is preserved,
      nothing was removed.
   ========================================================================== */