// ============================================
// SUPABASE SOZLAMALARI - TO'G'RILANGAN
// ============================================
const SUPABASE_URL = 'https://xmxlqtnmljjhnlxxnymn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhteGxxdG5tbGpqaG5seHhueW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTczNjQsImV4cCI6MjA5NTAzMzM2NH0.96GvuXxaiiMjyDb7zwbJa-rDg56La2sNFDeNgqCov3I';

// ============================================
// GLOBAL O'ZGARUVCHILAR
// ============================================
let currentUser = null;
let realtimeChannel = null;
let allMessages = [];
let animationsEnabled = true;
let isOnline = true;

// ============================================
// SUPABASE CLIENT YARATISH
// ============================================
let supabaseClient;

try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        },
        global: {
            headers: {
                'x-application-name': 'chatuz'
            }
        }
    });
    console.log('✅ Supabase client yaratildi');
} catch (err) {
    console.error('❌ Supabase client xato:', err);
    showToast('Dastur ishga tushirishda xato!', 'error');
}

// ============================================
// INTERNET TEKSHIRUVI
// ============================================
function checkInternet() {
    isOnline = navigator.onLine;
    if (!isOnline) {
        showToast('Internet ulanishi yo\'q!', 'error');
    }
    return isOnline;
}

window.addEventListener('online', () => {
    isOnline = true;
    showToast('Internet ulanishi tiklandi', 'success');
});

window.addEventListener('offline', () => {
    isOnline = false;
    showToast('Internet ulanishi uzildi!', 'error');
});

// ============================================
// LOADING
// ============================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.classList.add('hidden'), 500);
        }
        
        // Internet va session tekshirish
        checkInternet();
        checkSession();
    }, 800);
});

// ============================================
// AUTH TEKSHIRUV
// ============================================
async function checkSession() {
    if (!checkInternet()) return;
    
    try {
        console.log('Session tekshirilmoqda...');
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Session xato:', error);
            showAuth();
            return;
        }
        
        if (session) {
            console.log('✅ Session topildi:', session.user.email);
            currentUser = session.user;
            showChat();
            loadUserProfile();
        } else {
            console.log('ℹ️ Session yo\'q');
            showAuth();
        }
    } catch (err) {
        console.error('❌ Session tekshirishda xato:', err);
        showAuth();
    }
}

function showAuth() {
    const authSection = document.getElementById('auth-section');
    const chatSection = document.getElementById('chat-section');
    
    if (authSection) authSection.classList.remove('hidden');
    if (chatSection) chatSection.classList.add('hidden');
}

function showChat() {
    const authSection = document.getElementById('auth-section');
    const chatSection = document.getElementById('chat-section');
    
    if (authSection) authSection.classList.add('hidden');
    if (chatSection) chatSection.classList.remove('hidden');
    
    loadMessages();
    subscribeToMessages();
}

// ============================================
// AUTH TABS
// ============================================
function switchTab(tabName) {
    console.log('Tab:', tabName);
    
    // Barcha tablarni o'chirish
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Tab tugmalarini aniqlash
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn, index) => {
        const btnText = btn.textContent.trim().toLowerCase();
        if ((tabName === 'login' && (btnText.includes('kirish') || index === 0)) ||
            (tabName === 'register' && (btnText.includes('ro\'yxat') || index === 1))) {
            btn.classList.add('active');
        }
    });
    
    // Formani ko'rsatish
    const targetForm = document.getElementById(tabName + '-form');
    if (targetForm) targetForm.classList.add('active');
    
    // Xatolarni tozalash
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Tugmani topish
    let btn = null;
    const parent = input.parentElement;
    if (parent) {
        btn = parent.querySelector('.toggle-password');
    }
    
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        }
    } else {
        input.type = 'password';
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    }
}

// ============================================
// AUTH FUNKSIYALARI - TO'LIQ TUZATILGAN
// ============================================

async function signUp() {
    console.log('=== SIGN UP BOSHLANDI ===');
    
    if (!checkInternet()) return;
    
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const errorEl = document.getElementById('register-error');
    
    // Elementlarni tekshirish
    if (!nameInput || !emailInput || !passwordInput) {
        console.error('Input elementlari topilmadi!');
        showToast('Sahifa to\'liq yuklanmagan', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Password uzunligi:', password.length);
    
    // VALIDATSIYA
    if (!name) {
        showError(errorEl, 'Ismingizni kiriting!');
        return;
    }
    
    if (!email) {
        showError(errorEl, 'Emailni kiriting!');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError(errorEl, 'Noto\'g\'ri email formati! Masalan: user@gmail.com');
        return;
    }
    
    if (!password) {
        showError(errorEl, 'Parolni kiriting!');
        return;
    }
    
    if (password.length < 6) {
        showError(errorEl, 'Parol kamida 6 ta belgi bo\'lishi kerak!');
        return;
    }
    
    // Xatoni tozalash
    if (errorEl) errorEl.textContent = '';
    
    // Buttonni disabled qilish
    const btn = document.querySelector('#register-form .auth-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';
    }
    
    try {
        console.log('Supabase ga so\'rov yuborilmoqda...');
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    full_name: name,
                    avatar_url: null
                }
            }
        });
        
        console.log('Supabase javob:', data);
        
        if (error) {
            console.error('Supabase xato:', error);
            throw error;
        }
        
        // Muvaffaqiyatli ro'yxatdan o'tish
        console.log('✅ Ro\'yxatdan o\'tish muvaffaqiyatli');
        
        // Inputlarni tozalash
        nameInput.value = '';
        emailInput.value = '';
        passwordInput.value = '';
        
        // Xabarni ko'rsatish
        showToast('Ro\'yxatdan o\'tish muvaffaqiyatli! Endi tizimga kiring.', 'success');
        
        // Login tab'ga o'tish
        setTimeout(() => {
            switchTab('login');
        }, 1500);
        
    } catch (err) {
        console.error('❌ Ro\'yxatdan o\'tish xato:', err);
        
        let errorMessage = 'Noma\'lum xato yuz berdi';
        
        if (err.message) {
            errorMessage = err.message;
        }
        
        // Xatolarni tarjima qilish
        if (errorMessage.includes('User already registered')) {
            errorMessage = 'Bu email allaqachon ro\'yxatdan o\'tgan! Kirish qismidan tizimga kiring.';
        } else if (errorMessage.includes('Password should be')) {
            errorMessage = 'Parol juda oddiy! Kamida 6 ta belgi, 1 ta katta harf va 1 ta raqam bo\'lishi kerak.';
        } else if (errorMessage.includes('Unable to validate')) {
            errorMessage = 'Email manzili noto\'g\'ri yoki server javob bermayapti!';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Internet ulanishi yo\'q yoki server vaqtinchalik ishlamayapti. Keyinroq urinib ko\'ring.';
        } else if (errorMessage.includes('timeout')) {
            errorMessage = 'So\'rov vaqti tugadi. Internet tezligini tekshiring.';
        }
        
        showError(errorEl, errorMessage);
        showToast(errorMessage, 'error');
        
    } finally {
        // Buttonni qayta yoqish
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Ro\'yxatdan o\'tish';
        }
    }
}

async function signIn() {
    console.log('=== SIGN IN BOSHLANDI ===');
    
    if (!checkInternet()) return;
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    
    if (!emailInput || !passwordInput) {
        console.error('Login inputlari topilmadi!');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Email:', email);
    
    if (!email || !password) {
        showError(errorEl, 'Email va parolni kiriting!');
        return;
    }
    
    if (errorEl) errorEl.textContent = '';
    
    // Buttonni disabled qilish
    const btn = document.querySelector('#login-form .auth-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kirilmoqda...';
    }
    
    try {
        console.log('Login so\'rovi...');
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login xato:', error);
            throw error;
        }
        
        console.log('✅ Login muvaffaqiyatli:', data.user.email);
        
        currentUser = data.user;
        
        // Inputlarni tozalash
        emailInput.value = '';
        passwordInput.value = '';
        
        showToast('Xush kelibsiz, ' + (data.user.user_metadata?.full_name || email) + '!', 'success');
        
        showChat();
        loadUserProfile();
        
    } catch (err) {
        console.error('❌ Login xato:', err);
        
        let errorMessage = 'Login xatosi';
        
        if (err.message) {
            errorMessage = err.message;
        }
        
        if (errorMessage.includes('Invalid login')) {
            errorMessage = 'Email yoki parol noto\'g\'ri! Iltimos, qayta tekshiring.';
        } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'Email tasdiqlanmagan! Iltimos, pochtangizni tekshiring yoki yangi ro\'yxatdan o\'ting.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Internet ulanishi yo\'q yoki server bilan muammo. Keyinroq urinib ko\'ring.';
        } else if (errorMessage.includes('too many requests')) {
            errorMessage = 'Juda ko\'p urinish! Iltimos, 1 daqiqa kuting.';
        }
        
        showError(errorEl, errorMessage);
        showToast(errorMessage, 'error');
        
    } finally {
        // Buttonni qayta yoqish
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Tizimga kirish';
        }
    }
}

async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        
        if (realtimeChannel) {
            supabaseClient.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }
        
        showToast('Tizimdan chiqdingiz', 'info');
        showAuth();
        
    } catch (err) {
        console.error('SignOut xato:', err);
        showToast('Chiqishda xato: ' + err.message, 'error');
    }
}

// ============================================
// SOCIAL LOGIN
// ============================================
async function socialLogin(provider) {
    if (!checkInternet()) return;
    
    try {
        showToast(provider + ' orqali ulanish...', 'info');
        
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
        
        if (error) throw error;
        
    } catch (err) {
        console.error('Social login xato:', err);
        showToast(provider + ' orqali ulanishda xato: ' + err.message, 'error');
    }
}

// ============================================
// USER PROFILE
// ============================================
function loadUserProfile() {
    if (!currentUser) return;
    
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');
    
    const displayName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3ecf8e&color=fff&size=128`;
    
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.src = avatarUrl;
    
    console.log('Profil yuklandi:', displayName);
}

// ============================================
// XABARLAR
// ============================================
async function loadMessages() {
    if (!checkInternet()) return;
    
    try {
        console.log('Xabarlar yuklanmoqda...');
        
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Xabarlar xato:', error);
            showToast('Xabarlarni yuklashda xato: ' + error.message, 'error');
            return;
        }
        
        allMessages = messages || [];
        console.log('✅ Xabarlar yuklandi:', allMessages.length);
        
        renderMessages();
        
    } catch (err) {
        console.error('Xabarlar yuklashda xato:', err);
        showToast('Xabarlarni yuklashda xato!', 'error');
    }
}

function renderMessages(filter = '') {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filtered = filter 
        ? allMessages.filter(m => m.content.toLowerCase().includes(filter.toLowerCase()))
        : allMessages;
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comment-slash"></i>
                <h3>Xabarlar yo'q</h3>
                <p>Birinchi xabaringizni yozing</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(msg => displayMessage(msg));
    scrollToBottom();
}

function displayMessage(msg) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    const isOwn = currentUser && msg.user_id === currentUser.id;
    
    const div = document.createElement('div');
    div.className = `message ${isOwn ? 'own' : 'other'}`;
    
    if (animationsEnabled) {
        div.style.animation = 'messageAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
    
    const time = new Date(msg.created_at).toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const senderName = msg.sender_name || 'Noma\'lum';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=${isOwn ? '3ecf8e' : '667eea'}&color=fff&size=64`;
    
    div.innerHTML = `
        <div class="message-header">
            <img src="${avatarUrl}" class="message-avatar" alt="" loading="lazy">
            <span class="message-name">${escapeHtml(senderName)}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
        ${isOwn ? '<div class="message-status"><i class="fas fa-check-double"></i> Yuborildi</div>' : ''}
    `;
    
    container.appendChild(div);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// REALTIME
// ============================================
function subscribeToMessages() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
    }
    
    console.log('Realtime obuna boshlanmoqda...');
    
    realtimeChannel = supabaseClient
        .channel('public:messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => {
                console.log('Yangi xabar:', payload.new);
                const msg = payload.new;
                allMessages.push(msg);
                displayMessage(msg);
                scrollToBottom();
                
                if (currentUser && msg.user_id !== currentUser.id) {
                    showToast(`${msg.sender_name}: ${msg.content.substring(0, 30)}...`, 'info');
                }
            }
        )
        .subscribe((status) => {
            console.log('Realtime status:', status);
        });
}

// ============================================
// XABAR YUBORISH
// ============================================
async function sendMessage() {
    const input = document.getElementById('message-input');
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) return;
    
    if (!currentUser) {
        showToast('Avval tizimga kiring!', 'error');
        return;
    }
    
    if (!checkInternet()) return;
    
    const senderName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    
    try {
        const { error } = await supabaseClient
            .from('messages')
            .insert([{
                content: content,
                user_id: currentUser.id,
                sender_name: senderName
            }]);
        
        if (error) throw error;
        
        input.value = '';
        
    } catch (err) {
        console.error('Xabar yuborishda xato:', err);
        showToast('Xabar yuborishda xato: ' + err.message, 'error');
    }
}

// ============================================
// EMOJI
// ============================================
function toggleEmoji() {
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.classList.toggle('hidden');
}

// ============================================
// QIDIRISH
// ============================================
function searchMessages() {
    const bar = document.getElementById('search-bar');
    if (bar) bar.classList.remove('hidden');
    
    const input = document.getElementById('search-input');
    if (input) input.focus();
}

function closeSearch() {
    const bar = document.getElementById('search-bar');
    if (bar) bar.classList.add('hidden');
    
    const input = document.getElementById('search-input');
    if (input) {
        input.value = '';
        renderMessages();
    }
}

function filterMessages() {
    const input = document.getElementById('search-input');
    if (input) renderMessages(input.value);
}

// ============================================
// NAVIGATION
// ============================================
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const sectionEl = document.getElementById(section + '-area');
    if (sectionEl) sectionEl.classList.add('active');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
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
    const cb = document.getElementById('animations');
    animationsEnabled = cb ? cb.checked : true;
    localStorage.setItem('animations', animationsEnabled);
}

function editProfile() {
    const currentName = currentUser?.user_metadata?.full_name || '';
    const name = prompt('Yangi ismingiz:', currentName);
    
    if (name && name.trim()) {
        showToast('Profil yangilandi', 'success');
        loadUserProfile();
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 3000);
}

// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================
function showError(element, message) {
    if (element) element.textContent = message;
    console.error('Xato:', message);
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) container.scrollTop = container.scrollHeight;
}

function clearChat() {
    if (confirm('Barcha xabarlar o\'chirilsinmi?')) {
        const container = document.getElementById('messages-container');
        if (container) {
            container.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-hand-wave"></i>
                    <h3>Xush kelibsiz!</h3>
                    <p>Birinchi xabaringizni yozing</p>
                </div>
            `;
        }
        showToast('Chat tozalandi', 'info');
    }
}

// ============================================
// AUTH HOLATINI KUZATISH
// ============================================
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth holati:', event);
    
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
// DOM EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Enter bilan xabar yuborish
    const msgInput = document.getElementById('message-input');
    if (msgInput) {
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    // Emoji picker
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker) {
        emojiPicker.addEventListener('click', (e) => {
            if (e.target.tagName === 'SPAN') {
                const input = document.getElementById('message-input');
                if (input) {
                    input.value += e.target.textContent;
                    input.focus();
                }
            }
        });
    }
    
    // Tashqariga bosilganda emoji yopish
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emoji-picker');
        const btn = document.querySelector('.emoji-btn');
        if (picker && !picker.classList.contains('hidden') && 
            !picker.contains(e.target) && btn && !btn.contains(e.target)) {
            picker.classList.add('hidden');
        }
    });
    
    // Mobile sidebar yopish
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const menuBtn = document.querySelector('.menu-btn');
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
            toggleSidebar();
        }
    });
    
    // Saqlangan sozlamalar
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const cb = document.getElementById('dark-mode');
        if (cb) cb.checked = true;
    }
    
    if (localStorage.getItem('animations') === 'false') {
        animationsEnabled = false;
        const cb = document.getElementById('animations');
        if (cb) cb.checked = false;
    }
});

// ============================================
// RESPONSIVE
// ============================================
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
});
