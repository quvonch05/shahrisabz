// ============================================
// SUPABASE SOZLAMALARI - O'ZINGIZNIKIRI!
// ============================================
const SUPABASE_URL = 'https://xmxlqtnmljjhnlxxnymn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhteGxxdG5tbGpqaG5seHhueW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTczNjQsImV4cCI6MjA5NTAzMzM2NH0.96GvuXxaiiMjyDb7zwbJa-rDg56La2sNFDeNgqCov3I'; // ← ANON KEY NI QO'YING!

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
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.classList.add('hidden'), 500);
        }
        checkSession();
    }, 1000);
});

// ============================================
// AUTH TEKSHIRUV
// ============================================
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            showChat();
            loadUserProfile();
        } else {
            showAuth();
        }
    } catch (err) {
        console.error('Session tekshirishda xato:', err);
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
// AUTH TABS - TO'G'RILANGAN!
// ============================================
function switchTab(tab, clickedBtn) {
    console.log('Tab o\'zgardi:', tab);
    
    // Barcha tablarni o'chirish
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    // Bosilgan tugmani aktiv qilish
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    } else {
        // Agar clickedBtn yo'q bo'lsa, birinchi tab ni topish
        const tabs = document.querySelectorAll('.tab-btn');
        if (tabs.length > 0) {
            if (tab === 'login') tabs[0].classList.add('active');
            else if (tab === 'register' && tabs.length > 1) tabs[1].classList.add('active');
        }
    }
    
    // Formani ko'rsatish
    const form = document.getElementById(tab + '-form');
    if (form) form.classList.add('active');
    
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
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ============================================
// AUTH FUNKSIYALARI - TO'G'RILANGAN!
// ============================================
async function signUp() {
    console.log('📝 signUp boshlandi...');
    
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const errorEl = document.getElementById('register-error');
    
    // Elementlar mavjudligini tekshirish
    if (!nameInput || !emailInput || !passwordInput) {
        console.error('Input elementlari topilmadi!');
        showToast('Sahifa to\'liq yuklanmagan, qayta urinib ko\'ring', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Name:', name, 'Email:', email, 'Password uzunligi:', password.length);
    
    // Validatsiya
    if (!name || !email || !password) {
        if (errorEl) errorEl.textContent = 'Barcha maydonlarni to\'ldiring!';
        showToast('Barcha maydonlarni to\'ldiring!', 'error');
        return;
    }
    
    if (password.length < 6) {
        if (errorEl) errorEl.textContent = 'Parol kamida 6 ta belgi bo\'lishi kerak!';
        showToast('Parol kamida 6 ta belgi bo\'lishi kerak!', 'error');
        return;
    }
    
    // Email formatini tekshirish
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (errorEl) errorEl.textContent = 'Noto\'g\'ri email formati!';
        showToast('Noto\'g\'ri email formati!', 'error');
        return;
    }
    
    try {
        console.log('Supabase auth.signUp chaqirilmoqda...');
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { 
                    full_name: name,
                    avatar_url: null
                },
                emailRedirectTo: window.location.origin
            }
        });
        
        console.log('Supabase javob:', { data, error });
        
        if (error) {
            throw error;
        }
        
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            // Foydalanuvchi allaqachon mavjud
            if (errorEl) errorEl.textContent = 'Bu email allaqachon ro\'yxatdan o\'tgan!';
            showToast('Bu email allaqachon ro\'yxatdan o\'tgan!', 'error');
            return;
        }
        
        // Muvaffaqiyatli!
        console.log('✅ Ro\'yxatdan o\'tish muvaffaqiyatli:', data);
        
        if (errorEl) errorEl.textContent = '';
        showToast('Tasdiqlash xati emailga yuborildi!', 'success');
        
        // Login tab'ga o'tish
        setTimeout(() => {
            const loginTab = document.querySelectorAll('.tab-btn')[0];
            if (loginTab) switchTab('login', loginTab);
        }, 2000);
        
    } catch (err) {
        console.error('❌ signUp xato:', err);
        
        let errorMessage = err.message || 'Noma\'lum xato yuz berdi';
        
        // Mashhur xatolarni tarjima qilish
        if (errorMessage.includes('User already registered')) {
            errorMessage = 'Bu email allaqachon ro\'yxatdan o\'tgan!';
        } else if (errorMessage.includes('Password should be')) {
            errorMessage = 'Parol juda oddiy, kuchliroq parol tanlang!';
        } else if (errorMessage.includes('Unable to validate')) {
            errorMessage = 'Email manzili noto\'g\'ri!';
        } else if (errorMessage.includes('network')) {
            errorMessage = 'Internet ulanishi yo\'q!';
        }
        
        if (errorEl) errorEl.textContent = errorMessage;
        showToast(errorMessage, 'error');
    }
}

async function signIn() {
    console.log('🔐 signIn boshlandi...');
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    
    if (!emailInput || !passwordInput) {
        console.error('Login inputlari topilmadi!');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Email:', email, 'Password uzunligi:', password.length);
    
    if (!email || !password) {
        if (errorEl) errorEl.textContent = 'Email va parolni kiriting!';
        showToast('Email va parolni kiriting!', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ Login muvaffaqiyatli:', data);
        
        currentUser = data.user;
        
        if (errorEl) errorEl.textContent = '';
        showToast('Xush kelibsiz, ' + (data.user.user_metadata?.full_name || email) + '!', 'success');
        
        showChat();
        loadUserProfile();
        
    } catch (err) {
        console.error('❌ signIn xato:', err);
        
        let errorMessage = err.message || 'Login xatosi';
        
        if (errorMessage.includes('Invalid login')) {
            errorMessage = 'Email yoki parol noto\'g\'ri!';
        } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'Email tasdiqlanmagan, pochtangizni tekshiring!';
        } else if (errorMessage.includes('network')) {
            errorMessage = 'Internet ulanishi yo\'q!';
        }
        
        if (errorEl) errorEl.textContent = errorMessage;
        showToast(errorMessage, 'error');
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
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
    } catch (err) {
        console.error('Social login xato:', err);
        showToast('Social login xato: ' + err.message, 'error');
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
}

// ============================================
// XABARLAR
// ============================================
async function loadMessages() {
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        allMessages = messages || [];
        renderMessages();
        
    } catch (err) {
        console.error('Xabarlarni yuklashda xato:', err);
        showToast('Xabarlarni yuklashda xato', 'error');
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
    
    realtimeChannel = supabaseClient
        .channel('public:messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' },
            async (payload) => {
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

// Enter bilan yuborish
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
});

// ============================================
// EMOJI
// ============================================
function toggleEmoji() {
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const picker = document.getElementById('emoji-picker');
    const btn = document.querySelector('.emoji-btn');
    
    if (picker && !picker.contains(e.target) && btn && !btn.contains(e.target)) {
        picker.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', () => {
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
});

// ============================================
// QIDIRISH
// ============================================
function searchMessages() {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.classList.remove('hidden');
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
    }
}

function closeSearch() {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.classList.add('hidden');
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        renderMessages();
    }
}

function filterMessages() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        renderMessages(searchInput.value);
    }
}

// ============================================
// NAVIGATION
// ============================================
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const sectionEl = document.getElementById(section + '-area');
    if (sectionEl) sectionEl.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

// Mobile'da sidebar tashqariga bosilganda yopish
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (window.innerWidth <= 768 && 
        sidebar && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && 
        menuBtn && !menuBtn.contains(e.target)) {
        toggleSidebar();
    }
});

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
    const checkbox = document.getElementById('animations');
    animationsEnabled = checkbox ? checkbox.checked : true;
    localStorage.setItem('animations', animationsEnabled);
}

function editProfile() {
    const currentName = currentUser?.user_metadata?.full_name || '';
    const name = prompt('Yangi ismingiz:', currentName);
    
    if (name && name.trim()) {
        // Profilni yangilash (agar kerak bo'lsa)
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
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 3000);
}

// ============================================
// YORDAMCHI FUNKSIYALAR
// ============================================
function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function clearChat() {
    if (confirm('Barcha xabarlar o\'chirilsinmi? (Faqat sizning ko\'rishingizdan)')) {
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
// SAQLANGAN SOZLAMALARNI YUKLASH
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Dark mode
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        const darkModeCheckbox = document.getElementById('dark-mode');
        if (darkModeCheckbox) darkModeCheckbox.checked = true;
    }
    
    // Animations
    if (localStorage.getItem('animations') === 'false') {
        animationsEnabled = false;
        const animCheckbox = document.getElementById('animations');
        if (animCheckbox) animCheckbox.checked = false;
    }
});

// ============================================
// RESPONSIVE HANDLERS
// ============================================
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
});
