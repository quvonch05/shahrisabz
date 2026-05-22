// ============================================
// SUPABASE SOZLAMALARI
// ============================================
const SUPABASE_URL = 'https://xmxlqtnmljjhnlxxnymn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhteGxxdG5tbGpqaG5seHhueW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTczNjQsImV4cCI6MjA5NTAzMzM2NH0.96GvuXxaiiMjyDb7zwbJa-rDg56La2sNFDeNgqCov3I'; // ← O'ZGARTIRING

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// GLOBAL O'ZGARUVCHILAR
// ============================================
let currentUser = null;
let realtimeChannel = null;
let allMessages = [];
let animationsEnabled = true;

// ============================================
// LOADING
// ============================================
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        checkSession();
    }, 1500);
});

// ============================================
// AUTH TEKSHIRUV
// ============================================
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        showChat();
        loadUserProfile();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('chat-section').classList.add('hidden');
}

function showChat() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('chat-section').classList.remove('hidden');
    loadMessages();
    subscribeToMessages();
}

// ============================================
// AUTH TABS
// ============================================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + '-form').classList.add('active');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target.querySelector('i') || event.target;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ============================================
// AUTH FUNKSIYALARI
// ============================================
async function signUp() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (!name || !email || !password) {
        errorEl.textContent = 'Barcha maydonlarni to\'ldiring!';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Parol kamida 6 ta belgi bo\'lishi kerak!';
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) throw error;

        showToast('Tasdiqlash xati yuborildi!', 'success');
        switchTab('login');
    } catch (err) {
        errorEl.textContent = err.message;
        showToast(err.message, 'error');
    }
}

async function signIn() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Email va parolni kiriting!';
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        showToast('Xush kelibsiz!', 'success');
        showChat();
        loadUserProfile();
    } catch (err) {
        errorEl.textContent = err.message;
        showToast(err.message, 'error');
    }
}

async function signOut() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }
    showToast('Tizimdan chiqdingiz', 'info');
    showAuth();
}

// ============================================
// USER PROFILE
// ============================================
function loadUserProfile() {
    if (!currentUser) return;
    
    document.getElementById('user-name').textContent = 
        currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    document.getElementById('user-email').textContent = currentUser.email;
    
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.email)}&background=3ecf8e&color=fff`;
    document.getElementById('user-avatar').src = avatarUrl;
}

// ============================================
// XABARLAR
// ============================================
async function loadMessages() {
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        showToast('Xabarlarni yuklashda xato', 'error');
        return;
    }

    allMessages = messages;
    renderMessages();
}

function renderMessages(filter = '') {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    const filtered = filter 
        ? allMessages.filter(m => m.content.toLowerCase().includes(filter.toLowerCase()))
        : allMessages;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comment-slash"></i>
                <h3>Xabarlar yo'q</h3>
            </div>
        `;
        return;
    }

    filtered.forEach(msg => displayMessage(msg));
    scrollToBottom();
}

function displayMessage(msg) {
    const container = document.getElementById('messages-container');
    const isOwn = currentUser && msg.user_id === currentUser.id;
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : 'other'}`;
    if (animationsEnabled) div.style.animation = 'messageAppear 0.3s ease';
    
    const time = new Date(msg.created_at).toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name || 'User')}&background=${isOwn ? '3ecf8e' : '667eea'}&color=fff`;

    div.innerHTML = `
        <div class="message-header">
            <img src="${avatarUrl}" class="message-avatar" alt="">
            <span class="message-name">${msg.sender_name || 'Noma\'lum'}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
        ${isOwn ? '<div class="message-status"><i class="fas fa-check-double"></i> Yuborildi</div>' : ''}
    `;

    container.appendChild(div);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// REALTIME
// ============================================
function subscribeToMessages() {
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

    realtimeChannel = supabaseClient
        .channel('public:messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
                const msg = payload.new;
                allMessages.push(msg);
                displayMessage(msg);
                scrollToBottom();
                
                // Typing indicator ni yashirish
                document.getElementById('typing-status').textContent = 'Jonli';
                
                // Agar xabar o'zimiznikimas, bildirishnoma
                if (currentUser && msg.user_id !== currentUser.id) {
                    showToast(`${msg.sender_name}: ${msg.content.substring(0, 30)}...`, 'info');
                }
            }
        )
        .subscribe();
}

// ============================================
// XABAR YUBORISH
// ============================================
async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content) return;
    if (!currentUser) {
        showToast('Avval tizimga kiring!', 'error');
        return;
    }

    // Typing indicator
    document.getElementById('typing-status').textContent = 'Yozmoqda...';

    const { error } = await supabaseClient
        .from('messages')
        .insert([{
            content,
            user_id: currentUser.id,
            sender_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]
        }]);

    if (error) {
        showToast('Xabar yuborishda xato', 'error');
        return;
    }

    input.value = '';
    document.getElementById('typing-status').textContent = 'Jonli';
}

// Enter bilan yuborish
document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// ============================================
// EMOJI
// ============================================
function toggleEmoji() {
    document.getElementById('emoji-picker').classList.toggle('hidden');
}

document.getElementById('emoji-picker')?.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
        const input = document.getElementById('message-input');
        input.value += e.target.textContent;
        input.focus();
    }
});

// Tashqariga bosilganda emoji picker yopilsin
document.addEventListener('click', (e) => {
    const picker = document.getElementById('emoji-picker');
    const btn = document.querySelector('.emoji-btn');
    if (picker && !picker.contains(e.target) && !btn.contains(e.target)) {
        picker.classList.add('hidden');
    }
});

// ============================================
// QIDIRISH
// ============================================
function searchMessages() {
    document.getElementById('search-bar').classList.remove('hidden');
    document.getElementById('search-input').focus();
}

function closeSearch() {
    document.getElementById('search-bar').classList.add('hidden');
    document.getElementById('search-input').value = '';
    renderMessages();
}

function filterMessages() {
    const query = document.getElementById('search-input').value;
    renderMessages(query);
}

// ============================================
// NAVIGATION
// ============================================
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(section + '-area').classList.add('active');
    event.currentTarget.classList.add('active');
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// ============================================
// SETTINGS
// ============================================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    showToast(isDark ? 'Qorong\'u rejim yoqildi' : 'Yorug\' rejim yoqildi', 'success');
}

function toggleAnimations() {
    animationsEnabled = document.getElementById('animations').checked;
    localStorage.setItem('animations', animationsEnabled);
}

function editProfile() {
    const name = prompt('Yangi ismingiz:', currentUser?.user_metadata?.full_name || '');
    if (name) {
        // Supabase'da yangilash
        showToast('Profil yangilandi', 'success');
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================
function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) container.scrollTop = container.scrollHeight;
}

function clearChat() {
    if (confirm('Barcha xabarlar o\'chirilsinmi? (Faqat sizning ko\'rishingizdan)')) {
        document.getElementById('messages-container').innerHTML = '';
        showToast('Chat tozalandi', 'info');
    }
}

// ============================================
// AUTH HOLATINI KUZATISH
// ============================================
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        showChat();
        loadUserProfile();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showAuth();
    }
});

// ============================================
// SAQLANGAN SOZLAMALARNI YUKLASH
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode').checked = true;
    }
    
    if (localStorage.getItem('animations') === 'false') {
        animationsEnabled = false;
        document.getElementById('animations').checked = false;
    }
});
// ... avvalgi kod ...

// ============================================
// SIDEBAR TOGGLE (Mobile)
// ============================================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Mobile'da sidebar tashqariga bosilganda yopish
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target)) {
        toggleSidebar();
    }
});

// ============================================
// SOCIAL LOGIN (Qo'llash)
// ============================================
async function socialLogin(provider) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================
// ORIENTATION CHANGE (Mobile)
// ============================================
window.addEventListener('orientationchange', () => {
    // 100ms kutish va scroll to'g'rilash
    setTimeout(() => {
        scrollToBottom();
        document.querySelector('.sidebar').classList.remove('open');
    }, 100);
});

// ============================================
// RESIZE HANDLER
// ============================================
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Desktop'ga qaytganida sidebar ochiq qolmasin
        if (window.innerWidth > 768) {
            document.querySelector('.sidebar').classList.remove('open');
            document.querySelector('.sidebar-overlay').classList.remove('active');
        }
    }, 250);
});