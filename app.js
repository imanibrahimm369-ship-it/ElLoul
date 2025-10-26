// Import all Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail, updatePassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// (تعديل) إضافة getDocs لجلب البيانات مرة واحدة
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, deleteDoc, writeBatch, getDocs, deleteField, query, orderBy, runTransaction, where, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, uploadBytes } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBgzhSlzeVlqTrqefTP0rqAnlzBEKEDm6o",
    authDomain: "elloul-e82d8.firebaseapp.com",
    projectId: "elloul-e82d8",
    storageBucket: "elloul-e82d8.appspot.com",
    messagingSenderId: "190409612659",
    appId: "1:190409612659:web:cffcb1c4615502ee347906"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

enableIndexedDbPersistence(db)
    .then(() => {
        console.log("Firestore: Offline persistence enabled successfully.");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Firestore: Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code == 'unimplemented') {
            console.warn("Firestore: The current browser does not support all of the features required to enable persistence.");
        } else {
            console.error("Firestore: Error enabling persistence:", err);
        }
    });

const App = {
    state: {
        user: { isLoggedIn: false, isPending: false, data: null, uid: null, role: null, phone: null, avatarUrl: null, unsubscribe: null },
        inventory: {
            productsCollection: collection(db, "products"),
            ordersCollection: collection(db, "orders"),
            usersCollection: collection(db, "users"),
            isLoading: true, fullInventory: [], categorizedProducts: {}, currentFilteredList: [],
            // (تعديل) لم نعد بحاجة لهذا المتغير
            // unsubscribeProducts: null, 
            displayOffset: 0, currentSort: 'default', observer: null
        },
        cart: [],
        admin: { 
            unsubscribeUsers: null,
            unsubscribePendingUsers: null,
            unsubscribePendingOrders: null
        },
        notifications: {
            pendingUsers: 0,
            pendingOrders: 0
        },
        ui: {
            newAvatarDataUrl: null,
            newAvatarUrl: null,
            notyf: null, 
            currentPage: 'auth-page'
        },
        deferredPrompt: null
    },
    config: {
        TELEGRAM_BOT_TOKEN: '5597462927:AAElTlyh-XnhD3--1GS28iUPJc8XzTGDjpM',
        TELEGRAM_CHAT_ID: '-1003038849735',
        BATCH_SIZE: 40,
        CATEGORY_KEYWORDS: { 'العناية بالشعر': ['شامبو', 'بلسم', 'زيت', 'كريم شعر', 'صبغه', 'جل', 'جيل', 'حمام كريم', 'سيرم', 'هير', 'فاتيكا', 'صانسيلk', 'لوريال', 'بانتين', 'كلير', 'دابر املا', 'ترزمي', 'باليت', 'فرد شعر', 'ملمع', 'اي كرياتين', 'هيربال ايسنز', 'تريشوب', 'كازانوفا'], 'العناية بالبشرة': ['كريم', 'غسول', 'ماسك', 'صابون', 'لوشن', 'مرطب', 'تفتيح', 'واقي', 'صنفره', 'جلسرين', 'نيفيا', 'دوف', 'ايفا', 'غارنيه', 'فازلين', 'اسیتون', 'مزيل مكياج', 'بي وايت', 'سكين كلينيك', 'كولاجين', 'جليسوليد', 'سبوتليس', 'ديرما'], 'العناية بالطفل': ['بيبي', 'اطفال', 'نونو', 'بامبرز', 'مولفكس', 'فاين بيبي', 'ببرونه', 'سكاته', 'حفاضه', 'جونسون', 'بندولين', 'اي باتش اطفال', 'سانوسان', 'كيدز', 'سيتي بيبي'], 'العناية الشخصية': ['مزيل', 'سبراي', 'معجون', 'فرشاة اسنان', 'شفره', 'حلاقه', 'جيليت', 'لورد', 'اكس', 'ريكسونا', 'فا', 'سويت', 'واكس', 'فوط', 'الويز', 'سوفي', 'برايفت', 'مولبيد', 'بودره', 'ديتول', 'معطر فم', 'سيجنال', 'سنسوداين', 'كلوس اب', 'خيط اسنان', 'عازل طبي'], 'مستلزمات طبية': ['بلاستر', 'شاش', 'قطن', 'رباط', 'سرنجة', 'جهاز ضغط', 'ترمومتر', 'كمامة', 'كحول', 'بيتادين', 'قسطرة', 'جبيرة', 'حزام', 'انكل', 'ركبه', 'كوع', 'فيكريل', 'برولين', 'كانيولا', 'دريسنج', 'قربة', 'مبوله'], 'العطور': ['برفان', 'كولونيا', 'عطر', 'اسبلاش', 'فوج'], 'المنزل والمبيدات': ['بايجون', 'ريد', 'جليد', 'ملمع', 'مناديل', 'ديتول', 'راجون', 'كيروكس', 'لزقة فار', 'صراصير'] },
        CATEGORY_ICONS: {'كل الأصناف':'fa-boxes-stacked','العناية بالشعر':'fa-cut','العناية بالبشرة':'fa-spa','العناية بالطفل':'fa-baby','العناية الشخصية':'fa-user-shield','مستلزمات طبية':'fa-briefcase-medical','العطور':'fa-spray-can-sparkles','المنزل والمبيدات':'fa-bug-slash','متنوع':'fa-shapes'},
        CATEGORY_SVG_MAP: {
            'مستلزمات طبية': '#svg-icon-pills',
            'العناية بالشعر': '#svg-icon-shampoo',
            'العناية بالبشرة': '#svg-icon-shampoo',
            'العناية بالطفل': '#svg-icon-baby',
            'العناية الشخصية': '#svg-icon-shampoo',
            'المنزل والمبيدات': '#svg-icon-bug',
            'العطور': '#svg-icon-shampoo',
            'متنوع': '#svg-icon-box',
            'كل الأصناف': '#svg-icon-box'
        }
    },
    elements: {},

    init() {
        this.state.ui.notyf = new Notyf({
            duration: 3000,
            position: { x: 'left', y: 'bottom' }, 
            ripple: true,
            dismissible: true,
            types: [
                { type: 'success', background: '#16a34a', icon: { className: 'fas fa-check-circle', tagName: 'i', text: '' } },
                { type: 'error', background: '#dc2626', icon: { className: 'fas fa-exclamation-circle', tagName: 'i', text: '' } },
                { type: 'info', background: '#3b82f6', icon: { className: 'fas fa-info-circle', tagName: 'i', text: '' } }
            ]
        });

        this.cacheElements();
        this.listenForAuthState(); 
        this.setupGlobalEventListeners(); 
        this.setupPwaInstall(); 
    },

    cacheElements() {
        this.elements = {
            // حاويات الصفحات
            authPage: document.getElementById('auth-page'),
            pendingPage: document.getElementById('pending-page'),
            appPage: document.getElementById('app-page'),
            cartPage: document.getElementById('cart-page'),

            // عناصر صفحة المصادقة
            authTitle: document.getElementById('auth-title'),
            authSubtitle: document.getElementById('auth-subtitle'),
            loginForm: document.getElementById('login-form'),
            signupForm: document.getElementById('signup-form'),
            authTabLogin: document.getElementById('auth-tab-login'),
            authTabSignup: document.getElementById('auth-tab-signup'),
            authTabHighlighter: document.getElementById('auth-tab-highlighter'),
            authFormContainer: document.getElementById('auth-form-container'),
            forgotPasswordLink: document.getElementById('forgot-password-link'),
            
            // عناصر صفحة الانتظار
            pendingLogoutButton: document.getElementById('pending-logout-button'),
            
            // عناصر صفحة التطبيق (المخزن)
            appContainer: document.getElementById('app-page'), 
            loader: document.getElementById('loader'),
            inventoryGrid: document.getElementById('inventory-grid'),
            categoryTabsContainer: document.getElementById('category-tabs-container'),
            noResults: document.getElementById('no-results'),
            searchInput: document.getElementById('searchInput'),
            clearSearchBtn: document.getElementById('clearSearchBtn'),
            addProductBtn: document.getElementById('addProductBtn'),
            currentYear: document.getElementById('current-year'),
            avatarContainer: document.getElementById('avatar-container'),
            userAvatarButton: document.getElementById('user-avatar-button'),
            avatarMenu: document.getElementById('avatar-menu'),
            avatarMenuName: document.getElementById('avatar-menu-name'),
            avatarMenuEmail: document.getElementById('avatar-menu-email'),
            avatarMenuLevelName: document.getElementById('avatar-menu-level-name'),
            avatarSettingsBtn: document.getElementById('avatar-settings-btn'),
            avatarAdminBtn: document.getElementById('avatar-admin-btn'),
            avatarLogoutBtn: document.getElementById('avatar-logout-btn'),
            currentCategoryTitle: document.getElementById('current-category-title'),
            sortBtn: document.getElementById('sort-btn'),
            sortDropdown: document.getElementById('sort-dropdown'),
            sortLabel: document.getElementById('sort-label'),
            lazyLoader: document.getElementById('lazy-loader'),
            sentinel: document.getElementById('sentinel'),
            installToast: document.getElementById('install-toast'),
            installBtn: document.getElementById('install-btn'),
            dismissInstallBtn: document.getElementById('dismiss-install-btn'),
            cartBtn: document.getElementById('cart-btn'),
            cartCount: document.getElementById('cart-count'),
            sitemapLink: document.getElementById('sitemap-link'),
            footerBrandLink: document.getElementById('footer-brand-link'),

            // عناصر صفحة السلة
            cartBackBtn: document.getElementById('cart-back-btn'),
            cartEmptyMsg: document.getElementById('cart-empty-msg'),
            cartContent: document.getElementById('cart-content'),
            cartItemsList: document.getElementById('cart-items-list'),
            cartSummary: document.getElementById('cart-summary'),
            cartSubtotalPrice: document.getElementById('cart-subtotal-price'),
            cartTotalPrice: document.getElementById('cart-total-price'),
            checkoutBtn: document.getElementById('checkout-btn'),
            
            // عناصر اللوحات المنبثقة (Modals)
            adminPanel: document.getElementById('admin-panel'),
            adminUsersList: document.getElementById('admin-users-list'),
            closeAdminPanel: document.getElementById('close-admin-panel'),
            settingsPanel: document.getElementById('settings-panel'),
            closeSettingsPanel: document.getElementById('close-settings-panel'),
            settingsTabs: document.querySelectorAll('.settings-tab'),
            settingsContentPanes: document.querySelectorAll('.settings-content-pane'),
            profileSettingsForm: document.getElementById('profile-settings-form'),
            settingsName: document.getElementById('settings-name'),
            settingsPhone: document.getElementById('settings-phone'),
            settingsEmail: document.getElementById('settings-email'),
            saveProfileBtn: document.getElementById('save-profile-btn'),
            passwordSettingsForm: document.getElementById('password-settings-form'),
            settingsNewPassword: document.getElementById('settings-new-password'),
            settingsConfirmPassword: document.getElementById('settings-confirm-password'),
            savePasswordBtn: document.getElementById('save-password-btn'),
            avatarUploadSection: document.getElementById('avatar-upload-section'),
            avatarPreview: document.getElementById('avatar-preview'),
            avatarFileInput: document.getElementById('avatar-file-input'),
            avatarUrlInput: document.getElementById('avatar-url-input'),
            sitemapPanel: document.getElementById('sitemap-panel'),
            closeSitemapPanel: document.getElementById('close-sitemap-panel'),
            sitemapContent: document.getElementById('sitemap-content'),
        };
    },

    // =================================================================
    // 1. نظام الراوتر والتحكم بالصفحات
    // =================================================================

    navigateTo(pageId) {
        if (!pageId) return;
        document.querySelectorAll('.page-container').forEach(page => {
            page.classList.add('hidden');
        });
        const targetPage = this.elements[pageId];
        if (targetPage) {
            targetPage.classList.remove('hidden');
            this.state.ui.currentPage = pageId;
            window.scrollTo(0, 0); 
        } else {
            console.error(`Page not found: ${pageId}`);
            this.elements.authPage.classList.remove('hidden'); 
        }
    },

    listenForAuthState() {
        onAuthStateChanged(auth, (firebaseUser) => {
            if (this.state.user.unsubscribe) this.state.user.unsubscribe();
            if (this.state.admin.unsubscribePendingUsers) this.state.admin.unsubscribePendingUsers();
            if (this.state.admin.unsubscribePendingOrders) this.state.admin.unsubscribePendingOrders();

            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                this.state.user.unsubscribe = onSnapshot(userDocRef, (userDoc) => {
                    if (userDoc.exists() && userDoc.data().status === 'approved') {
                        const userData = userDoc.data();
                        this.state.user = { 
                            isLoggedIn: true, 
                            isPending: false, 
                            ...userData, 
                            uid: firebaseUser.uid 
                        };
                        this.navigateTo('app-page');
                        this.initInventoryApp(); 
                        this.showWelcomeMessage(this.state.user.name);
                    } else if (userDoc.exists()) {
                        this.state.user = { isLoggedIn: false, isPending: true, data: null };
                        this.navigateTo('pending-page');
                        this.setupPendingPageListeners(); 
                    } else {
                        console.warn(`User ${firebaseUser.uid} is authenticated but no document exists.`);
                        this.navigateTo('auth-page'); 
                        this.initAuthPage(); 
                    }
                }, (error) => {
                    console.error("Error listening to user doc:", error);
                    this.state.user = { isLoggedIn: false, isPending: false, data: null, uid: null, role: null };
                    this.navigateTo('auth-page');
                    this.initAuthPage();
                });
            } else {
                this.state.user = { isLoggedIn: false, isPending: false, data: null, uid: null, role: null };
                this.navigateTo('auth-page');
                this.initAuthPage();
                // (تعديل) إزالة كود إلغاء الاشتراك غير الضروري
                // if (this.state.inventory.unsubscribeProducts) { ... }
            }
        });
    },

    // =================================================================
    // 2. إعداد المستمعين (Event Listeners) لكل صفحة
    // =================================================================

    initAuthPage() {
        if (this.elements.loginForm.dataset.initialized) return; 
        
        this.elements.authTabLogin.addEventListener('click', () => this.switchAuthTab('login'));
        this.elements.authTabSignup.addEventListener('click', () => this.switchAuthTab('signup'));
        
        document.querySelectorAll('.password-icon').forEach(icon => { 
            icon.addEventListener('click', () => { 
                const targetInput = document.getElementById(icon.dataset.target); 
                targetInput.type = targetInput.type === 'password' ? 'text' : 'password'; 
                icon.classList.toggle('fa-eye'); 
                icon.classList.toggle('fa-eye-slash'); 
            }); 
        });

        this.elements.loginForm.addEventListener('submit', this.handleLogin.bind(this));
        this.elements.signupForm.addEventListener('submit', this.handleSignup.bind(this));
        this.elements.forgotPasswordLink.addEventListener('click', this.handlePasswordReset.bind(this));
        
        if (this.elements.loginForm) {
            this.elements.authFormContainer.style.height = this.elements.loginForm.scrollHeight + 'px';
        }

        this.elements.loginForm.dataset.initialized = 'true';
    },

    setupPendingPageListeners() {
        if (this.elements.pendingLogoutButton.dataset.initialized) return;
        this.elements.pendingLogoutButton.addEventListener('click', () => signOut(auth));
        this.elements.pendingLogoutButton.dataset.initialized = 'true';
    },

    initInventoryApp() {
        if (this.elements.appContainer.dataset.initialized) return; 

        this.renderUserAvatar();
        
        this.elements.userAvatarButton.onclick = () => this.elements.avatarMenu.classList.toggle('hidden');
        this.elements.avatarLogoutBtn.onclick = () => { signOut(auth); this.elements.avatarMenu.classList.add('hidden'); };
        
        if (this.state.user.role === 'admin') {
            this.elements.avatarAdminBtn.classList.remove('hidden');
            this.elements.addProductBtn.classList.add('flex');
            this.listenForNotifications();
        } else {
            this.elements.avatarAdminBtn.classList.add('hidden');
            this.elements.addProductBtn.classList.remove('flex');
            this.stopListeningForNotifications();
        }

        this.elements.inventoryGrid.onclick = this.handleGridClick.bind(this);
        this.elements.categoryTabsContainer.onclick = this.handleCategoryClick.bind(this);
        this.elements.searchInput.oninput = this.handleSearchInput.bind(this);
        this.elements.clearSearchBtn.onclick = this.clearSearch.bind(this);
        this.elements.sortBtn.onclick = this.toggleSortDropdown.bind(this);
        this.elements.sortDropdown.onclick = this.handleSortSelection.bind(this);
        
        // (تعديل) استدعاء الدالة الجديدة
        this.fetchProductsOnce(); 
        this.setupObserver();
        
        this.elements.appContainer.dataset.initialized = 'true';
    },

    setupCartPageListeners() {
        if (this.elements.cartPage.dataset.initialized) return;
        this.elements.cartBackBtn.onclick = () => this.navigateTo('app-page');
        this.elements.cartItemsList.onclick = this.handleCartClick.bind(this);
        this.elements.checkoutBtn.onclick = this.handleCheckout.bind(this);
        this.elements.cartPage.dataset.initialized = 'true';
    },

    setupGlobalEventListeners() {
        // (تعديل) ربط زر السلة الرئيسي بالراوتر
        this.elements.cartBtn.onclick = () => {
            this.navigateTo('cart-page');
            this.renderCartPage(); // اعرض محتويات السلة عند الانتقال
            this.setupCartPageListeners(); // قم بتهيئة مستمعين السلة إذا لم يتم ذلك
        };

        // قائمة الأفاتار
        this.elements.avatarSettingsBtn.onclick = () => { this.showSettingsPanel(); this.elements.avatarMenu.classList.add('hidden'); };
        this.elements.avatarAdminBtn.onclick = () => { this.showAdminPanel(); this.elements.avatarMenu.classList.add('hidden'); };
        document.addEventListener('click', (e) => {
            if (this.elements.avatarContainer && !this.elements.avatarContainer.contains(e.target) && !this.elements.avatarMenu.classList.contains('hidden')) {
                this.elements.avatarMenu.classList.add('hidden');
            }
        });

        // لوحة الإعدادات
        this.elements.closeSettingsPanel.onclick = this.closeSettingsPanel.bind(this);
        this.elements.settingsPanel.onclick = (e) => { if (e.target === this.elements.settingsPanel) this.closeSettingsPanel(); };
        this.elements.profileSettingsForm.onsubmit = this.handleUpdateProfile.bind(this);
        this.elements.passwordSettingsForm.onsubmit = this.handleUpdatePassword.bind(this);
        this.setupSettingsTabs();
        this.setupAvatarUploadEvents();

        // لوحة الأدمن
        this.elements.closeAdminPanel.onclick = this.closeAdminPanel.bind(this);
        this.elements.adminPanel.onclick = (e) => { if (e.target === this.elements.adminPanel) this.closeAdminPanel(); };

        // خريطة الموقع والفوتر
        this.elements.sitemapLink.onclick = this.showSitemapPanel.bind(this);
        this.elements.closeSitemapPanel.onclick = this.closeSitemapPanel.bind(this);
        this.elements.sitemapPanel.onclick = (e) => { if (e.target === this.elements.sitemapPanel) this.closeSitemapPanel(); };
        this.elements.sitemapContent.onclick = this.handleSitemapClick.bind(this);
        this.elements.currentYear.textContent = new Date().getFullYear();

        // زر إضافة منتج (للأدمن)
        this.elements.addProductBtn.onclick = () => this.showProductModal();
    },

    setupPwaInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.state.deferredPrompt = e;
            console.log("PWA install prompt captured.");
            if (localStorage.getItem('installPromptShown') !== 'true' && this.elements.installToast) {
                this.elements.installToast.classList.remove('hidden'); 
                this.elements.installToast.classList.add('install-toast-show'); 
            }
        });

        if(this.elements.installBtn) this.elements.installBtn.addEventListener('click', this.handleInstallClick.bind(this));
        if(this.elements.dismissInstallBtn) this.elements.dismissInstallBtn.addEventListener('click', this.handleInstallDismiss.bind(this));
    },

    // =================================================================
    // 3. منطق المصادقة (Auth Logic)
    // =================================================================

    switchAuthTab(tab) {
        const isLogin = tab === 'login';
        this.elements.authTabLogin.classList.toggle('active', isLogin);
        this.elements.authTabSignup.classList.toggle('active', !isLogin);
        
        this.elements.loginForm.classList.toggle('form-active', isLogin);
        this.elements.signupForm.classList.toggle('form-active', !isLogin);

        this.elements.authTitle.textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
        this.elements.authSubtitle.textContent = isLogin ? 'أهلاً بك في صيدلية د. سيد' : 'لنبدأ رحلتك معنا!';
        
        this.elements.authTabHighlighter.style.transform = isLogin ? 'translateX(0%)' : 'translateX(-100%)'; 
        this.elements.authFormContainer.style.height = (isLogin ? this.elements.loginForm.scrollHeight : this.elements.signupForm.scrollHeight) + 'px';
    },

    async handleLogin(e) { e.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; const remember = document.getElementById('remember-me').checked; const button = document.getElementById('login-button'); this.setLoading(button, true, 'جاري الدخول...'); try { await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence); await signInWithEmailAndPassword(auth, email, password); } catch (error) { Swal.fire('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'error'); } finally { this.setLoading(button, false, 'دخول'); } },
    
    async handleSignup(e) { 
        e.preventDefault(); 
        const name = document.getElementById('signup-name').value; 
        const email = document.getElementById('signup-email').value; 
        const phone = document.getElementById('signup-phone').value; 
        const password = document.getElementById('signup-password').value; 
        const button = document.getElementById('signup-button'); 
        this.setLoading(button, true, 'جاري الإنشاء...'); 
        
        try { 
            const cred = await createUserWithEmailAndPassword(auth, email, password); 
            try {
                await setDoc(doc(db, "users", cred.user.uid), { name, email, phone: phone || "", uid: cred.user.uid, role: 'user', status: 'pending', createdAt: new Date(), avatarUrl: null }); 
                const telegramMessage = `👤 مستخدم جديد قيد المراجعة\n\nالاسم: ${name}\nالإيميل: ${email}\nالهاتف: ${phone || 'لا يوجد'}`;
                await this.sendTelegramMessage(telegramMessage);
            } catch (setDocError) {
                console.error("Error creating user document in Firestore:", setDocError);
                Swal.fire('خطأ في التسجيل', 'تم إنشاء الحساب ولكن فشل حفظ البيانات.', 'error');
            }
        } catch (error) { 
            Swal.fire('خطأ', 'حدث خطأ. تأكد أن كلمة المرور 6 حروف على الأقل والإيميل غير مستخدم.', 'error'); 
        } finally { 
            this.setLoading(button, false, 'إنشاء الحساب'); 
        } 
    },

    async handlePasswordReset(e) { e.preventDefault(); const { value: email } = await Swal.fire({ title: 'إعادة تعيين كلمة المرور', input: 'email', inputLabel: 'البريد الإلكتروني المسجل به', inputPlaceholder: 'ادخل بريدك الإلكتروني', showCancelButton: true, confirmButtonText: 'إرسال رابط الاستعادة', cancelButtonText: 'إلغاء', customClass: { popup: 'rounded-lg' } }); if (email) try { await sendPasswordResetEmail(auth, email); Swal.fire('تم الإرسال!', 'تفقد بريدك الإلكتروني.', 'success'); } catch (error) { Swal.fire('خطأ', 'لم نتمكن من إرسال البريد.', 'error'); } },
    
    setLoading(button, isLoading, text) { if (!button) return; button.disabled = isLoading; button.innerHTML = isLoading ? `<i class="fas fa-circle-notch fa-spin mr-2"></i> ${text}` : text; },

    // =================================================================
    // 4. منطق المخزن (App Page Logic)
    // =================================================================

    showWelcomeMessage(name) {
        const welcomeKey = `welcome_${this.state.user.uid}`; 
        if (!localStorage.getItem(welcomeKey)) { 
            this.state.ui.notyf.success(`أهلاً بك، ${name.split(' ')[0]}!`);
            localStorage.setItem(welcomeKey, 'true'); 
        }
    },

    renderUserAvatar() {
        // ... (الكود كما هو - بدون تغيير)
        const user = this.state.user;
        const button = this.elements.userAvatarButton;
        let iconClass, buttonClass, levelName;
        const isSuperAdmin = user.role === 'admin' && !user.promotedBy;
        if (isSuperAdmin) {
            iconClass = 'fa-crown'; buttonClass = 'avatar-super-admin'; levelName = 'المستوى 99 (الأدمن الأساسي)';
        } else if (user.role === 'admin') {
            iconClass = 'fa-user-shield'; buttonClass = 'avatar-admin'; levelName = 'المستوى 50 (أدمن)';
        } else {
            iconClass = 'fa-user'; buttonClass = 'avatar-user'; levelName = 'المستوى 1 (مستخدم)';
        }
        button.className = `avatar-button ${buttonClass}`;
        if (user.avatarUrl) {
            button.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\'fas ${iconClass}\'></i>';">`;
        } else {
            button.innerHTML = `<i class="fas ${iconClass}"></i>`;
        }
        this.elements.avatarMenuName.textContent = user.name || 'مستخدم';
        this.elements.avatarMenuEmail.textContent = user.email || '...';
        this.elements.avatarMenuLevelName.textContent = levelName;
    },

    listenForNotifications() {
        // ... (الكود كما هو - بدون تغيير)
        const pendingUsersQuery = query(this.state.inventory.usersCollection, where("status", "==", "pending"));
        this.state.admin.unsubscribePendingUsers = onSnapshot(pendingUsersQuery, (snapshot) => { this.state.notifications.pendingUsers = snapshot.size; this.updateNotificationBadge(); });
        const pendingOrdersQuery = query(this.state.inventory.ordersCollection, where("status", "==", "pending_approval")); 
        this.state.admin.unsubscribePendingOrders = onSnapshot(pendingOrdersQuery, (snapshot) => { this.state.notifications.pendingOrders = snapshot.size; this.updateNotificationBadge(); });
    },
    stopListeningForNotifications() {
        // ... (الكود كما هو - بدون تغيير)
        if (this.state.admin.unsubscribePendingUsers) this.state.admin.unsubscribePendingUsers();
        if (this.state.admin.unsubscribePendingOrders) this.state.admin.unsubscribePendingOrders();
        this.state.notifications = { pendingUsers: 0, pendingOrders: 0 };
        this.updateNotificationBadge();
    },
    updateNotificationBadge() {
        // ... (الكود كما هو - بدون تغيير)
        const totalNotifications = this.state.notifications.pendingUsers + this.state.notifications.pendingOrders;
        const adminBtnIcon = this.elements.avatarAdminBtn.querySelector('i');
        if (totalNotifications > 0) {
            adminBtnIcon.classList.add('has-notification');
        } else {
            adminBtnIcon.classList.remove('has-notification');
        }
    },
    
    /**
     * (تعديل) جلب المنتجات مرة واحدة عند التحميل
     */
    async fetchProductsOnce() {
        this.state.inventory.isLoading = true;
        this.elements.loader.style.display = 'grid'; // إظهار شاشة التحميل الهيكلية
        
        try {
            // (جديد) استخدام getDocs لجلب البيانات مرة واحدة
            const querySnapshot = await getDocs(this.state.inventory.productsCollection);
            
            this.state.inventory.fullInventory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.processAndCategorize();
            this.filterAndRender(); // سيعرض المنتجات ويخفي شاشة التحميل
            
        } catch (error) {
            console.error("Firestore fetch error:", error); 
            this.elements.loader.innerHTML = '<p class="text-red-500">حدث خطأ فادح أثناء تحميل البيانات. يرجى تحديث الصفحة.</p>';
        } finally {
            this.state.inventory.isLoading = false;
            this.elements.loader.style.display = 'none'; // إخفاء شاشة التحميل
        }
    },
    
    processAndCategorize() { 
        // ... (الكود كما هو - بدون تغيير)
        const data = this.state.inventory.fullInventory; const categories = { 'كل الأصناف': [...data] }; Object.keys(this.config.CATEGORY_KEYWORDS).forEach(cat => { categories[cat] = []; }); categories['متنوع'] = []; data.forEach(product => { const category = this.getCategory(product['الصنف']); if (!categories[category]) categories[category] = []; categories[category].push(product); }); this.state.inventory.categorizedProducts = categories; 
    },
    filterAndRender() { 
        // ... (الكود كما هو - بدون تغيير)
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim(); const activeCategory = this.state.inventory.activeCategory || 'كل الأصناف'; let sourceList = searchTerm ? this.state.inventory.fullInventory.filter(item => (item['الصنف'] || '').toLowerCase().includes(searchTerm)) : (this.state.inventory.categorizedProducts[activeCategory] || []); let sortedList = [...sourceList]; switch (this.state.inventory.currentSort) { case 'price-desc': sortedList.sort((a, b) => Number(b['السعر']) - Number(a['السعر'])); break; case 'price-asc': sortedList.sort((a, b) => Number(a['السعر']) - Number(b['السعر'])); break; case 'name-asc': sortedList.sort((a, b) => (a['الصنف']||'').localeCompare(b['الصنف']||'', 'ar')); break; case 'name-desc': sortedList.sort((a, b) => (b['الصنف']||'').localeCompare(a['الصنف']||'', 'ar')); break; } this.state.inventory.currentFilteredList = sortedList; this.elements.inventoryGrid.innerHTML = ''; this.state.inventory.displayOffset = 0; this.loadMoreItems(); this.updateCategoryTabs(); this.elements.noResults.style.display = sortedList.length === 0 ? 'block' : 'none'; this.elements.currentCategoryTitle.textContent = searchTerm ? `نتائج البحث عن: "${searchTerm}"` : activeCategory; 
    },
    loadMoreItems() { 
        // ... (الكود كما هو - بدون تغيير)
        const offset = this.state.inventory.displayOffset; const batchSize = this.config.BATCH_SIZE; const items = this.state.inventory.currentFilteredList.slice(offset, offset + batchSize); this.elements.lazyLoader.style.display = items.length > 0 && this.state.inventory.currentFilteredList.length > offset + batchSize ? 'block' : 'none'; if (items.length > 0) { this.renderProductBatch(items); this.state.inventory.displayOffset += items.length; } 
    },
    
    renderProductBatch(items) { 
        // ... (الكود كما هو - بدون تغيير)
        const fragment = document.createDocumentFragment(); 
        const isAdmin = this.state.user.role === 'admin';
        
        items.forEach((item, index) => { 
            const card = document.createElement('div'); 
            card.className = 'product-card'; 
            card.style.animationDelay = `${index * 50}ms`;
            card.classList.add('product-card-fade-in');

            let adminIconsHtml = '';
            if (isAdmin) {
                adminIconsHtml = `<div class="admin-icons">
                    <button class="admin-icon-btn edit-btn" data-id="${item.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                    <button class="admin-icon-btn delete-btn" data-id="${item.id}" title="حذف"><i class="fas fa-trash-alt"></i></button>
                </div>`;
            }

            const quantity = item['الكمية'] !== undefined ? parseInt(item['الكمية']) : -1; 
            let quantityBadge = '';
            if (quantity === -1) {
                quantityBadge = `<div class="product-quantity-badge quantity-unknown" title="كمية غير محددة"><i class="fas fa-question"></i></div>`;
            } else if (quantity <= 0) {
                quantityBadge = `<div class="product-quantity-badge quantity-out" title="نفدت الكمية"><i class="fas fa-times"></i></div>`;
            } else if (quantity <= 10) {
                quantityBadge = `<div class="product-quantity-badge quantity-low" title="كمية قليلة: ${quantity}"><i class="fas fa-exclamation-triangle"></i></div>`;
            } else {
                quantityBadge = ``; 
            }

            const category = this.getCategory(item['الصنف']);
            const svgIconId = this.getCategorySvg(category);
            const placeholderSvg = `<svg class="product-image-svg"><use xlink:href="${svgIconId}"></use></svg>`;
            const imagePart = item.صورة 
                ? `<img src="${item.صورة}" class="product-image" data-id="${item.id}" alt="${this.escapeHtml(item['الصنف'])}" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='${placeholderSvg.replace(/"/g, "'")}';">` 
                : placeholderSvg;

            const isOutOfStock = quantity === 0;
            
            const addToCartBtn = `<button class="add-to-cart-btn" data-id="${item.id}" ${isOutOfStock ? 'disabled' : ''}>
                                    ${isOutOfStock ? 'نفدت الكمية' : '<i class="fas fa-cart-plus mr-2"></i> إضافة للسلة'}
                                  </button>`;

            card.innerHTML = `
                ${adminIconsHtml}
                ${quantityBadge}
                <div class="product-image-container" data-id="${item.id}">
                    ${imagePart}
                </div>
                <div class="p-4 flex-grow">
                    <h3 class="product-title">${this.escapeHtml(item['الصنف'])}</h3>
                    <p class="product-price">${Number(item['السعر']).toFixed(2)} جم</p>
                </div>
                <div class="p-4 pt-0">
                    ${addToCartBtn}
                </div>`;
            
            fragment.appendChild(card); 
        }); 
        this.elements.inventoryGrid.appendChild(fragment); 
    },

    updateCategoryTabs() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.categoryTabsContainer.innerHTML = ''; const categoryOrder = ['كل الأصناف', ...Object.keys(this.config.CATEGORY_KEYWORDS), 'متنوع']; categoryOrder.forEach(category => { const products = this.state.inventory.categorizedProducts[category]; if (products && products.length > 0) { const tab = document.createElement('button'); tab.className = `category-tab ${this.state.inventory.activeCategory === category ? 'active' : ''}`; tab.dataset.category = category; tab.innerHTML = `<i class="fas ${this.config.CATEGORY_ICONS[category] || 'fa-tag'} mr-2"></i><span>${category} (${products.length})</span>`; this.elements.categoryTabsContainer.appendChild(tab); } }); 
    },
    getCategory(productName) { 
        // ... (الكود كما هو - بدون تغيير)
        const lowerCaseName = String(productName || '').toLowerCase(); if (lowerCaseName.includes('كريم') && (lowerCaseName.includes('شعر') || lowerCaseName.includes('هير'))) return 'العناية بالشعر'; if (lowerCaseName.includes('جونسون') || lowerCaseName.includes('بامبرz') || lowerCaseName.includes('مولفكس')) return 'العناية بالطفل'; for (const category in this.config.CATEGORY_KEYWORDS) { if (this.config.CATEGORY_KEYWORDS[category].some(keyword => lowerCaseName.includes(keyword))) return category; } return 'متنوع'; 
    },
    
    getCategorySvg(category) {
        // ... (الكود كما هو - بدون تغيير)
        return this.config.CATEGORY_SVG_MAP[category] || '#svg-icon-box';
    },

    handleSearchInput(e) { 
        // ... (الكود كما هو - بدون تغيير)
        this.state.inventory.searchTerm = e.target.value; this.elements.clearSearchBtn.style.display = e.target.value ? 'flex' : 'none'; this.state.inventory.activeCategory = 'كل الأصناف'; this.filterAndRender(); 
    },
    clearSearch() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.searchInput.value = ''; this.handleSearchInput({target: this.elements.searchInput}); 
    },
    handleCategoryClick(e) { 
        // ... (الكود كما هو - بدون تغيير)
        const target = e.target.closest('.category-tab'); if (target) { this.state.inventory.activeCategory = target.dataset.category; this.state.inventory.searchTerm = ''; this.elements.searchInput.value = ''; this.filterAndRender(); } 
    },
    
    handleGridClick(e) { 
        // ... (الكود كما هو - بدون تغيير)
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const addToCartBtn = e.target.closest('.add-to-cart-btn');
        const imgContainer = e.target.closest('.product-image-container');
        
        const id = editBtn?.dataset.id || deleteBtn?.dataset.id || addToCartBtn?.dataset.id || imgContainer?.dataset.id;
        if (!id) return; 
        
        const product = this.state.inventory.fullInventory.find(p => p.id === id); 
        if (!product) return; 

        if (imgContainer) { this.showImageModal(product); return; } 
        if (addToCartBtn) { this.addToCart(product); return; } 
        if (this.state.user.role === 'admin') {
            if (editBtn) this.showProductModal(product); 
            else if (deleteBtn) this.deleteProduct(product);
        } 
    },

    handleSortSelection(e) { 
        // ... (الكود كما هو - بدون تغيير)
        e.preventDefault(); const target = e.target.closest('.sort-option'); if (target) { this.state.inventory.currentSort = target.dataset.sort; this.elements.sortLabel.textContent = target.textContent; this.elements.sortDropdown.classList.add('hidden'); this.filterAndRender(); } 
    },
    setupObserver() { 
        // ... (الكود كما هو - بدون تغيير)
        if (this.state.inventory.observer) this.state.inventory.observer.disconnect(); const observerCallback = (entries) => { if (entries[0].isIntersecting) this.loadMoreItems(); }; this.state.inventory.observer = new IntersectionObserver(observerCallback, { rootMargin: '400px' }); if (this.elements.sentinel) this.state.inventory.observer.observe(this.elements.sentinel); 
    },
    handleInstallClick() { 
        // ... (الكود كما هو - بدون تغيير)
        this.handleInstallDismiss(); if (this.state.deferredPrompt) { this.state.deferredPrompt.prompt(); this.state.deferredPrompt.userChoice.then(() => { this.state.deferredPrompt = null; }); } 
    },
    handleInstallDismiss() { 
        // ... (الكود كما هو - بدون تغيير)
        if(this.elements.installToast) { this.elements.installToast.classList.remove('install-toast-show'); this.elements.installToast.classList.add('hidden'); } localStorage.setItem('installPromptShown', 'true'); 
    },
    toggleSortDropdown() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.sortDropdown.classList.toggle('hidden'); 
    },
    
    async showProductModal(product = null) { 
        // ... (الكود كما هو - بدون تغيير)
        const isEditing = !!product; 
        const { value: formValues, isConfirmed, isDenied } = await Swal.fire({ 
            title: isEditing ? 'تعديل الصنف' : 'إضافة صنف جديد', 
            html: `<input id="swal-input-name" class="swal2-input" placeholder="اسم الصنف" value="${isEditing ? this.escapeHtml(product['الصنف']) : ''}"><input id="swal-input-price" class="swal2-input" type="number" step="0.01" placeholder="السعر" value="${isEditing ? product['السعر'] : ''}"><input id="swal-input-quantity" class="swal2-input" type="number" step="1" placeholder="الكمية المتاحة (Stock)" value="${isEditing ? (product['الكمية'] || 0) : ''}"><input id="swal-input-image" class="swal2-input" placeholder="رابط الصورة (اختياري)" value="${isEditing ? (product['صورة'] || '') : ''}"><p class="text-sm text-gray-500 mt-2">ملاحظة: القسم يتم تحديده أوتوماتيكياً بناءً على الاسم.</p>`, 
            focusConfirm: false, 
            showCancelButton: true, 
            confirmButtonText: isEditing ? 'حفظ التعديلات' : 'إضافة', 
            cancelButtonText: 'إلغاء',
            showDenyButton: isEditing,
            denyButtonText: 'حذف المنتج',
            denyButtonColor: '#dc2626',
            preConfirm: () => ({ "الصنف": document.getElementById('swal-input-name').value, "السعر": parseFloat(document.getElementById('swal-input-price').value), "الكمية": parseInt(document.getElementById('swal-input-quantity').value), "صورة": document.getElementById('swal-input-image').value }) 
        }); 
        
        if (isDenied) {
            this.deleteProduct(product); 
            return;
        }

        if (isConfirmed && formValues) {
            if (!formValues['الصنف'] || isNaN(formValues['السعر']) || isNaN(formValues['الكمية'])) { 
                Swal.fire('خطأ', 'يرجى ملء الاسم والسعر والكمية بشكل صحيح.', 'error'); 
                return; 
            } 
            Swal.fire({ title: 'جاري الحفظ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false }); 
            if (isEditing) await this.updateProduct({ ...product, ...formValues }); 
            else await this.addProduct({ ...formValues }); 
            Swal.close(); 
            // (تعديل) جلب البيانات من جديد بعد الإضافة/التعديل
            await this.fetchProductsOnce();
        }
    },
    
    async showImageModal(product) { 
        // ... (الكود كما هو - بدون تغيير)
        const canEdit = this.state.user.role === 'admin'; const { isConfirmed, isDenied, value: result } = await Swal.fire({ title: `صورة: ${this.escapeHtml(product['الصنف'])}`, html: `<div class="mb-4"><img id="image-preview" src="${product.صورة || 'https://placehold.co/400x200/eef2ff/4f46e5?text=No%20Image'}" class="w-full h-48 object-contain rounded-lg mx-auto" alt="Preview"></div><div id="drop-zone" class="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center ${canEdit ? 'cursor-pointer hover:border-primary hover:bg-gray-50' : ''} transition-colors"><p class="text-text-muted pointer-events-none">${canEdit ? 'اسحب وأفلت صورة هنا أو انقر للاختيار' : 'صورة المنتج'}</p><input type="file" id="swal-file" class="hidden" accept="image/*" ${!canEdit ? 'disabled' : ''}></div><p class="my-3 text-gray-400">${canEdit ? 'أو أدخل رابط الصورة' : ''}</p><input id="swal-url" class="swal2-input" placeholder="https://example.com/image.png" value="${product.صورة?.startsWith('http') ? product.صورة : ''}" ${!canEdit ? 'disabled' : ''}>`, showCancelButton: true, showDenyButton: canEdit && !!product.صورة, confirmButtonText: canEdit ? '<i class="fas fa-save mr-2"></i>حفظ الصورة' : 'حسنًا', cancelButtonText: 'إلغاء', denyButtonText: '<i class="fas fa-trash-alt mr-2"></i>إزالة الصورة', didOpen: () => { if (!canEdit) return; const dropZone = document.getElementById('drop-zone'); const fileInput = document.getElementById('swal-file'); const urlInput = document.getElementById('swal-url'); const preview = document.getElementById('image-preview'); const handleFile = (file) => { if (!file || !file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = (e) => { preview.src = e.target.result; urlInput.value = ''; }; reader.readAsDataURL(file); }; dropZone.onclick = () => fileInput.click(); dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-primary', 'bg-indigo-50'); }; dropZone.ondragleave = () => dropZone.classList.remove('border-primary', 'bg-indigo-50'); dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('border-primary', 'bg-indigo-50'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); }; fileInput.onchange = () => handleFile(fileInput.files[0]); urlInput.oninput = () => { preview.src = urlInput.value || 'https.placehold.co/400x200/eef2ff/4f46e5?text=No%20Image'; }; }, preConfirm: () => ({ imageSrc: document.getElementById('image-preview').src, url: document.getElementById('swal-url').value }) }); if (!canEdit) return; if (isConfirmed && result) { const newImageSrc = result.imageSrc; if (newImageSrc.startsWith('data:image')) { Swal.fire({ title: 'جاري رفع الصورة...', text: 'قد يستغرق هذا بعض الوقت...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { const storageRef = ref(storage, `products/${product.id}-${Date.now()}`); const uploadResult = await uploadString(storageRef, newImageSrc, 'data_url'); const downloadURL = await getDownloadURL(uploadResult.ref); await this.updateProduct({ ...product, صورة: downloadURL }); if (product.صورة && product.صورة.includes('firebasestorage')) { const oldImageRef = ref(storage, product.صورة); await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old image", e)); } Swal.fire({ icon: 'success', title: 'تم!', text: 'تم تحديث الصورة بنجاح.', timer: 1500, showConfirmButton: false }); await this.fetchProductsOnce(); } catch (error) { console.error("Image Upload Error:", error); Swal.fire('خطأ', 'فشل رفع الصورة. تأكد أن حجمها أقل من 1 ميجا.', 'error'); } } else { const newUrl = result.url; if (newUrl !== product.صورة) { await this.updateProduct({ ...product, صورة: newUrl }); Swal.fire({ icon: 'success', title: 'تم!', text: 'تم تحديث رابط الصورة.', timer: 1500, showConfirmButton: false }); await this.fetchProductsOnce(); } } } else if (isDenied) { if (product.صورة && product.صورة.includes('firebasestorage')) { const imageRef = ref(storage, product.صورة); await deleteObject(imageRef).catch(e => console.error("Could not delete image", e)); } await this.updateProduct({ ...product, صورة: '' }); Swal.fire({ icon: 'success', title: 'تمت إزالة الصورة بنجاح.', timer: 1500, showConfirmButton: false }); await this.fetchProductsOnce(); } 
    },
    async addProduct(newProduct) { 
        // ... (الكود كما هو - بدون تغيير)
        try { await addDoc(this.state.inventory.productsCollection, newProduct); } catch (e) { console.error(e); } 
    },
    async updateProduct(updatedProduct) { 
        // ... (الكود كما هو - بدون تغيير)
        try { const data = { ...updatedProduct }; delete data.id; await setDoc(doc(db, "products", updatedProduct.id), data, { merge: true }); } catch (e) { console.error(e); } 
    },
    async deleteProduct(product) { 
        // ... (الكود كما هو - بدون تغيير)
        const result = await Swal.fire({ title: 'هل أنت متأكد؟', text: `سيتم حذف "${this.escapeHtml(product['الصنف'])}" بشكل نهائي!`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذفه!', cancelButtonText: 'إلغاء', confirmButtonColor: '#dc2626' }); if (result.isConfirmed) try { if (product.صورة && product.صورة.includes('firebasestorage')) { const imageRef = ref(storage, product.صورة); await deleteObject(imageRef).catch(e => console.error("Could not delete image", e)); } await deleteDoc(doc(db, "products", product.id)); this.state.ui.notyf.success('تم حذف المنتج بنجاح.'); await this.fetchProductsOnce(); } catch (e) { console.error(e); this.state.ui.notyf.error('فشل حذف المنتج.'); } 
    },
    escapeHtml(str) { 
        // ... (الكود كما هو - بدون تغيير)
        if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; 
    },

    // =================================================================
    // 5. منطق السلة (Cart Page Logic)
    // =================================================================
    
    addToCart(product) { 
        // ... (الكود كما هو - بدون تغيير)
        const stock = product['الكمية'] !== undefined ? parseInt(product['الكمية']) : -1; 
        if (stock === 0) { 
            this.state.ui.notyf.error('هذا المنتج نفد من المخزون.'); 
            return; 
        } 
        const existingItem = this.state.cart.find(item => item.id === product.id); 
        if (existingItem) { 
            if (stock !== -1 && existingItem.quantity >= stock) { 
                this.state.ui.notyf.info('لقد وصلت للكمية المتاحة من هذا المنتج.'); 
                return; 
            } 
            existingItem.quantity++; 
        } else { 
            this.state.cart.push({ id: product.id, name: product['الصنف'], price: Number(product['السعر']), quantity: 1, stock: stock, image: product['صورة'] || null }); 
        } 
        this.state.ui.notyf.success('تمت إضافة المنتج للسلة');
        this.elements.cartBtn.classList.add('fa-beat-animation'); 
        setTimeout(() => this.elements.cartBtn.classList.remove('fa-beat-animation'), 600); 
        this.updateCartUI(); 
    },
    
    updateCartQuantity(productId, newQuantity) { 
        // ... (الكود كما هو - بدون تغيير)
        const item = this.state.cart.find(item => item.id === productId); if (!item) return; if (newQuantity <= 0) { this.removeFromCart(productId); return; } if (item.stock !== -1 && newQuantity > item.stock) { this.state.ui.notyf.info('الكمية المطلوبة أكبر من المتاح بالمخزون.'); item.quantity = item.stock; } else { item.quantity = newQuantity; } this.updateCartUI(); 
    },
    removeFromCart(productId) { 
        // ... (الكود كما هو - بدون تغيير)
        this.state.cart = this.state.cart.filter(item => item.id !== productId); this.updateCartUI(); 
    },
    
    updateCartUI() { 
        // ... (الكود كما هو - بدون تغيير)
        this.renderCartHeaderIcon(); 
        if (this.state.ui.currentPage === 'cart-page') {
            this.renderCartPage(); 
        }
    },

    renderCartHeaderIcon() { 
        // ... (الكود كما هو - بدون تغيير)
        const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0); if (totalItems > 0) { this.elements.cartCount.textContent = totalItems; this.elements.cartCount.classList.remove('hidden'); } else { this.elements.cartCount.classList.add('hidden'); } 
    },
    
    renderCartPage() { 
        // ... (الكود كما هو - بدون تغيير)
        const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0); 

        if (this.state.cart.length === 0) { 
            this.elements.cartEmptyMsg.classList.remove('hidden');
            this.elements.cartContent.classList.add('hidden');
            return; 
        } 
        
        this.elements.cartEmptyMsg.classList.add('hidden'); 
        this.elements.cartContent.classList.remove('hidden'); 
        
        this.elements.cartItemsList.innerHTML = ''; 
        let totalPrice = 0; 
        
        this.state.cart.forEach(item => { 
            const itemTotal = item.price * item.quantity; 
            totalPrice += itemTotal; 
            const itemElement = document.createElement('div'); 
            itemElement.className = 'cart-item-card-style'; 
            
            const category = this.getCategory(item.name);
            const svgIconId = this.getCategorySvg(category);
            const placeholderSvg = `<svg class="w-20 h-20 object-cover rounded-lg border p-2 text-gray-300"><use xlink:href="${svgIconId}"></use></svg>`;
            const itemImage = item.image
                ? `<img src="${item.image}" alt="${this.escapeHtml(item.name)}" class="w-20 h-20 object-cover rounded-lg border flex-shrink-0" onerror="this.onerror=null;this.parentElement.innerHTML='${placeholderSvg.replace(/"/g, "'")}';">`
                : placeholderSvg;

            itemElement.innerHTML = `
                ${itemImage}
                <div class="flex-1">
                    <h4 class="font-bold text-text-dark">${this.escapeHtml(item.name)}</h4>
                    <p class="text-sm text-text-muted">${item.price.toFixed(2)} جم (للقطعة)</p>
                    <div class="cart-item-quantity mt-2">
                        <button class="cart-quantity-decrease" data-id="${item.id}">-</button>
                        <span class="font-bold w-8 text-center">${item.quantity}</span>
                        <button class="cart-quantity-increase" data-id="${item.id}" ${item.stock !== -1 && item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <div class="text-left flex flex-col justify-between items-end">
                    <p class="font-bold text-primary text-lg">${itemTotal.toFixed(2)} جم</p>
                    <button class="cart-remove-item text-red-500 text-sm hover:underline mt-1" data-id="${item.id}">
                        <i class="fas fa-trash-alt mr-1"></i>إزالة
                    </button>
                </div>`; 
            this.elements.cartItemsList.appendChild(itemElement); 
        }); 
        
        this.elements.cartSubtotalPrice.textContent = `${totalPrice.toFixed(2)} جم`;
        this.elements.cartTotalPrice.textContent = `${totalPrice.toFixed(2)} جم`; 
        this.elements.checkoutBtn.disabled = false; 
    },

    handleCartClick(e) { 
        // ... (الكود كما هو - بدون تغيير)
        const decreaseBtn = e.target.closest('.cart-quantity-decrease'); const increaseBtn = e.target.closest('.cart-quantity-increase'); const removeBtn = e.target.closest('.cart-remove-item'); if (decreaseBtn) { const id = decreaseBtn.dataset.id; const item = this.state.cart.find(i => i.id === id); if(item) this.updateCartQuantity(id, item.quantity - 1); } else if (increaseBtn) { const id = increaseBtn.dataset.id; const item = this.state.cart.find(i => i.id === id); if(item) this.updateCartQuantity(id, item.quantity + 1); } else if (removeBtn) { const id = removeBtn.dataset.id; this.removeFromCart(id); } 
    },
    handleCheckout() { 
        // ... (الكود كما هو - بدون تغيير)
        if (this.state.cart.length === 0) return; Swal.fire({ title: 'تأكيد إرسال الطلب', text: 'سيتم إرسال طلبك للمراجعة والموافقة من قبل الأدمن. هل أنت متأكد؟', icon: 'info', showCancelButton: true, confirmButtonText: 'نعم، إرسال للمراجعة!', cancelButtonText: 'إلغاء' }).then(async (result) => { if (result.isConfirmed) { this.processCheckout(); } }); 
    },
    
    async processCheckout() { 
        // ... (الكود كما هو - بدون تغيير)
        this.setLoading(this.elements.checkoutBtn, true, 'جاري إرسال الطلب...'); 
        let orderData; 
        let orderId;
        try { 
            const total = this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); 
            
            orderData = { 
                userId: this.state.user.uid, 
                userName: this.state.user.name, 
                userPhone: this.state.user.phone || '', 
                items: this.state.cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })), 
                totalPrice: total, 
                status: 'pending_approval', 
                createdAt: new Date() 
            }; 

            const newOrderRef = await addDoc(collection(db, "orders"), orderData);
            orderId = newOrderRef.id; 

            const itemsText = orderData.items.map(item => `  - ${item.name} (الكمية: ${item.quantity})`).join('\n');
            const telegramMessage = `📦 طلب جديد قيد الموافقة (ID: ${orderId})\n\n👤 العميل: ${orderData.userName}\n📞 الهاتف: ${orderData.userPhone || 'لا يوجد'}\n\n📋 المنتجات:\n${itemsText}\n\n💰 الإجمالي: ${orderData.totalPrice.toFixed(2)} جم`;
            
            const keyboard = {
                inline_keyboard: [[
                    { text: '✅ موافقة', callback_data: `approve:${orderId}` },
                    { text: '❌ رفض', callback_data: `reject:${orderId}` }
                ]]
            };

            await this.sendTelegramMessage(telegramMessage, keyboard);

            this.showInvoiceModal(orderData, orderId);
            this.state.cart = []; 
            this.updateCartUI(); 
        } catch (error) { 
            console.error("Checkout Error:", error); 
            Swal.fire('خطأ في الطلب', 'لم نتمكن من إرسال طلبك. يرجى المحاولة مرة أخرى.', 'error'); 
        } finally { 
            this.setLoading(this.elements.checkoutBtn, false, 'إتمام الطلب'); 
        } 
    },

    showInvoiceModal(orderData, orderId) {
        // ... (الكود كما هو - بدون تغيير)
        const invoiceHtml = this.generateInvoiceHTML(orderData, orderId);
        Swal.fire({
            title: 'تم إرسال طلبك للمراجعة!',
            html: invoiceHtml,
            width: '800px',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-print"></i> طباعة الفاتورة',
            cancelButtonText: 'إغلاق',
            didOpen: () => {
                document.getElementById('print-invoice-btn').addEventListener('click', () => {
                    const printContent = document.getElementById('invoice-to-print').innerHTML;
                    const printWindow = window.open('', '', 'height=600,width=800');
                    printWindow.document.write('<html><head><title>فاتورة</title>');
                    // (تعديل) إضافة الأنماط إلى نافذة الطباعة
                    printWindow.document.write(`
                        <style>
                            body { font-family: 'IBM Plex Sans Arabic', sans-serif; direction: rtl; }
                            .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; color: #555; }
                            .invoice-box table { width: 100%; line-height: inherit; text-align: right; border-collapse: collapse; }
                            .invoice-box table td { padding: 5px; vertical-align: top; }
                            .invoice-box table tr.top table td { padding-bottom: 20px; }
                            .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
                            .invoice-box table tr.information table td { padding-bottom: 40px; }
                            .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
                            .invoice-box table tr.details td { padding-bottom: 20px; }
                            .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
                            .invoice-box table tr.total td:last-child { border-top: 2px solid #eee; font-weight: bold; font-size: 1.2em; color: #4f46e5; }
                        </style>
                    `);
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(printContent);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                    // printWindow.close(); // قد يغلق النافذة قبل أن يختار المستخدم الطباعة
                });
            }
        }).then((result) => {
            this.navigateTo('app-page');
        });
    },

    generateInvoiceHTML(orderData, orderId) {
        // ... (الكود كما هو - بدون تغيير)
        const itemsRows = orderData.items.map(item => `
            <tr class="item">
                <td>${this.escapeHtml(item.name)}</td>
                <td>${item.quantity}</td>
                <td>${item.price.toFixed(2)} جم</td>
                <td>${(item.quantity * item.price).toFixed(2)} جم</td>
            </tr>
        `).join('');

        return `
            <!-- (تعديل) إزالة الأنماط من هنا لأنها ستُضاف ديناميكيًا عند الطباعة -->
            <div id="invoice-to-print">
                <div class="invoice-box">
                    <table>
                        <tr class="top">
                            <td colspan="4">
                                <table>
                                    <tr>
                                        <td class="title">
                                            <img src="https://placehold.co/100x100/4f46e5/ffffff?text=Rx" style="width:100%; max-width:100px;">
                                        </td>
                                        <td>
                                            <b>فاتورة طلب #${orderId.substring(0, 8)}</b><br>
                                            الحالة: قيد المراجعة<br>
                                            التاريخ: ${new Date(orderData.createdAt).toLocaleDateString('ar-EG')}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="information">
                            <td colspan="4">
                                <table>
                                    <tr>
                                        <td>
                                            <b>صيدلية د. سيد</b><br>
                                            العنوان...<br>
                                            الهاتف...
                                        </td>
                                        <td>
                                            <b>العميل: ${this.escapeHtml(orderData.userName)}</b><br>
                                            الهاتف: ${this.escapeHtml(orderData.userPhone)}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr class="heading">
                            <td>الصنف</td>
                            <td>الكمية</td>
                            <td>السعر</td>
                            <td>الإجمالي الفرعي</td>
                        </tr>
                        ${itemsRows}
                        <tr class="total">
                            <td colspan="3"></td>
                            <td>الإجمالي: ${orderData.totalPrice.toFixed(2)} جم</td>
                        </tr>
                    </table>
                </div>
            </div>
            <button id="print-invoice-btn" class="settings-button" style="margin-top: 20px;">طباعة</button>
        `;
    },

    // =================================================================
    // 6. منطق Telegram (هام)
    // =================================================================

    async sendTelegramMessage(text, inlineKeyboard = null) {
        // ... (الكود كما هو - بدون تغيير)
        if (!this.config.TELEGRAM_BOT_TOKEN || !this.config.TELEGRAM_CHAT_ID) {
            console.error("Telegram Bot Token or Chat ID is not configured.");
            return;
        }
        const url = `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/sendMessage`;
        const payload = {
            chat_id: this.config.TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown' 
        };
        if (inlineKeyboard) {
            payload.reply_markup = inlineKeyboard;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.ok) {
                console.error("Telegram API Error:", result.description);
            }
        } catch (error) {
            console.error("Failed to send Telegram message:", error);
        }
    },

    // =================================================================
    // 7. لوحات الأدمن والإعدادات (بدون تغيير كبير في المنطق)
    // =================================================================

    showAdminPanel() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.adminPanel.classList.add('show'); listContainer = this.elements.adminUsersList; listContainer.innerHTML = '<div class="text-center p-4"><div class="loader-dots mx-auto"><div class="dot1"></div><div class="dot2"></div><div class="dot3"></div></div></div>'; listContainer.onclick = (e) => { const button = e.target.closest('button'); if (!button) return; const uid = button.dataset.uid; const name = button.dataset.name; const userRow = button.closest('li'); if (button.classList.contains('approve-user')) this.approveUser(uid, userRow); else if (button.classList.contains('promote-user')) this.promoteUser(uid, name, userRow); else if (button.classList.contains('demote-user')) this.demoteUser(uid, name, userRow); else if (button.classList.contains('delete-user')) this.deleteUser(uid, name, userRow); }; this.state.admin.unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => { listContainer.innerHTML = ''; const users = snapshot.docs.map(doc => doc.data()); if (users.length === 0) { listContainer.innerHTML = '<p class="text-center text-gray-500">لا يوجد مستخدمون مسجلون بعد.</p>'; return; } users.sort((a, b) => (a.role === 'admin' && !a.promotedBy) ? -1 : 1); users.forEach(u => { const li = document.createElement('li'); li.className = 'flex items-center justify-between p-3 my-1 hover:bg-gray-100/50 rounded-lg transition-colors'; li.dataset.uid = u.uid; const isSuperAdmin = u.role === 'admin' && !u.promotedBy; const roleIcon = isSuperAdmin ? '<i class="fas fa-crown text-yellow-500" title="Super Admin"></i>' : (u.role === 'admin' ? '<i class="fas fa-user-shield text-blue-500" title="Admin"></i>' : '<i class="fas fa-user text-gray-400" title="User"></i>'); const roleText = u.status === 'approved' ? (isSuperAdmin ? 'أدمن أساسي' : (u.role === 'admin' ? 'أدمن' : 'مستخدم')) : 'قيد المراجعة'; let buttons = ''; if (u.uid !== this.state.user.uid && !isSuperAdmin) { if (u.status === 'pending') buttons += `<button data-uid="${u.uid}" class="approve-user px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600 transition-all">موافقة</button>`; if (u.status === 'approved' && u.role !== 'admin') buttons += `<button data-uid="${u.uid}" data-name="${u.name}" class="promote-user px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-all">ترقية لأدمن</button>`; if (u.role === 'admin' && u.promotedBy === this.state.user.uid) { buttons += `<button data-uid="${u.uid}" data-name="${u.name}" class="demote-user px-2 py-1 text-xs text-white bg-yellow-500 rounded hover:bg-yellow-600 transition-all">تخفيض لمستخدم</button>`; } buttons += `<button data-uid="${u.uid}" data-name="${u.name}" class="delete-user px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600 transition-all">حذف</button>`; } li.innerHTML = `<div><p class="font-semibold flex items-center gap-2"><span>${u.name}</span><span class="text-xs text-gray-500">(${u.email})</span></p><p class="text-sm flex items-center gap-2">${roleIcon}<span>${roleText}</span></p></div><div class="flex items-center gap-2">${buttons}</div>`; listContainer.appendChild(li); }); }); 
    },
    closeAdminPanel() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.adminPanel.classList.remove('show'); if (this.state.admin.unsubscribeUsers) { this.state.admin.unsubscribeUsers(); this.state.admin.unsubscribeUsers = null; } 
    },
    async approveUser(uid, userRow) { 
        // ... (الكود كما هو - بدون تغيير)
        if (userRow) userRow.classList.add('user-promoted'); await setDoc(doc(db, "users", uid), { status: 'approved' }, { merge: true }); 
    },
    async isSuperAdmin(uid) { 
        // ... (الكود كما هو - بدون تغيير)
        if (!uid) return false; try { const userDoc = await getDoc(doc(db, "users", uid)); if (!userDoc.exists()) return false; const userData = userDoc.data(); return userData.role === 'admin' && !userData.promotedBy; } catch (e) { console.error("Error checking super admin status:", e); return false; } 
    },
    async deleteUser(uid, name, userRow) { 
        // ... (الكود كما هو - بدون تغيير)
        if (uid === this.state.user.uid) return; if (await this.isSuperAdmin(uid)) { Swal.fire('خطأ', 'لا يمكن حذف الأدمن الأساسي!', 'error'); return; } const result = await Swal.fire({ title: 'هل أنت متأكد؟', text: `سيتم حذف المستخدم "${name}"!`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذفه!', cancelButtonText: 'إلغاء', confirmButtonColor: '#dc2626' }); if (result.isConfirmed) { if (userRow) userRow.classList.add('user-deleted'); setTimeout(async () => { await deleteDoc(doc(db, 'users', uid)); const avatarRef = ref(storage, `avatars/${uid}`); await deleteObject(avatarRef).catch(e => console.warn("Could not delete avatar", e)); }, 500); } 
    },
    async promoteUser(uid, name, userRow) { 
        // ... (الكود كما هو - بدون تغيير)
        if (uid === this.state.user.uid) return; if (userRow) userRow.classList.add('user-promoted'); await setDoc(doc(db, "users", uid), { role: 'admin', promotedBy: this.state.user.uid }, { merge: true }); 
    },
    async demoteUser(uid, name, userRow) { 
        // ... (الكود كما هو - بدون تغيير)
        if (uid === this.state.user.uid) return; if (await this.isSuperAdmin(uid)) { Swal.fire('خطأ', 'لا يمكن تخفيض رتبة الأدمن الأساسي!', 'error'); return; } if (userRow) userRow.classList.add('user-demoted'); await setDoc(doc(db, "users", uid), { role: 'user', promotedBy: deleteField() }, { merge: true }); 
    },

    setupSettingsTabs() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.settingsTabs.forEach(tab => { tab.addEventListener('click', () => { this.elements.settingsTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); this.elements.settingsContentPanes.forEach(pane => { pane.classList.remove('active'); if (pane.id === `settings-tab-${tab.dataset.tab}`) { pane.classList.add('active'); } }); }); }); 
    },
    showSettingsPanel() { 
        // ... (الكود كما هو - بدون تغيير)
        this.loadSettings(); this.elements.settingsPanel.classList.add('show'); 
    },
    closeSettingsPanel() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.settingsPanel.classList.remove('show'); this.state.ui.newAvatarDataUrl = null; this.state.ui.newAvatarUrl = null; 
    },
    loadSettings() {
        // ... (الكود كما هو - بدون تغيير)
        const { name, email, phone, avatarUrl } = this.state.user;
        this.elements.settingsName.value = name || '';
        this.elements.settingsEmail.value = email || '';
        this.elements.settingsPhone.value = phone || '';
        this.elements.avatarPreview.src = avatarUrl || 'https://placehold.co/100x100/e0e7ff/4f46e5?text=AV';
        this.elements.avatarUrlInput.value = '';
        this.state.ui.newAvatarDataUrl = null; 
        this.state.ui.newAvatarUrl = null;
    },
    setupAvatarUploadEvents() {
        // ... (الكود كما هو - بدون تغيير)
        const dropZone = this.elements.avatarUploadSection;
        const fileInput = this.elements.avatarFileInput;
        const urlInput = this.elements.avatarUrlInput;
        const preview = this.elements.avatarPreview;
        const handleFile = (file) => { if (!file || !file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = (e) => { preview.src = e.target.result; this.state.ui.newAvatarDataUrl = e.target.result; this.state.ui.newAvatarUrl = null; urlInput.value = ''; }; reader.readAsDataURL(file); };
        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
        dropZone.ondragleave = () => dropZone.classList.remove('dragover');
        dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); };
        fileInput.onchange = () => handleFile(fileInput.files[0]);
        urlInput.oninput = () => { const url = urlInput.value; if (url) { preview.src = url; this.state.ui.newAvatarDataUrl = null; this.state.ui.newAvatarUrl = url; } else { preview.src = this.state.user.avatarUrl || 'https://placehold.co/100x100/e0e7ff/4f46e5?text=AV'; } };
    },
    async handleUpdateProfile(e) {
        // ... (الكود كما هو - بدون تغيير)
        e.preventDefault();
        const newName = this.elements.settingsName.value;
        const newPhone = this.elements.settingsPhone.value;
        if (!newName) { Swal.fire('خطأ', 'الاسم لا يمكن أن يكون فارغاً.', 'error'); return; }
        this.setLoading(this.elements.saveProfileBtn, true, 'جاري الحفظ...');
        try {
            const userDocRef = doc(db, "users", this.state.user.uid);
            let newAvatarDownloadUrl = null;
            if (this.state.ui.newAvatarDataUrl) {
                const storageRef = ref(storage, `avatars/${this.state.user.uid}`);
                const uploadResult = await uploadString(storageRef, this.state.ui.newAvatarDataUrl, 'data_url');
                newAvatarDownloadUrl = await getDownloadURL(uploadResult.ref);
            } 
            else if (this.state.ui.newAvatarUrl) {
                newAvatarDownloadUrl = this.state.ui.newAvatarUrl;
            }
            const dataToUpdate = { name: newName, phone: newPhone };
            if (newAvatarDownloadUrl) {
                dataToUpdate.avatarUrl = newAvatarDownloadUrl;
            }
            await setDoc(userDocRef, dataToUpdate, { merge: true });
            this.state.ui.notyf.success('تم تحديث بياناتك بنجاح.');
            this.closeSettingsPanel();
        } catch (error) {
            console.error("Profile Update Error:", error);
            Swal.fire('خطأ', 'لم نتمكن من تحديث بياناتك.', 'error');
        } finally {
            this.setLoading(this.elements.saveProfileBtn, false, 'حفظ التغييرات');
        }
    },
    async handleUpdatePassword(e) { 
        // ... (الكود كما هو - بدون تغيير)
        e.preventDefault(); const newPassword = this.elements.settingsNewPassword.value; const confirmPassword = this.elements.settingsConfirmPassword.value; if (newPassword.length < 6) { Swal.fire('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error'); return; } if (newPassword !== confirmPassword) { Swal.fire('خطأ', 'كلمتا المرور غير متطابقتين.', 'error'); return; } this.setLoading(this.elements.savePasswordBtn, true, 'جاري التغيير...'); try { await updatePassword(auth.currentUser, newPassword); Swal.fire('تم!', 'تم تغيير كلمة المرور بنجاح.', 'success'); this.elements.passwordSettingsForm.reset(); this.closeSettingsPanel(); } catch (error) { console.error("Password Update Error:", error); Swal.fire('خطأ', 'فشلت العملية. قد تحتاج لإعادة تسجيل الدخول أولاً.', 'error'); } finally { this.setLoading(this.elements.savePasswordBtn, false, 'تغيير كلمة المرور'); } 
    },

    showSitemapPanel() { 
        // ... (الكود كما هو - بدون تغيير)
        this.renderSitemap(); this.elements.sitemapPanel.classList.add('show'); 
    },
    closeSitemapPanel() { 
        // ... (الكود كما هو - بدون تغيير)
        this.elements.sitemapPanel.classList.remove('show'); 
    },
    renderSitemap() { 
        // ... (الكود كما هو - بدون تغيير)
        let content = '<nav class="space-y-2">'; content += `<a class="sitemap-link" data-action="go-home"><i class="fas fa-home"></i> الصفحة الرئيسية (كل الأصناف)</a>`; content += '<h4 class="text-lg font-semibold text-primary mt-6 mb-2">الأقسام</h4>'; const categoryOrder = ['كل الأصناف', ...Object.keys(this.config.CATEGORY_KEYWORDS), 'متنوع']; categoryOrder.forEach(category => { const products = this.state.inventory.categorizedProducts[category]; if (category !== 'كل الأصناف' && products && products.length > 0) { content += `<a class="sitemap-link" data-action="go-category" data-category="${category}"><i class="fas ${this.config.CATEGORY_ICONS[category] || 'fa-tag'}"></i> ${category}</a>`; } }); content += '<h4 class="text-lg font-semibold text-primary mt-6 mb-2">الحساب والطلبات</h4>'; content += `<a class="sitemap-link" data-action="go-cart"><i class="fas fa-shopping-cart"></i> سلة المشتريات</a>`; content += `<a class="sitemap-link" data-action="go-settings"><i class="fas fa-cog"></i> إعدادات الحساب</a>`; if (this.state.user.role === 'admin') { content += '<h4 class="text-lg font-semibold text-primary mt-6 mb-2">الإدارة</h4>'; content += `<a class="sitemap-link" data-action="go-admin"><i class="fas fa-user-shield"></i> لوحة تحكم الأدمن</a>`; } content += '</nav>'; this.elements.sitemapContent.innerHTML = content; 
    },
    handleSitemapClick(e) { 
        // ... (الكود كما هو - بدون تغيير)
        const link = e.target.closest('.sitemap-link'); if (!link) return; const action = link.dataset.action; this.closeSitemapPanel(); switch (action) { case 'go-home': this.navigateTo('app-page'); document.querySelector('.category-tab[data-category="كل الأصناف"]')?.click(); break; case 'go-category': this.navigateTo('app-page'); const category = link.dataset.category; document.querySelector(`.category-tab[data-category="${category}"]`)?.click(); break; case 'go-cart': this.navigateTo('cart-page'); this.renderCartPage(); break; case 'go-settings': this.showSettingsPanel(); break; case 'go-admin': if (this.state.user.role === 'admin') { this.showAdminPanel(); } break; } 
    }
};

// بدء التطبيق
App.init();
