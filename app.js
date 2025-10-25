    // Import all Firebase modules
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail, updatePassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
            user: { isLoggedIn: false, isPending: false, data: null, uid: null, role: null, phone: null, avatarUrl: null, unsubscribe: null }, // إضافة avatarUrl
            inventory: {
                productsCollection: collection(db, "products"),
                ordersCollection: collection(db, "orders"),
                usersCollection: collection(db, "users"),
                isLoading: true, fullInventory: [], categorizedProducts: {}, currentFilteredList: [],
                unsubscribeProducts: null,
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
                newAvatarDataUrl: null, // لتخزين الصورة الجديدة قبل الحفظ
                newAvatarUrl: null // لتخزين الرابط الجديد قبل الحفظ
            }
        },
        config: {
            // ... (نفس الكونفيج) ...
            BATCH_SIZE: 40,
            CARD_COLORS: ['#4f46e5', '#22c55e', '#06b6d4', '#a855f7', '#6366f1', '#f97316', '#14b8a6', '#ef4444'],
            AVATAR_COLORS: ['#4f46e5', '#22c55e', '#06b6d4', '#a855f7', '#6366f1', '#f97316', '#14b8a6', '#ef4444', '#f59e0b', '#ec4899'],
            CATEGORY_KEYWORDS: { 'العناية بالشعر': ['شامبو', 'بلسم', 'زيت', 'كريم شعر', 'صبغه', 'جل', 'جيل', 'حمام كريم', 'سيرم', 'هير', 'فاتيكا', 'صانسيلk', 'لوريال', 'بانتين', 'كلير', 'دابر املا', 'ترزمي', 'باليت', 'فرد شعر', 'ملمع', 'اي كرياتين', 'هيربال ايسنز', 'تريشوب', 'كازانوفا'], 'العناية بالبشرة': ['كريم', 'غسول', 'ماسك', 'صابون', 'لوشن', 'مرطب', 'تفتيح', 'واقي', 'صنفره', 'جلسرين', 'نيفيا', 'دوف', 'ايفا', 'غارنيه', 'فازلين', 'اسیتون', 'مزيل مكياج', 'بي وايت', 'سكين كلينيك', 'كولاجين', 'جليسوليد', 'سبوتليس', 'ديرما'], 'العناية بالطفل': ['بيبي', 'اطفال', 'نونو', 'بامبرز', 'مولفكس', 'فاين بيبي', 'ببرونه', 'سكاته', 'حفاضه', 'جونسون', 'بندولين', 'اي باتش اطفال', 'سانوسان', 'كيدز', 'سيتي بيبي'], 'العناية الشخصية': ['مزيل', 'سبراي', 'معجون', 'فرشاة اسنان', 'شفره', 'حلاقه', 'جيليت', 'لورد', 'اكس', 'ريكسونا', 'فا', 'سويت', 'واكس', 'فوط', 'الويز', 'سوفي', 'برايفت', 'مولبيد', 'بودره', 'ديتول', 'معطر فم', 'سيجنال', 'سنسوداين', 'كلوس اب', 'خيط اسنان', 'عازل طبي'], 'مستلزمات طبية': ['بلاستر', 'شاش', 'قطن', 'رباط', 'سرنجة', 'جهاز ضغط', 'ترمومتر', 'كمامة', 'كحول', 'بيتادين', 'قسطرة', 'جبيرة', 'حزام', 'انكل', 'ركبه', 'كوع', 'فيكريل', 'برولين', 'كانيولا', 'دريسنج', 'قربة', 'مبوله'], 'العطور': ['برفان', 'كولونيا', 'عطر', 'اسبلاش', 'فوج'], 'المنزل والمبيدات': ['بايجون', 'ريد', 'جليد', 'ملمع', 'مناديل', 'ديتول', 'راجون', 'كيروكس', 'لزقة فار', 'صراصير'] },
            CATEGORY_ICONS: {'كل الأصناف':'fa-boxes-stacked','العناية بالشعر':'fa-cut','العناية بالبشرة':'fa-spa','العناية بالطفل':'fa-baby','العناية الشخصية':'fa-user-shield','مستلزمات طبية':'fa-briefcase-medical','العطور':'fa-spray-can-sparkles','المنزل والمبيدات':'fa-bug-slash','متنوع':'fa-shapes'},
        },
        elements: {},

        init() {
            this.cacheElements();
            this.listenForAuthState();
            this.setupAuthEventListeners();
            this.setupSettingsTabs();
            this.setupAvatarUploadEvents();
            this.setupScrollListener(); // (جديد)
        },

        cacheElements() {
            this.elements = {
                authPage: document.getElementById('auth-page'),
                authTitle: document.getElementById('auth-title'),
                authSubtitle: document.getElementById('auth-subtitle'),
                loginForm: document.getElementById('login-form'),
                signupForm: document.getElementById('signup-form'),
                // (تعديل) تابات المصادقة الجديدة
                authTabLogin: document.getElementById('auth-tab-login'),
                authTabSignup: document.getElementById('auth-tab-signup'),
                authTabHighlighter: document.getElementById('auth-tab-highlighter'), // (جديد)
                authFormContainer: document.getElementById('auth-form-container'),
                
                pendingPage: document.getElementById('pending-page'),
                appContainer: document.getElementById('app'),
                loader: document.getElementById('loader'),
                inventoryGrid: document.getElementById('inventory-grid'),
                categoryTabsContainer: document.getElementById('category-tabs-container'),
                noResults: document.getElementById('no-results'),
                searchInput: document.getElementById('searchInput'),
                clearSearchBtn: document.getElementById('clearSearchBtn'),
                addProductBtn: document.getElementById('addProductBtn'),
                currentYear: document.getElementById('current-year'),
                
                // عناصر الأفاتار
                avatarContainer: document.getElementById('avatar-container'),
                userAvatarButton: document.getElementById('user-avatar-button'),
                avatarMenu: document.getElementById('avatar-menu'),
                avatarMenuName: document.getElementById('avatar-menu-name'),
                avatarMenuEmail: document.getElementById('avatar-menu-email'),
                avatarMenuLevelName: document.getElementById('avatar-menu-level-name'),
                avatarSettingsBtn: document.getElementById('avatar-settings-btn'),
                avatarAdminBtn: document.getElementById('avatar-admin-btn'),
                avatarLogoutBtn: document.getElementById('avatar-logout-btn'),

                // عناصر رفع صورة الأفاتار
                avatarUploadSection: document.getElementById('avatar-upload-section'),
                avatarPreview: document.getElementById('avatar-preview'),
                avatarFileInput: document.getElementById('avatar-file-input'),
                avatarUrlInput: document.getElementById('avatar-url-input'),

                adminPanel: document.getElementById('admin-panel'),
                adminUsersList: document.getElementById('admin-users-list'),
                closeAdminPanel: document.getElementById('close-admin-panel'),

                currentCategoryTitle: document.getElementById('current-category-title'),
                sortBtn: document.getElementById('sort-btn'),
                sortDropdown: document.getElementById('sort-dropdown'),
                sortLabel: document.getElementById('sort-label'),
                lazyLoader: document.getElementById('lazy-loader'),
                sentinel: document.getElementById('sentinel'),
                installToast: document.getElementById('install-toast'),
                installBtn: document.getElementById('install-btn'),
                dismissInstallBtn: document.getElementById('dismiss-install-btn'),
                
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

                cartBtn: document.getElementById('cart-btn'),
                cartCount: document.getElementById('cart-count'),
                cartPanel: document.getElementById('cart-panel'),
                closeCartPanel: document.getElementById('close-cart-panel'),
                cartPanelCount: document.getElementById('cart-panel-count'),
                cartItemsContainer: document.getElementById('cart-items-container'),
                cartEmptyMsg: document.getElementById('cart-empty-msg'),
                cartTotalPrice: document.getElementById('cart-total-price'),
                checkoutBtn: document.getElementById('checkout-btn'),

                sitemapLink: document.getElementById('sitemap-link'),
                sitemapPanel: document.getElementById('sitemap-panel'),
                closeSitemapPanel: document.getElementById('close-sitemap-panel'),
                sitemapContent: document.getElementById('sitemap-content'),

                footerBrandLink: document.getElementById('footer-brand-link'),
            };
            
            // (جديد) تحديد ارتفاع النموذج الأولي
            if (this.elements.loginForm) {
                this.elements.authFormContainer.style.height = this.elements.loginForm.scrollHeight + 'px';
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
                            this.showInventoryApp();
                            this.showWelcomeMessage(this.state.user.name);
                        } else if (userDoc.exists()) {
                            this.state.user = { isLoggedIn: false, isPending: true, data: null };
                            this.showPendingPage();
                        } else {
                            console.warn(`User ${firebaseUser.uid} is authenticated but no document exists in Firestore. This might be a race condition during signup.`);
                        }
                    }, (error) => {
                        console.error("Error listening to user doc:", error);
                        this.state.user = { isLoggedIn: false, isPending: false, data: null, uid: null, role: null };
                        this.showAuthPage();
                    });
                } else {
                    this.state.user = { isLoggedIn: false, isPending: false, data: null, uid: null, role: null };
                    this.showAuthPage();
                }
            });
        },

        setupAuthEventListeners() {
            // (جديد) مستمعي التابات مع التحريك الفني
            this.elements.authTabLogin.addEventListener('click', () => {
                this.elements.authTabLogin.classList.add('active');
                this.elements.authTabSignup.classList.remove('active');
                
                this.elements.loginForm.classList.add('form-active');
                this.elements.signupForm.classList.remove('form-active');

                this.elements.authTitle.textContent = 'تسجيل الدخول';
                this.elements.authSubtitle.textContent = 'أهلاً بك في صيدلية د. سيد';
                
                this.elements.authTabHighlighter.style.transform = 'translateX(0%)';
                this.elements.authFormContainer.style.height = this.elements.loginForm.scrollHeight + 'px';
            });
            
            this.elements.authTabSignup.addEventListener('click', () => {
                this.elements.authTabLogin.classList.remove('active');
                this.elements.authTabSignup.classList.add('active');

                this.elements.loginForm.classList.remove('form-active');
                this.elements.signupForm.classList.add('form-active');

                this.elements.authTitle.textContent = 'إنشاء حساب جديد';
                this.elements.authSubtitle.textContent = 'لنبدأ رحلتك معنا!';
                
                this.elements.authTabHighlighter.style.transform = 'translateX(-100%)'; // (لـ RTL)
                this.elements.authFormContainer.style.height = this.elements.signupForm.scrollHeight + 'px';
            });
            
            document.querySelectorAll('.password-icon').forEach(icon => { icon.addEventListener('click', () => { const targetInput = document.getElementById(icon.dataset.target); targetInput.type = targetInput.type === 'password' ? 'text' : 'password'; icon.classList.toggle('fa-eye'); icon.classList.toggle('fa-eye-slash'); }); });
            this.elements.loginForm.addEventListener('submit', this.handleLogin.bind(this));
            this.elements.signupForm.addEventListener('submit', this.handleSignup.bind(this));
            document.getElementById('pending-logout-button').addEventListener('click', () => signOut(auth));
            document.getElementById('forgot-password-link').addEventListener('click', this.handlePasswordReset.bind(this));
        },
        
        // (جديد) مستمع تمرير الصفحة لإضافة ظل للقائمة
        setupScrollListener() {
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                const header = document.querySelector('header.header-glass');
                if (!header) return;
                header.classList.add('is-scrolling');
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (window.scrollY === 0) {
                        header.classList.remove('is-scrolling');
                    }
                }, 100);
            }, { passive: true });
        },

        // ... (handleLogin, handleSignup, handlePasswordReset, setLoading - unchanged) ...
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
                } catch (setDocError) {
                    console.error("Error creating user document in Firestore:", setDocError);
                    Swal.fire('خطأ في التسجيل', 'تم إنشاء الحساب ولكن فشل حفظ البيانات. الرجاء الاتصال بالدعم.', 'error');
                }
            } catch (error) { 
                Swal.fire('خطأ', 'حدث خطأ. تأكد أن كلمة المرور 6 حروف على الأقل والإيميل غير مستخدم.', 'error'); 
            } finally { 
                this.setLoading(button, false, 'إنشاء الحساب'); 
            } 
        },
        async handlePasswordReset(e) { e.preventDefault(); const { value: email } = await Swal.fire({ title: 'إعادة تعيين كلمة المرور', input: 'email', inputLabel: 'البريد الإلكتروني المسجل به', inputPlaceholder: 'ادخل بريدك الإلكتروني', showCancelButton: true, confirmButtonText: 'إرسال رابط الاستعادة', cancelButtonText: 'إلغاء', customClass: { popup: 'rounded-lg' } }); if (email) try { await sendPasswordResetEmail(auth, email); Swal.fire('تم الإرسال!', 'تفقد بريدك الإلكتروني.', 'success'); } catch (error) { Swal.fire('خطأ', 'لم نتمكن من إرسال البريد.', 'error'); } },
        setLoading(button, isLoading, text) { if (!button) return; button.disabled = isLoading; button.innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin mr-2"></i> ${text}` : text; },

        showAuthPage() {
            this.elements.authPage.style.display = 'flex';
            this.elements.pendingPage.style.display = 'none';
            this.elements.appContainer.style.display = 'none';
            if (this.state.inventory.unsubscribeProducts) { this.state.inventory.unsubscribeProducts(); this.state.inventory.unsubscribeProducts = null; }
        },
        showPendingPage() {
            this.elements.authPage.style.display = 'none';
            this.elements.pendingPage.style.display = 'flex';
            this.elements.appContainer.style.display = 'none';
        },
        showInventoryApp() {
            this.elements.authPage.style.display = 'none';
            this.elements.pendingPage.style.display = 'none';
            this.elements.appContainer.style.display = 'flex';
            this.initInventory();
        },

        initInventory() {
            if (this.state.inventory.unsubscribeProducts) return; // لا تقم بإعادة التهيئة

            this.renderUserAvatar();
            
            // إعداد قائمة الأفاتار
            this.elements.userAvatarButton.onclick = () => this.elements.avatarMenu.classList.toggle('hidden');
            this.elements.avatarSettingsBtn.onclick = () => { this.showSettingsPanel(); this.elements.avatarMenu.classList.add('hidden'); };
            this.elements.avatarLogoutBtn.onclick = () => { signOut(auth); this.elements.avatarMenu.classList.add('hidden'); };
            
            // إغلاق القائمة عند النقر خارجها
            document.addEventListener('click', (e) => {
                if (!this.elements.avatarContainer.contains(e.target) && !this.elements.avatarMenu.classList.contains('hidden')) {
                    this.elements.avatarMenu.classList.add('hidden');
                }
            });

            if (this.state.user.role === 'admin') {
                this.elements.avatarAdminBtn.classList.remove('hidden');
                this.elements.avatarAdminBtn.onclick = () => { this.showAdminPanel(); this.elements.avatarMenu.classList.add('hidden'); };
                this.elements.addProductBtn.classList.remove('hidden');
                this.elements.addProductBtn.classList.add('flex');
                this.elements.addProductBtn.onclick = () => this.showProductModal();
                this.listenForNotifications();
            } else {
                this.elements.avatarAdminBtn.classList.add('hidden');
                this.elements.addProductBtn.classList.add('hidden');
                this.elements.addProductBtn.classList.remove('flex');
                this.stopListeningForNotifications();
            }

            // ... (باقي المستمعين - كما هم) ...
            this.elements.inventoryGrid.onclick = this.handleGridClick.bind(this);
            this.elements.categoryTabsContainer.onclick = this.handleCategoryClick.bind(this);
            this.elements.searchInput.oninput = this.handleSearchInput.bind(this);
            this.elements.clearSearchBtn.onclick = this.clearSearch.bind(this);
            this.elements.currentYear.textContent = new Date().getFullYear();
            this.elements.sortBtn.onclick = this.toggleSortDropdown.bind(this);
            this.elements.sortDropdown.onclick = this.handleSortSelection.bind(this);
            this.elements.closeSettingsPanel.onclick = this.closeSettingsPanel.bind(this);
            this.elements.settingsPanel.onclick = (e) => { if (e.target === this.elements.settingsPanel) this.closeSettingsPanel(); };
            this.elements.profileSettingsForm.onsubmit = this.handleUpdateProfile.bind(this);
            this.elements.passwordSettingsForm.onsubmit = this.handleUpdatePassword.bind(this);
            this.elements.cartBtn.onclick = this.showCartPanel.bind(this);
            this.elements.closeCartPanel.onclick = this.closeCartPanel.bind(this);
            this.elements.cartPanel.onclick = (e) => { if (e.target === this.elements.cartPanel) this.closeCartPanel(); };
            this.elements.cartItemsContainer.onclick = this.handleCartClick.bind(this);
            this.elements.checkoutBtn.onclick = this.handleCheckout.bind(this);
            this.elements.sitemapLink.onclick = this.showSitemapPanel.bind(this);
            this.elements.closeSitemapPanel.onclick = this.closeSitemapPanel.bind(this);
            this.elements.sitemapPanel.onclick = (e) => { if (e.target === this.elements.sitemapPanel) this.closeSitemapPanel(); };
            this.elements.sitemapContent.onclick = this.handleSitemapClick.bind(this);
            document.addEventListener('click', (e) => { if (this.elements.sortBtn && !this.elements.sortBtn.contains(e.target) && this.elements.sortDropdown && !this.elements.sortDropdown.contains(e.target)) { this.elements.sortDropdown.classList.add('hidden'); } });
            this.listenForProducts();
            this.setupObserver();
            window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.state.deferredPrompt = e; if (localStorage.getItem('installPromptShown') !== 'true' && this.elements.installToast) { this.elements.installToast.classList.add('install-toast-show'); } });
            if(this.elements.installBtn) this.elements.installBtn.addEventListener('click', this.handleInstallClick.bind(this));
            if(this.elements.dismissInstallBtn) this.elements.dismissInstallBtn.addEventListener('click', this.handleInstallDismiss.bind(this));
        },

        showWelcomeMessage(name) {
            const welcomeKey = `welcome_${this.state.user.uid}`; if (!localStorage.getItem(welcomeKey)) { Swal.fire({ icon: 'success', title: `أهلاً بك، ${name.split(' ')[0]}!`, text: 'سعداء بإنضمامك لصيدلية د. سيد.', timer: 2500, showConfirmButton: false, toast: true, position: 'top-end' }); localStorage.setItem(welcomeKey, 'true'); }
        },

        // (تعديل) تحديث دالة الأفاتار لإزالة شريط XP
        renderUserAvatar() {
            const user = this.state.user;
            const button = this.elements.userAvatarButton;
            let iconClass, buttonClass, levelName;

            const isSuperAdmin = user.role === 'admin' && !user.promotedBy;

            if (isSuperAdmin) {
                iconClass = 'fa-crown';
                buttonClass = 'avatar-super-admin';
                levelName = 'المستوى 99 (الأدمن الأساسي)';
            } else if (user.role === 'admin') {
                iconClass = 'fa-user-shield';
                buttonClass = 'avatar-admin';
                levelName = 'المستوى 50 (أدمن)';
            } else {
                iconClass = 'fa-user';
                buttonClass = 'avatar-user';
                levelName = 'المستوى 1 (مستخدم)';
            }

            // تحديث زر الأفاتار
            button.className = `avatar-button ${buttonClass}`;
            if (user.avatarUrl) {
                button.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\'fas ${iconClass}\'></i>';">`;
            } else {
                button.innerHTML = `<i class="fas ${iconClass}"></i>`;
            }

            // تحديث القائمة المنسدلة
            this.elements.avatarMenuName.textContent = user.name || 'مستخدم';
            this.elements.avatarMenuEmail.textContent = user.email || '...';
            this.elements.avatarMenuLevelName.textContent = levelName;
        },

        // --- دوال الإشعارات (معدلة) ---
        listenForNotifications() {
            const pendingUsersQuery = query(this.state.inventory.usersCollection, where("status", "==", "pending"));
            this.state.admin.unsubscribePendingUsers = onSnapshot(pendingUsersQuery, (snapshot) => { this.state.notifications.pendingUsers = snapshot.size; this.updateNotificationBadge(); });
            const pendingOrdersQuery = query(this.state.inventory.ordersCollection, where("status", "==", "pending"));
            this.state.admin.unsubscribePendingOrders = onSnapshot(pendingOrdersQuery, (snapshot) => { this.state.notifications.pendingOrders = snapshot.size; this.updateNotificationBadge(); });
        },
        stopListeningForNotifications() {
            if (this.state.admin.unsubscribePendingUsers) this.state.admin.unsubscribePendingUsers();
            if (this.state.admin.unsubscribePendingOrders) this.state.admin.unsubscribePendingOrders();
            this.state.notifications = { pendingUsers: 0, pendingOrders: 0 };
            this.updateNotificationBadge();
        },
        updateNotificationBadge() {
            const totalNotifications = this.state.notifications.pendingUsers + this.state.notifications.pendingOrders;
            const adminBtnIcon = this.elements.avatarAdminBtn.querySelector('i');
            if (totalNotifications > 0) {
                adminBtnIcon.classList.add('has-notification');
            } else {
                adminBtnIcon.classList.remove('has-notification');
            }
        },
        
        // --- دوال المخزون (Inventory Functions) ---
        listenForProducts() { this.state.inventory.isLoading = true; this.elements.loader.style.display = 'block'; this.state.inventory.unsubscribeProducts = onSnapshot(this.state.inventory.productsCollection, (querySnapshot) => { this.state.inventory.fullInventory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); this.processAndCategorize(); this.filterAndRender(); this.state.inventory.isLoading = false; this.elements.loader.style.display = 'none'; }, (error) => { console.error("Firestore listen error:", error); this.elements.loader.innerHTML = '<p class="text-red-500">حدث خطأ أثناء تحميل البيانات.</p>'; }); },
        processAndCategorize() { const data = this.state.inventory.fullInventory; const categories = { 'كل الأصناف': [...data] }; Object.keys(this.config.CATEGORY_KEYWORDS).forEach(cat => { categories[cat] = []; }); categories['متنوع'] = []; data.forEach(product => { const category = this.getCategory(product['الصنف']); if (!categories[category]) categories[category] = []; categories[category].push(product); }); this.state.inventory.categorizedProducts = categories; },
        filterAndRender() { const searchTerm = this.elements.searchInput.value.toLowerCase().trim(); const activeCategory = this.state.inventory.activeCategory || 'كل الأصناف'; let sourceList = searchTerm ? this.state.inventory.fullInventory.filter(item => (item['الصنف'] || '').toLowerCase().includes(searchTerm)) : (this.state.inventory.categorizedProducts[activeCategory] || []); let sortedList = [...sourceList]; switch (this.state.inventory.currentSort) { case 'price-desc': sortedList.sort((a, b) => Number(b['السعر']) - Number(a['السعر'])); break; case 'price-asc': sortedList.sort((a, b) => Number(a['السعر']) - Number(b['السعر'])); break; case 'name-asc': sortedList.sort((a, b) => (a['الصنف']||'').localeCompare(b['الصنف']||'', 'ar')); break; case 'name-desc': sortedList.sort((a, b) => (b['الصنف']||'').localeCompare(a['الصنف']||'', 'ar')); break; } this.state.inventory.currentFilteredList = sortedList; this.elements.inventoryGrid.innerHTML = ''; this.state.inventory.displayOffset = 0; this.loadMoreItems(); this.updateCategoryTabs(); this.elements.noResults.style.display = sortedList.length === 0 ? 'block' : 'none'; this.elements.currentCategoryTitle.textContent = searchTerm ? `نتائج البحث عن: "${searchTerm}"` : activeCategory; },
        loadMoreItems() { const offset = this.state.inventory.displayOffset; const batchSize = this.config.BATCH_SIZE; const items = this.state.inventory.currentFilteredList.slice(offset, offset + batchSize); this.elements.lazyLoader.style.display = items.length > 0 && this.state.inventory.currentFilteredList.length > offset + batchSize ? 'block' : 'none'; if (items.length > 0) { this.renderProductBatch(items); this.state.inventory.displayOffset += items.length; } },
        renderProductBatch(items) { const fragment = document.createDocumentFragment(); items.forEach((item, index) => { const color = this.config.CARD_COLORS[(this.state.inventory.displayOffset + index) % this.config.CARD_COLORS.length]; const card = document.createElement('div'); card.className = 'product-card flex flex-col rounded-lg product-card-fade-in'; card.style.borderTopColor = color; card.style.setProperty('--glow-color', color + '99'); const canEdit = this.state.user.role === 'admin'; const imagePart = item.صورة ? `<img src="${item.صورة}" class="product-image product-image-btn" data-id="${item.id}" alt="${this.escapeHtml(item['الصنف'])}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/400x200/eef2ff/4f46e5?text=No%20Image';">` : `<div class="${canEdit ? 'image-placeholder' : 'image-placeholder-disabled'} h-40 flex items-center justify-center bg-gray-50 border-b" data-id="${item.id}" ${canEdit ? '' : 'style="cursor: default;"'}><div class="text-center text-text-muted pointer-events-none"><i class="fas fa-camera text-5xl"></i><p class="mt-2 text-sm font-semibold">${canEdit ? 'إضافة صورة' : 'لا توجد صورة'}</p></div></div>`; const quantity = item['الكمية'] !== undefined ? parseInt(item['الكمية']) : -1; let quantityText = ''; if (quantity === -1) { quantityText = `<p class="text-sm font-semibold text-gray-400">الكمية: غير محدد</p>`; } else if (quantity <= 0) { quantityText = `<p class="text-sm font-bold text-red-600">نفدت الكمية</p>`; } else if (quantity <= 10) { quantityText = `<p class="text-sm font-semibold text-yellow-600">الكمية: ${quantity} (قليلة)</p>`; } else { quantityText = `<p class="text-sm font-semibold text-green-600">الكمية: ${quantity}</p>`; } const isOutOfStock = quantity === 0; const addToCartBtn = `<button class="add-to-cart-btn mt-3" data-id="${item.id}" ${isOutOfStock ? 'disabled' : ''}>${isOutOfStock ? 'نفدت الكمية' : 'أضف للسلة <i class="fas fa-cart-plus mr-2"></i>'}</button>`; card.innerHTML = `<div class="relative">${imagePart}${this.state.user.role === 'admin' ? `<div class="card-actions"><button class="action-btn edit-btn" data-id="${item.id}" title="تعديل"><i class="fas fa-edit"></i></button><button class="action-btn delete-btn" data-id="${item.id}" title="حذف"><i class="fas fa-trash-alt"></i></button></div>` : ''}</div><div class="p-4 flex flex-col flex-grow"><h3 class="font-bold text-lg h-14">${this.escapeHtml(item['الصنف'])}</h3><div class="mt-4 flex-grow"><p class="text-primary text-2xl font-black">${Number(item['السعر']).toFixed(2)} جم</p></div><div class="mt-2 pt-2 border-t border-gray-100">${quantityText}</div>${addToCartBtn}</div>`; fragment.appendChild(card); }); this.elements.inventoryGrid.appendChild(fragment); },
        updateCategoryTabs() { this.elements.categoryTabsContainer.innerHTML = ''; const categoryOrder = ['كل الأصناف', ...Object.keys(this.config.CATEGORY_KEYWORDS), 'متنوع']; categoryOrder.forEach(category => { const products = this.state.inventory.categorizedProducts[category]; if (products && products.length > 0) { const tab = document.createElement('button'); tab.className = `category-tab ${this.state.inventory.activeCategory === category ? 'active' : ''}`; tab.dataset.category = category; tab.innerHTML = `<i class="fas ${this.config.CATEGORY_ICONS[category] || 'fa-tag'} mr-2"></i><span>${category} (${products.length})</span>`; this.elements.categoryTabsContainer.appendChild(tab); } }); },
        getCategory(productName) { const lowerCaseName = String(productName || '').toLowerCase(); if (lowerCaseName.includes('كريم') && (lowerCaseName.includes('شعر') || lowerCaseName.includes('هير'))) return 'العناية بالشعر'; if (lowerCaseName.includes('جونسون') || lowerCaseName.includes('بامبرz') || lowerCaseName.includes('مولفكس')) return 'العناية بالطفل'; for (const category in this.config.CATEGORY_KEYWORDS) { if (this.config.CATEGORY_KEYWORDS[category].some(keyword => lowerCaseName.includes(keyword))) return category; } return 'متنوع'; },
        handleSearchInput(e) { this.state.inventory.searchTerm = e.target.value; this.elements.clearSearchBtn.style.display = e.target.value ? 'flex' : 'none'; this.state.inventory.activeCategory = 'كل الأصناف'; this.filterAndRender(); },
        clearSearch() { this.elements.searchInput.value = ''; this.handleSearchInput({target: this.elements.searchInput}); },
        handleCategoryClick(e) { const target = e.target.closest('.category-tab'); if (target) { this.state.inventory.activeCategory = target.dataset.category; this.state.inventory.searchTerm = ''; this.elements.searchInput.value = ''; this.filterAndRender(); } },
        handleGridClick(e) { const editBtn = e.target.closest('.edit-btn'); const deleteBtn = e.target.closest('.delete-btn'); const imgPlaceholder = e.target.closest('.image-placeholder'); const addToCartBtn = e.target.closest('.add-to-cart-btn'); const productImage = e.target.closest('.product-image-btn'); const id = editBtn?.dataset.id || deleteBtn?.dataset.id || imgPlaceholder?.dataset.id || addToCartBtn?.dataset.id || productImage?.dataset.id; if (!id) return; const product = this.state.inventory.fullInventory.find(p => p.id === id); if (!product) return; if (productImage) { this.showImageModal(product); return; } if (addToCartBtn) { this.addToCart(product); return; } if (imgPlaceholder && this.state.user.role === 'admin') { this.showImageModal(product); return; } if (this.state.user.role === 'admin') { if (editBtn) this.showProductModal(product); else if (deleteBtn) this.deleteProduct(product); } },
        handleSortSelection(e) { e.preventDefault(); const target = e.target.closest('.sort-option'); if (target) { this.state.inventory.currentSort = target.dataset.sort; this.elements.sortLabel.textContent = target.textContent; this.elements.sortDropdown.classList.add('hidden'); this.filterAndRender(); } },
        setupObserver() { if (this.state.inventory.observer) this.state.inventory.observer.disconnect(); const observerCallback = (entries) => { if (entries[0].isIntersecting) this.loadMoreItems(); }; this.state.inventory.observer = new IntersectionObserver(observerCallback, { rootMargin: '400px' }); if (this.elements.sentinel) this.state.inventory.observer.observe(this.elements.sentinel); },
        handleInstallClick() { this.handleInstallDismiss(); if (this.state.deferredPrompt) { this.state.deferredPrompt.prompt(); this.state.deferredPrompt.userChoice.then(() => { this.state.deferredPrompt = null; }); } },
        handleInstallDismiss() { if(this.elements.installToast) this.elements.installToast.classList.remove('install-toast-show'); localStorage.setItem('installPromptShown', 'true'); },
        toggleSortDropdown() { this.elements.sortDropdown.classList.toggle('hidden'); },
        async showProductModal(product = null) { const isEditing = !!product; const { value: formValues } = await Swal.fire({ title: isEditing ? 'تعديل الصنف' : 'إضافة صنف جديد', html: `<input id="swal-input-name" class="swal2-input" placeholder="اسم الصنف" value="${isEditing ? this.escapeHtml(product['الصنف']) : ''}"><input id="swal-input-price" class="swal2-input" type="number" step="0.01" placeholder="السعر" value="${isEditing ? product['السعر'] : ''}"><input id="swal-input-quantity" class="swal2-input" type="number" step="1" placeholder="الكمية المتاحة (Stock)" value="${isEditing ? (product['الكمية'] || 0) : ''}"><input id="swal-input-image" class="swal2-input" placeholder="رابط الصورة (اختياري)" value="${isEditing ? (product['صورة'] || '') : ''}"><p class="text-sm text-gray-500 mt-2">ملاحظة: القسم يتم تحديده أوتوماتيكياً بناءً على الاسم.</p>`, focusConfirm: false, showCancelButton: true, confirmButtonText: isEditing ? 'حفظ التعديلات' : 'إضافة', cancelButtonText: 'إلغاء', preConfirm: () => ({ "الصنف": document.getElementById('swal-input-name').value, "السعر": parseFloat(document.getElementById('swal-input-price').value), "الكمية": parseInt(document.getElementById('swal-input-quantity').value), "صورة": document.getElementById('swal-input-image').value }) }); if (!formValues || !formValues['الصنف'] || isNaN(formValues['السعر']) || isNaN(formValues['الكمية'])) { if (formValues) Swal.fire('خطأ', 'يرجى ملء الاسم والسعر والكمية بشكل صحيح.', 'error'); return; } Swal.fire({ title: 'جاري الحفظ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false }); if (isEditing) await this.updateProduct({ ...product, ...formValues }); else await this.addProduct({ ...formValues }); Swal.close(); },
        async showImageModal(product) { const canEdit = this.state.user.role === 'admin'; const { isConfirmed, isDenied, value: result } = await Swal.fire({ title: `صورة: ${this.escapeHtml(product['الصنف'])}`, html: `<div class="mb-4"><img id="image-preview" src="${product.صورة || 'https://placehold.co/400x200/eef2ff/4f46e5?text=No%20Image'}" class="w-full h-48 object-contain rounded-lg mx-auto" alt="Preview"></div><div id="drop-zone" class="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center ${canEdit ? 'cursor-pointer hover:border-primary hover:bg-gray-50' : ''} transition-colors"><p class="text-text-muted pointer-events-none">${canEdit ? 'اسحب وأفلت صورة هنا أو انقر للاختيار' : 'صورة المنتج'}</p><input type="file" id="swal-file" class="hidden" accept="image/*" ${!canEdit ? 'disabled' : ''}></div><p class="my-3 text-gray-400">${canEdit ? 'أو أدخل رابط الصورة' : ''}</p><input id="swal-url" class="swal2-input" placeholder="https://example.com/image.png" value="${product.صورة?.startsWith('http') ? product.صورة : ''}" ${!canEdit ? 'disabled' : ''}>`, showCancelButton: true, showDenyButton: canEdit && !!product.صورة, confirmButtonText: canEdit ? '<i class="fas fa-save mr-2"></i>حفظ الصورة' : 'حسنًا', cancelButtonText: 'إلغاء', denyButtonText: '<i class="fas fa-trash-alt mr-2"></i>إزالة الصورة', didOpen: () => { if (!canEdit) return; const dropZone = document.getElementById('drop-zone'); const fileInput = document.getElementById('swal-file'); const urlInput = document.getElementById('swal-url'); const preview = document.getElementById('image-preview'); const handleFile = (file) => { if (!file || !file.type.startsWith('image/')) return; const reader = new FileReader(); reader.onload = (e) => { preview.src = e.target.result; urlInput.value = ''; }; reader.readAsDataURL(file); }; dropZone.onclick = () => fileInput.click(); dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-primary', 'bg-indigo-50'); }; dropZone.ondragleave = () => dropZone.classList.remove('border-primary', 'bg-indigo-50'); dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('border-primary', 'bg-indigo-50'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); }; fileInput.onchange = () => handleFile(fileInput.files[0]); urlInput.oninput = () => { preview.src = urlInput.value || 'https://placehold.co/400x200/eef2ff/4f46e5?text=No%20Image'; }; }, preConfirm: () => ({ imageSrc: document.getElementById('image-preview').src, url: document.getElementById('swal-url').value }) }); if (!canEdit) return; if (isConfirmed && result) { const newImageSrc = result.imageSrc; if (newImageSrc.startsWith('data:image')) { Swal.fire({ title: 'جاري رفع الصورة...', text: 'قد يستغرق هذا بعض الوقت...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); try { const storageRef = ref(storage, `products/${product.id}-${Date.now()}`); const uploadResult = await uploadString(storageRef, newImageSrc, 'data_url'); const downloadURL = await getDownloadURL(uploadResult.ref); await this.updateProduct({ ...product, صورة: downloadURL }); if (product.صورة && product.صورة.includes('firebasestorage')) { const oldImageRef = ref(storage, product.صورة); await deleteObject(oldImageRef).catch(e => console.warn("Could not delete old image", e)); } Swal.fire({ icon: 'success', title: 'تم!', text: 'تم تحديث الصورة بنجاح.', timer: 1500, showConfirmButton: false }); } catch (error) { console.error("Image Upload Error:", error); Swal.fire('خطأ', 'فشل رفع الصورة. تأكد أن حجمها أقل من 1 ميجا.', 'error'); } } else { const newUrl = result.url; if (newUrl !== product.صورة) { await this.updateProduct({ ...product, صورة: newUrl }); Swal.fire({ icon: 'success', title: 'تم!', text: 'تم تحديث رابط الصورة.', timer: 1500, showConfirmButton: false }); } } } else if (isDenied) { if (product.صورة && product.صورة.includes('firebasestorage')) { const imageRef = ref(storage, product.صورة); await deleteObject(imageRef).catch(e => console.error("Could not delete image", e)); } await this.updateProduct({ ...product, صورة: '' }); Swal.fire({ icon: 'success', title: 'تمت إزالة الصورة بنجاح.', timer: 1500, showConfirmButton: false }); } },
        async addProduct(newProduct) { try { await addDoc(this.state.inventory.productsCollection, newProduct); } catch (e) { console.error(e); } },
        async updateProduct(updatedProduct) { try { const data = { ...updatedProduct }; delete data.id; await setDoc(doc(db, "products", updatedProduct.id), data, { merge: true }); } catch (e) { console.error(e); } },
        async deleteProduct(product) { const result = await Swal.fire({ title: 'هل أنت متأكد؟', text: `سيتم حذف "${this.escapeHtml(product['الصنف'])}" بشكل نهائي!`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذفه!', cancelButtonText: 'إلغاء' }); if (result.isConfirmed) try { if (product.صورة && product.صورة.includes('firebasestorage')) { const imageRef = ref(storage, product.صورة); await deleteObject(imageRef).catch(e => console.error("Could not delete image", e)); } await deleteDoc(doc(db, "products", product.id)); } catch (e) { console.error(e); } },
        escapeHtml(str) { if (typeof str !== 'string') return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; },

        // --- (تعديل) دوال لوحة الأدمن مع تأثيرات بصرية ---
        showAdminPanel() {
            this.elements.adminPanel.classList.add('show'); // (تعديل)
            this.elements.closeAdminPanel.onclick = this.closeAdminPanel.bind(this);
            this.elements.adminPanel.onclick = (e) => { if (e.target === this.elements.adminPanel) this.closeAdminPanel(); };
            const listContainer = this.elements.adminUsersList;
            listContainer.innerHTML = '<div class="text-center p-4"><div class="loader-dots mx-auto"><div class="dot1"></div><div class="dot2"></div><div class="dot3"></div></div></div>';
            listContainer.onclick = (e) => {
                const button = e.target.closest('button'); if (!button) return;
                const uid = button.dataset.uid; const name = button.dataset.name;
                const userRow = button.closest('li'); // (جديد) الحصول على الصف
                if (button.classList.contains('approve-user')) this.approveUser(uid, userRow);
                else if (button.classList.contains('promote-user')) this.promoteUser(uid, name, userRow);
                else if (button.classList.contains('demote-user')) this.demoteUser(uid, name, userRow);
                else if (button.classList.contains('delete-user')) this.deleteUser(uid, name, userRow);
            };
            this.state.admin.unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
                listContainer.innerHTML = '';
                const users = snapshot.docs.map(doc => doc.data());
                if (users.length === 0) { listContainer.innerHTML = '<p class="text-center text-gray-500">لا يوجد مستخدمون مسجلون بعد.</p>'; return; }
                users.sort((a, b) => (a.role === 'admin' && !a.promotedBy) ? -1 : 1); 
                users.forEach(u => {
                    const li = document.createElement('li');
                    li.className = 'flex items-center justify-between p-3 my-1 hover:bg-gray-100/50 rounded-lg transition-colors';
                    li.dataset.uid = u.uid; // (جديد) إضافة UID للصف
                    const isSuperAdmin = u.role === 'admin' && !u.promotedBy;
                    const roleIcon = isSuperAdmin ? '<i class="fas fa-crown text-yellow-500" title="Super Admin"></i>' : (u.role === 'admin' ? '<i class="fas fa-user-shield text-blue-500" title="Admin"></i>' : '<i class="fas fa-user text-gray-400" title="User"></i>');
                    const roleText = u.status === 'approved' ? (isSuperAdmin ? 'أدمن أساسي' : (u.role === 'admin' ? 'أدمن' : 'مستخدم')) : 'قيد المراجعة';
                    let buttons = '';
                    if (u.uid !== this.state.user.uid && !isSuperAdmin) {
                        if (u.status === 'pending') buttons += `<button data-uid="${u.uid}" class="approve-user px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600 transition-all">موافقة</button>`;
                        if (u.status === 'approved' && u.role !== 'admin') buttons += `<button data-uid="${u.uid}" data-name="${u.name}" class="promote-user px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-all">ترقية لأدمن</button>`;
                        if (u.role === 'admin' && u.promotedBy === this.state.user.uid) { buttons += `<button data-uid="${u.uid}" data-name="${u.name}" class="demote-user px-2 py-1 text-xs text-white bg-yellow-500 rounded hover:bg-yellow-600 transition-all">تخفيض لمستخدم</button>`; }
                        buttons += `<button data-uid="${u.uid}" data-name="${u.name}" class="delete-user px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600 transition-all">حذف</button>`;
                    }
                    li.innerHTML = `<div><p class="font-semibold flex items-center gap-2"><span>${u.name}</span><span class="text-xs text-gray-500">(${u.email})</span></p><p class="text-sm flex items-center gap-2">${roleIcon}<span>${roleText}</span></p></div><div class="flex items-center gap-2">${buttons}</div>`;
                    listContainer.appendChild(li);
                });
            });
        },
        closeAdminPanel() { this.elements.adminPanel.classList.remove('show'); if (this.state.admin.unsubscribeUsers) { this.state.admin.unsubscribeUsers(); this.state.admin.unsubscribeUsers = null; } },
        
        async approveUser(uid, userRow) {
            if (userRow) userRow.classList.add('user-promoted');
            await setDoc(doc(db, "users", uid), { status: 'approved' }, { merge: true });
        },
        async isSuperAdmin(uid) { if (!uid) return false; try { const userDoc = await getDoc(doc(db, "users", uid)); if (!userDoc.exists()) return false; const userData = userDoc.data(); return userData.role === 'admin' && !userData.promotedBy; } catch (e) { console.error("Error checking super admin status:", e); return false; } },

        async deleteUser(uid, name, userRow) {
            if (uid === this.state.user.uid) return;
            if (await this.isSuperAdmin(uid)) { Swal.fire('خطأ', 'لا يمكن حذف الأدمن الأساسي!', 'error'); return; }
            const result = await Swal.fire({ title: 'هل أنت متأكد؟', text: `سيتم حذف المستخدم "${name}"!`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذفه!', cancelButtonText: 'إلغاء' });
            if (result.isConfirmed) {
                if (userRow) userRow.classList.add('user-deleted');
                setTimeout(async () => {
                    await deleteDoc(doc(db, 'users', uid));
                    const avatarRef = ref(storage, `avatars/${uid}`);
                    await deleteObject(avatarRef).catch(e => console.warn("Could not delete avatar", e));
                }, 500); // انتظار انتهاء الأنيميشن
            }
        },
        async promoteUser(uid, name, userRow) {
            if (uid === this.state.user.uid) return;
            if (userRow) userRow.classList.add('user-promoted');
            await setDoc(doc(db, "users", uid), { role: 'admin', promotedBy: this.state.user.uid }, { merge: true });
        },
        async demoteUser(uid, name, userRow) {
            if (uid === this.state.user.uid) return;
            if (await this.isSuperAdmin(uid)) { Swal.fire('خطأ', 'لا يمكن تخفيض رتبة الأدمن الأساسي!', 'error'); return; }
            if (userRow) userRow.classList.add('user-demoted');
            await setDoc(doc(db, "users", uid), { role: 'user', promotedBy: deleteField() }, { merge: true });
        },

        // --- (جديد) دوال الإعدادات والأفاتار ---
        setupSettingsTabs() { this.elements.settingsTabs.forEach(tab => { tab.addEventListener('click', () => { this.elements.settingsTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); this.elements.settingsContentPanes.forEach(pane => { pane.classList.remove('active'); if (pane.id === `settings-tab-${tab.dataset.tab}`) { pane.classList.add('active'); } }); }); }); },
        showSettingsPanel() { this.loadSettings(); this.elements.settingsPanel.classList.add('show'); },
        closeSettingsPanel() { this.elements.settingsPanel.classList.remove('show'); this.state.ui.newAvatarDataUrl = null; this.state.ui.newAvatarUrl = null; },
        loadSettings() {
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
            const dropZone = this.elements.avatarUploadSection;
            const fileInput = this.elements.avatarFileInput;
            const urlInput = this.elements.avatarUrlInput;
            const preview = this.elements.avatarPreview;

            const handleFile = (file) => {
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    this.state.ui.newAvatarDataUrl = e.target.result; // تخزين كـ DataURL
                    this.state.ui.newAvatarUrl = null;
                    urlInput.value = '';
                };
                reader.readAsDataURL(file);
            };

            dropZone.onclick = () => fileInput.click();
            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
            dropZone.ondragleave = () => dropZone.classList.remove('dragover');
            dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); };
            fileInput.onchange = () => handleFile(fileInput.files[0]);
            urlInput.oninput = () => {
                const url = urlInput.value;
                if (url) {
                    preview.src = url;
                    this.state.ui.newAvatarDataUrl = null;
                    this.state.ui.newAvatarUrl = url; // تخزين كرابط
                } else {
                    preview.src = this.state.user.avatarUrl || 'https://placehold.co/100x100/e0e7ff/4f46e5?text=AV';
                }
            };
        },
        async handleUpdateProfile(e) {
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
                
                Swal.fire('تم!', 'تم تحديث بياناتك بنجاح.', 'success');
                this.closeSettingsPanel();
            } catch (error) {
                console.error("Profile Update Error:", error);
                Swal.fire('خطأ', 'لم نتمكن من تحديث بياناتك.', 'error');
            } finally {
                this.setLoading(this.elements.saveProfileBtn, false, 'حفظ التغييرات');
            }
        },
        async handleUpdatePassword(e) { e.preventDefault(); const newPassword = this.elements.settingsNewPassword.value; const confirmPassword = this.elements.settingsConfirmPassword.value; if (newPassword.length < 6) { Swal.fire('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error'); return; } if (newPassword !== confirmPassword) { Swal.fire('خطأ', 'كلمتا المرور غير متطابقتين.', 'error'); return; } this.setLoading(this.elements.savePasswordBtn, true, 'جاري التغيير...'); try { await updatePassword(auth.currentUser, newPassword); Swal.fire('تم!', 'تم تغيير كلمة المرور بنجاح.', 'success'); this.elements.passwordSettingsForm.reset(); this.closeSettingsPanel(); } catch (error) { console.error("Password Update Error:", error); Swal.fire('خطأ', 'فشلت العملية. قد تحتاج لإعادة تسجيل الدخول أولاً.', 'error'); } finally { this.setLoading(this.elements.savePasswordBtn, false, 'تغيير كلمة المرور'); } },

        // --- دوال سلة المشتريات (Cart) ---
        showCartPanel() { this.renderCartPanel(); this.elements.cartPanel.classList.add('show'); },
        closeCartPanel() { this.elements.cartPanel.classList.remove('show'); },
        addToCart(product) { const stock = product['الكمية'] !== undefined ? parseInt(product['الكمية']) : -1; if (stock === 0) { Swal.fire('عذراً', 'هذا المنتج نفد من المخزون.', 'warning'); return; } const existingItem = this.state.cart.find(item => item.id === product.id); if (existingItem) { if (stock !== -1 && existingItem.quantity >= stock) { Swal.fire('الحد الأقصى', 'لقد وصلت للكمية المتاحة من هذا المنتج.', 'info'); return; } existingItem.quantity++; } else { this.state.cart.push({ id: product.id, name: product['الصنف'], price: Number(product['السعر']), quantity: 1, stock: stock, image: product['صورة'] || null }); } this.elements.cartBtn.classList.add('fa-beat-animation'); setTimeout(() => this.elements.cartBtn.classList.remove('fa-beat-animation'), 600); this.updateCartUI(); },
        updateCartQuantity(productId, newQuantity) { const item = this.state.cart.find(item => item.id === productId); if (!item) return; if (newQuantity <= 0) { this.removeFromCart(productId); return; } if (item.stock !== -1 && newQuantity > item.stock) { Swal.fire('الحد الأقصى', 'الكمية المطلوبة أكبر من المتاح بالمخزون.', 'info'); item.quantity = item.stock; } else { item.quantity = newQuantity; } this.updateCartUI(); },
        removeFromCart(productId) { this.state.cart = this.state.cart.filter(item => item.id !== productId); this.updateCartUI(); },
        updateCartUI() { this.renderCartHeaderIcon(); if (this.elements.cartPanel.classList.contains('show')) { this.renderCartPanel(); } },
        renderCartHeaderIcon() { const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0); if (totalItems > 0) { this.elements.cartCount.textContent = totalItems; this.elements.cartCount.classList.remove('hidden'); } else { this.elements.cartCount.classList.add('hidden'); } },
        renderCartPanel() { const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0); this.elements.cartPanelCount.textContent = totalItems; if (this.state.cart.length === 0) { this.elements.cartItemsContainer.innerHTML = ''; this.elements.cartEmptyMsg.style.display = 'block'; this.elements.checkoutBtn.disabled = true; this.elements.cartTotalPrice.textContent = '0.00 جم'; return; } this.elements.cartEmptyMsg.style.display = 'none'; this.elements.cartItemsContainer.innerHTML = ''; let totalPrice = 0; this.state.cart.forEach(item => { const itemTotal = item.price * item.quantity; totalPrice += itemTotal; const itemElement = document.createElement('div'); itemElement.className = 'flex items-center gap-4 py-4 border-b border-gray-200'; itemElement.innerHTML = `<img src="${item.image || 'https://placehold.co/80x80/eef2ff/4f46e5?text=Img'}" alt="${this.escapeHtml(item.name)}" class="w-20 h-20 object-cover rounded-lg border"><div class="flex-1"><h4 class="font-bold">${this.escapeHtml(item.name)}</h4><p class="text-sm text-text-muted">${item.price.toFixed(2)} جم</p><div class="cart-item-quantity mt-2"><button class="cart-quantity-decrease" data-id="${item.id}">-</button><span class="font-bold w-8 text-center">${item.quantity}</span><button class="cart-quantity-increase" data-id="${item.id}" ${item.stock !== -1 && item.quantity >= item.stock ? 'disabled' : ''}>+</button></div></div><div class="text-left"><p class="font-bold text-primary">${itemTotal.toFixed(2)} جم</p><button class="cart-remove-item text-red-500 text-sm hover:underline mt-1" data-id="${item.id}">إزالة</button></div>`; this.elements.cartItemsContainer.appendChild(itemElement); }); this.elements.cartTotalPrice.textContent = `${totalPrice.toFixed(2)} جم`; this.elements.checkoutBtn.disabled = false; },
        handleCartClick(e) { const decreaseBtn = e.target.closest('.cart-quantity-decrease'); const increaseBtn = e.target.closest('.cart-quantity-increase'); const removeBtn = e.target.closest('.cart-remove-item'); if (decreaseBtn) { const id = decreaseBtn.dataset.id; const item = this.state.cart.find(i => i.id === id); if(item) this.updateCartQuantity(id, item.quantity - 1); } else if (increaseBtn) { const id = increaseBtn.dataset.id; const item = this.state.cart.find(i => i.id === id); if(item) this.updateCartQuantity(id, item.quantity + 1); } else if (removeBtn) { const id = removeBtn.dataset.id; this.removeFromCart(id); } },
        handleCheckout() { if (this.state.cart.length === 0) return; Swal.fire({ title: 'تأكيد الطلب', text: 'سيتم إرسال طلبك الآن، هل أنت متأكد؟', icon: 'info', showCancelButton: true, confirmButtonText: 'نعم، إتمام الطلب!', cancelButtonText: 'إلغاء' }).then(async (result) => { if (result.isConfirmed) { this.processCheckout(); } }); },
        async processCheckout() { this.setLoading(this.elements.checkoutBtn, true, 'جاري معالجة الطلب...'); try { await runTransaction(db, async (transaction) => { const itemsToOrder = [...this.state.cart]; const productRefs = {}; const productDocs = {}; for (const item of itemsToOrder) { const productRef = doc(db, "products", item.id); productRefs[item.id] = productRef; const productDoc = await transaction.get(productRef); if (!productDoc.exists()) { throw new Error(`المنتج ${item.name} لم يعد متاحاً.`); } productDocs[item.id] = productDoc.data(); } for (const item of itemsToOrder) { const productData = productDocs[item.id]; const currentStock = productData['الكمية'] !== undefined ? parseInt(productData['الكمية']) : -1; if (currentStock === -1) continue; if (currentStock < item.quantity) { throw new Error(`الكمية المتاحة من ${item.name} هي ${currentStock} فقط.`); } } const total = itemsToOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0); const orderData = { userId: this.state.user.uid, userName: this.state.user.name, userPhone: this.state.user.phone || '', items: itemsToOrder.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })), totalPrice: total, status: 'pending', createdAt: new Date() }; const newOrderRef = doc(collection(db, "orders")); transaction.set(newOrderRef, orderData); for (const item of itemsToOrder) { const productRef = productRefs[item.id]; const productData = productDocs[item.id]; const currentStock = productData['الكمية'] !== undefined ? parseInt(productData['الكمية']) : -1; if (currentStock !== -1) { const newStock = currentStock - item.quantity; transaction.update(productRef, { "الكمية": newStock }); } } }); Swal.fire('تم!', 'تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً.', 'success'); this.state.cart = []; this.updateCartUI(); this.closeCartPanel(); } catch (error) { console.error("Checkout Error:", error); Swal.fire('خطأ في الطلب', error.message, 'error'); } finally { this.setLoading(this.elements.checkoutBtn, false, 'إتمام الطلب'); } },

        // --- دوال خريطة الموقع (Sitemap) ---
        showSitemapPanel() { this.renderSitemap(); this.elements.sitemapPanel.classList.add('show'); },
        closeSitemapPanel() { this.elements.sitemapPanel.classList.remove('show'); },
        renderSitemap() { let content = '<nav class="space-y-2">'; content += `<a class="sitemap-link" data-action="go-home"><i class="fas fa-home"></i> الصفحة الرئيسية (كل الأصناف)</a>`; content += '<h4 class="text-lg font-semibold text-primary mt-6 mb-2">الأقسام</h4>'; const categoryOrder = ['كل الأصناف', ...Object.keys(this.config.CATEGORY_KEYWORDS), 'متنوع']; categoryOrder.forEach(category => { const products = this.state.inventory.categorizedProducts[category]; if (category !== 'كل الأصناف' && products && products.length > 0) { content += `<a class="sitemap-link" data-action="go-category" data-category="${category}"><i class="fas ${this.config.CATEGORY_ICONS[category] || 'fa-tag'}"></i> ${category}</a>`; } }); content += '<h4 class="text-lg font-semibold text-primary mt-6 mb-2">الحساب والطلبات</h4>'; content += `<a class="sitemap-link" data-action="go-cart"><i class="fas fa-shopping-cart"></i> سلة المشتريات</a>`; content += `<a class="sitemap-link" data-action="go-settings"><i class="fas fa-cog"></i> إعدادات الحساب</a>`; if (this.state.user.role === 'admin') { content += '<h4 class="text-lg font-semibold text-primary mt-6 mb-2">الإدارة</h4>'; content += `<a class="sitemap-link" data-action="go-admin"><i class="fas fa-user-shield"></i> لوحة تحكم الأدمن</a>`; } content += '</nav>'; this.elements.sitemapContent.innerHTML = content; },
        handleSitemapClick(e) { const link = e.target.closest('.sitemap-link'); if (!link) return; const action = link.dataset.action; this.closeSitemapPanel(); switch (action) { case 'go-home': document.querySelector('.category-tab[data-category="كل الأصناف"]')?.click(); break; case 'go-category': const category = link.dataset.category; document.querySelector(`.category-tab[data-category="${category}"]`)?.click(); break; case 'go-cart': this.showCartPanel(); break; case 'go-settings': this.showSettingsPanel(); break; case 'go-admin': if (this.state.user.role === 'admin') { this.showAdminPanel(); } break; } }
    };

    App.init();
