// A $(document).ready() equivalent
document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase Config (Original) ---
    // !! ضع بياناتك هنا !!
    const firebaseConfig = {
        apiKey: "AIzaSyBgzhSlzeVlqTrqefTP0rqAnlzBEKEDm6o",
        authDomain: "elloul-e82d8.firebaseapp.com",
        projectId: "elloul-e82d8",
        storageBucket: "elloul-e82d8.appspot.com",
        messagingSenderId: "190409612659",
        appId: "1:190409612659:web:cffcb1c4615502ee347906"
    };
    

    // --- Firebase Initialization (CORRECTED) ---
    let app, auth, db, storage;
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
    } catch (e) {
        console.error("Firebase initialization error:", e);
        showAlert('خطأ فادح', 'لم يتمكن التطبيق من الاتصال بقاعدة البيانات. برجاء تحديث الصفحة.', 'error');
        return; // Stop execution if Firebase fails
    }

    // --- Global State (Original) ---
    let currentUser = null;
    let userProfile = null;
    let products = []; // Local cache for products
    let cart = {}; // Local cart state

    // --- UI Elements (Original) ---
    const preloader = document.getElementById('preloader');
    const authPage = document.getElementById('auth-page');
    const appPage = document.getElementById('app-page');
    const pendingPage = document.getElementById('pending-page');
    const adminPanelPage = document.getElementById('admin-panel-page');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const pendingLogoutBtn = document.getElementById('pending-logout-btn');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    const productsGrid = document.getElementById('products-grid');
    const syncStatus = document.getElementById('sync-status');
    const noResults = document.getElementById('no-results');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const adminModal = document.getElementById('admin-modal');
    const closeAdminModalBtn = document.getElementById('close-admin-modal-btn');
    const usersListContainer = document.getElementById('users-list-container');
    const profileSettingsBtn = document.getElementById('profile-settings-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const profileTabBtn = document.getElementById('profile-tab-btn');
    const passwordTabBtn = document.getElementById('password-tab-btn');
    const profileTabContent = document.getElementById('profile-tab-content');
    const passwordTabContent = document.getElementById('password-tab-content');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMsg = document.getElementById('empty-cart-msg');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartCount = document.getElementById('cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    document.getElementById('current-year').textContent = new Date().getFullYear();


    // =================================================================
    // --- NEW/MODIFIED Helper Functions ---
    // =================================================================

    // =========================================
    // --- NEW: Telegram Bot Configuration ---
    // =========================================
    const telegramConfig = {
        botToken: '5597462927:AAElTlyh-XnhD3--1GS28iUPJc8XzTGDjpM', 
        chatId: 'YOUR_CHAT_ID' 
    };

    async function sendTelegramNotification(text) {
        if (!telegramConfig.botToken.startsWith('YOUR') && !telegramConfig.chatId.startsWith('YOUR')) {
            const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: telegramConfig.chatId,
                        text: text,
                        parse_mode: 'HTML'
                    }),
                });
                console.log("Telegram notification sent.");
            } catch (error) {
                console.error("Telegram notification failed:", error);
            }
        } else {
            console.warn("Telegram botToken or chatId is not set. Skipping notification.");
        }
    }
    // =========================================


    function showAlert(title, text, icon = 'info') {
        Swal.fire({
            title: title,
            text: text,
            icon: icon,
            confirmButtonText: 'حسنًا',
            customClass: {
                popup: 'rounded-lg shadow-lg',
                confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg',
            },
            buttonsStyling: false
        });
    }

    function showToast(message, icon = 'success') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: icon,
            title: message
        });
    }

    window.showAuth = function(type) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginBtn = document.getElementById('show-login-btn');
        const registerBtn = document.getElementById('show-register-btn');
    
        if (type === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            loginBtn.classList.add('active');
            registerBtn.classList.remove('active');
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            loginBtn.classList.remove('active');
            registerBtn.classList.add('active');
        }
    }
    
    window.resetPassword = async function() {
        const { value: email } = await Swal.fire({
            title: 'إعادة تعيين كلمة المرور',
            input: 'email',
            inputLabel: 'أدخل بريدك الإلكتروني',
            inputPlaceholder: 'example@example.com',
            confirmButtonText: 'إرسال رابط',
            cancelButtonText: 'إلغاء',
            showCancelButton: true,
            customClass: {
                popup: 'rounded-lg shadow-lg',
                confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg',
                cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg mr-2',
            },
            buttonsStyling: false,
            inputValidator: (value) => {
                if (!value) {
                    return 'الرجاء إدخال بريدك الإلكتروني!'
                }
            }
        });

        if (email) {
            try {
                // CORRECTED: Use auth object
                await auth.sendPasswordResetEmail(email);
                showAlert('تم الإرسال', 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'success');
            } catch (error) {
                console.error("Password reset error:", error);
                showAlert('خطأ', 'فشل إرسال البريد. تأكد من أن البريد الإلكتروني مسجل.', 'error');
            }
        }
    }
    
    function generateProductPlaceholder(name) {
        if (!name) return 'Rx';
        try {
            const initials = name.split(' ')
                .map(word => word[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            return initials || 'Rx';
        } catch (e) {
            return 'Rx';
        }
    }


    // =================================================================
    // --- Auth State Change (CORRECTED) ---
    // =================================================================

    // CORRECTED: Use auth.onAuthStateChanged
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            try {
                // CORRECTED: Use db.collection(...).doc(...)
                const userDocRef = db.collection("users").doc(user.uid);
                // CORRECTED: Use userDocRef.get()
                const userDoc = await userDocRef.get();

                if (userDoc.exists) {
                    userProfile = userDoc.data();
                    
                    if (userProfile.status === 'pending') {
                        showPage('pending');
                    } else if (userProfile.status === 'approved') {
                        showPage('app');
                        updateUIForUser(userProfile);
                        listenToProducts();
                        loadCartFromLocalStorage();
                    } else {
                        showToast('حسابك موقوف. برجاء مراجعة الإدارة.', 'error');
                        // CORRECTED: Use auth.signOut()
                        await auth.signOut();
                    }
                } else {
                    showToast('ملف المستخدم غير موجود. جارٍ إنشاء واحد.', 'warning');
                    const newUserProfile = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || document.getElementById('register-name').value || 'مستخدم جديد',
                        phone: user.phoneNumber || document.getElementById('register-phone').value || '',
                        level: 1,
                        status: 'pending',
                        // CORRECTED: Use firebase.firestore.FieldValue.serverTimestamp()
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        avatarUrl: ''
                    };
                    // CORRECTED: Use userDocRef.set(...)
                    await userDocRef.set(newUserProfile);
                    userProfile = newUserProfile;
                    showPage('pending');
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                showAlert('خطأ', 'فشل في تحميل بيانات المستخدم.', 'error');
                showPage('auth');
            }
        } else {
            currentUser = null;
            userProfile = null;
            showPage('auth');
            products = [];
            cart = {};
            renderProducts();
            updateCartUI();
        }
        preloader.style.display = 'none';
    });

    // --- Show Page (Original) ---
    function showPage(pageId) {
        [authPage, appPage, pendingPage, adminPanelPage].forEach(page => {
            page.style.display = 'none';
        });

        let pageToShow;
        switch (pageId) {
            case 'auth':
                pageToShow = authPage;
                showAuth('login');
                break;
            case 'app':
                pageToShow = appPage;
                break;
            case 'pending':
                pageToShow = pendingPage;
                break;
            case 'admin':
                pageToShow = appPage; 
                adminModal.style.display = 'flex';
                loadUsersForAdmin();
                break;
            default:
                pageToShow = authPage;
                showAuth('login');
        }
        pageToShow.style.display = 'block';
        if(pageId === 'auth') pageToShow.style.display = 'flex';
    }


    // --- Auth Form Listeners (CORRECTED) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            // CORRECTED: Use auth.signInWithEmailAndPassword
            await auth.signInWithEmailAndPassword(email, password);
            showToast('تم تسجيل الدخول بنجاح', 'success');
        } catch (error) {
            console.error("Login error:", error);
            showAlert('خطأ في الدخول', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'error');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;

        try {
            // CORRECTED: Use auth.createUserWithEmailAndPassword
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // CORRECTED: Use db.collection(...).doc(...)
            const userDocRef = db.collection("users").doc(user.uid);
            const newUserProfile = {
                uid: user.uid,
                email: email,
                name: name,
                phone: phone,
                level: 1,
                status: 'pending',
                // CORRECTED: Use firebase.firestore.FieldValue.serverTimestamp()
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                avatarUrl: ''
            };
            // CORRECTED: Use userDocRef.set(...)
            await userDocRef.set(newUserProfile);
            
            showAlert('تم التسجيل', 'حسابك قيد المراجعة، سيقوم الأدمن بتفعيله قريبًا.');
            
            const registerMessage = `
🔔 <b>تسجيل حساب جديد (قيد المراجعة)</b>
--------------------------------------
<b>الاسم:</b> ${name}
<b>البريد:</b> ${email}
<b>الهاتف:</b> ${phone}
--------------------------------------
برجاء مراجعة الحساب لتفعيله من لوحة الأدمن.
            `;
            sendTelegramNotification(registerMessage);

        } catch (error) {
            console.error("Register error:", error);
            if (error.code === 'auth/email-already-in-use') {
                showAlert('خطأ', 'هذا البريد الإلكتروني مسجل بالفعل.', 'error');
            } else {
                showAlert('خطأ', 'حدث خطأ أثناء إنشاء الحساب.', 'error');
            }
        }
    });

    // --- Logout (CORRECTED) ---
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // CORRECTED: Use auth.signOut()
        await auth.signOut();
        showToast('تم تسجيل الخروج', 'info');
    });
    pendingLogoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // CORRECTED: Use auth.signOut()
        await auth.signOut();
        showToast('تم تسجيل الخروج', 'info');
    });

    // --- UI Update (Original) ---
    function updateUIForUser(profile) {
        document.querySelectorAll('#user-name, #dropdown-user-name').forEach(el => el.textContent = profile.name);
        document.getElementById('dropdown-user-email').textContent = profile.email;
        
        const avatarUrl = profile.avatarUrl || `https://placehold.co/32x32/e0e7ff/4f46e5?text=${profile.name.charAt(0)}`;
        document.getElementById('user-avatar').src = avatarUrl;
        
        let levelText = 'المستوى 1 (مستخدم)';
        if (profile.level === 10) {
            levelText = 'المستوى 10 (أدمن)';
            adminPanelBtn.style.display = 'block';
            document.getElementById('fab-container').style.display = 'block';
        } else {
            adminPanelBtn.style.display = 'none';
            document.getElementById('fab-container').style.display = 'none';
        }
        document.getElementById('dropdown-user-level').textContent = levelText;
    }

    // --- Toggle Dropdowns (Original) ---
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
    });
    
    // --- Product Logic (CORRECTED) ---
    function listenToProducts() {
        // CORRECTED: Use db.collection(...).orderBy(...)
        const productsQuery = db.collection("products").orderBy("name");
        
        // CORRECTED: Use productsQuery.onSnapshot(...)
        productsQuery.onSnapshot((snapshot) => {
            products = [];
            snapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });
            syncStatus.textContent = `تم مزامنة ${products.length} صنف.`;
            setTimeout(() => { syncStatus.style.display = 'none'; }, 2000);
            renderProducts();
        }, (error) => {
            console.error("Error listening to products:", error);
            showAlert('خطأ', 'فشل تحميل قائمة الأصناف.', 'error');
            syncStatus.innerHTML = '<div class="text-center py-4 text-red-500">خطأ في المزامنة.</div>';
        });
    }

    function renderProducts(filteredProducts = products) {
        productsGrid.innerHTML = '';
        if (filteredProducts.length === 0 && products.length > 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }

        filteredProducts.forEach(product => {
            const card = createProductCard(product);
            productsGrid.appendChild(card);
        });
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col';
        
        const placeholderText = generateProductPlaceholder(product.name);
        const imageUrl = product.imageUrl;
        const imageContent = imageUrl ? 
            `<img src="${imageUrl}" alt="${product.name}" class="w-full h-40 object-cover">` :
            `<div class="w-full h-40 product-image-placeholder">${placeholderText}</div>`;
        
        const quantityBadge = `<span class="product-quantity-badge">${product.quantity}</span>`;

        const infoContent = `
            <div class="p-4 flex-grow">
                <h3 class="text-lg font-semibold text-gray-800 truncate" title="${product.name}">${product.name}</h3>
                <p class="text-sm text-gray-500 mb-2">${product.category || 'غير مصنف'}</p>
                <span class="text-xl font-bold text-indigo-600">${product.price} جم</span>
            </div>
        `;

        let actionContent = '';
        if (userProfile && userProfile.level === 10) {
            actionContent = `
                <div class="product-action-bar">
                    <button class="product-action-btn btn-delete delete-product-btn" data-id="${product.id}">
                        حذف
                    </button>
                    <button class="product-action-btn btn-edit edit-product-btn" data-id="${product.id}">
                        تعديل
                    </button>
                </div>
            `;
        } else {
            actionContent = `
                <div class="product-action-bar">
                    <button class="product-action-btn btn-add-cart add-to-cart-btn" data-id="${product.id}">
                        إضافة للسلة
                    </button>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="relative">
                ${imageContent}
                ${quantityBadge}
            </div>
            ${infoContent}
            ${actionContent}
        `;
        
        return card;
    }

    // --- Cart Logic (Redesigned) ---
    cartBtn.addEventListener('click', () => {
        cartModal.style.display = 'block';
        setTimeout(() => {
            cartOverlay.style.opacity = '1';
            document.getElementById('cart-content').style.transform = 'translateX(0)';
        }, 10);
    });

    function closeCart() {
        document.getElementById('cart-content').style.transform = 'translateX(100%)';
        cartOverlay.style.opacity = '0';
        setTimeout(() => {
            cartModal.style.display = 'none';
        }, 300);
    }
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    productsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn) {
            const id = btn.dataset.id;
            addToCart(id);
        }
    });

    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        if (product.quantity <= 0) {
            showToast('نفدت الكمية', 'error');
            return;
        }

        if (cart[productId]) {
            if (cart[productId].quantity < product.quantity) {
                cart[productId].quantity++;
            } else {
                showToast('لا يمكنك طلب كمية أكبر من المتاحة', 'warning');
                return;
            }
        } else {
            cart[productId] = {
                id: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: 1,
                maxQuantity: product.quantity
            };
        }
        showToast(`تم إضافة ${product.name} للسلة`, 'success');
        updateCartUI();
        saveCartToLocalStorage();
    }
    
    function updateCartUI() {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        let count = 0;
        const items = Object.values(cart);

        if (items.length === 0) {
            emptyCartMsg.style.display = 'block';
            checkoutBtn.disabled = true;
        } else {
            emptyCartMsg.style.display = 'none';
            checkoutBtn.disabled = false;
            
            items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                count += item.quantity;
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item-row';
                const isMax = item.quantity >= item.maxQuantity;

                itemEl.innerHTML = `
                    <img src="${item.imageUrl || `https://placehold.co/80x80/e0e7ff/4f46e5?text=${generateProductPlaceholder(item.name)}`}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.price} جم</p>
                        <div class="item-total">${itemTotal.toFixed(2)} جم</div>
                    </div>
                    <div class="flex flex-col items-end justify-between h-full">
                        <div class="cart-qty-control">
                            <button class="cart-qty-btn cart-quantity-btn" data-id="${item.id}" data-change="-1" title="إنقاص">-</button>
                            <span class="cart-qty-count">${item.quantity}</span>
                            <button class="cart-qty-btn cart-quantity-btn" data-id="${item.id}" data-change="1" title="زيادة" ${isMax ? 'disabled' : ''}>+</button>
                        </div>
                        <button class="cart-remove-btn-new cart-remove-btn mt-2" data-id="${item.id}" title="إزالة الصنف">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }
        cartTotalPrice.textContent = `${total.toFixed(2)} جم`;
        cartCount.textContent = count;
    }
    
    cartItemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.cart-quantity-btn')) {
            const btn = e.target.closest('.cart-quantity-btn');
            const id = btn.dataset.id;
            const change = parseInt(btn.dataset.change);
            updateCartQuantity(id, change);
        }
        if (e.target.closest('.cart-remove-btn')) {
            const btn = e.target.closest('.cart-remove-btn');
            const id = btn.dataset.id;
            removeFromCart(id);
        }
    });

    function updateCartQuantity(productId, change) {
        if (!cart[productId]) return;
        const product = products.find(p => p.id === productId);
        const maxQty = (product ? product.quantity : cart[productId].maxQuantity) || cart[productId].quantity;
        let newQuantity = cart[productId].quantity + change;

        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else if (newQuantity > maxQty) {
            cart[productId].quantity = maxQty;
            showToast('لا يمكنك طلب كمية أكبر من المتاحة', 'warning');
        } else {
            cart[productId].quantity = newQuantity;
        }
        updateCartUI();
        saveCartToLocalStorage();
    }

    function removeFromCart(productId) {
        delete cart[productId];
        showToast('تم إزالة الصنف من السلة', 'info');
        updateCartUI();
        saveCartToLocalStorage();
    }

    function saveCartToLocalStorage() {
        if (currentUser) {
            localStorage.setItem(`cart_${currentUser.uid}`, JSON.stringify(cart));
        }
    }

    function loadCartFromLocalStorage() {
        if (currentUser) {
            const savedCart = localStorage.getItem(`cart_${currentUser.uid}`);
            if (savedCart) {
                cart = JSON.parse(savedCart);
                let cartUpdated = false;
                Object.keys(cart).forEach(id => {
                    const product = products.find(p => p.id === id);
                    if(!product) {
                        delete cart[id];
                        cartUpdated = true;
                    } else if (cart[id].quantity > product.quantity) {
                        cart[id].quantity = product.quantity;
                        cart[id].maxQuantity = product.quantity;
                        cartUpdated = true;
                    } else {
                        cart[id].maxQuantity = product.quantity; 
                    }
                    if(cart[id] && cart[id].quantity <= 0) {
                        delete cart[id];
                        cartUpdated = true;
                    }
                });
                
                if(cartUpdated) {
                    showToast('تم تحديث سلتك بناءً على المخزون المتاح', 'warning');
                    saveCartToLocalStorage();
                }
            }
            updateCartUI();
        }
    }


    // --- Admin Logic (CORRECTED) ---
    adminPanelBtn.addEventListener('click', () => {
        showPage('admin');
    });
    
    closeAdminModalBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });

    async function loadUsersForAdmin() {
        if (userProfile && userProfile.level === 10) {
            usersListContainer.innerHTML = '<div class="text-center py-4"><div class="loader"></div><p class="mt-2 text-sm text-gray-500">جاري تحميل المستخدمين...</p></div>';
            try {
                // CORRECTED: Use db.collection(...).orderBy(...)
                const usersQuery = db.collection("users").orderBy("name");
                // CORRECTED: Use usersQuery.get()
                const querySnapshot = await usersQuery.get();
                
                usersListContainer.innerHTML = '';
                
                querySnapshot.forEach(doc => {
                    const user = doc.data();
                    const userEl = document.createElement('div');
                    userEl.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm';
                    userEl.innerHTML = `
                        <div class="flex items-center space-x-3">
                            <img src="${user.avatarUrl || `https://placehold.co/40x40/e0e7ff/4f46e5?text=${user.name.charAt(0)}`}" alt="${user.name}" class="w-10 h-10 rounded-full">
                            <div>
                                <p class="font-semibold text-gray-800">${user.name}</p>
                                <p class="text-sm text-gray-500">${user.email}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium ${user.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}">
                                ${user.status === 'approved' ? 'مُفعّل' : 'قيد المراجعة'}
                            </span>
                            ${user.status === 'pending' ? 
                                `<button class="approve-user-btn bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600" data-uid="${user.uid}">تفعيل</button>` :
                                `<button class="disable-user-btn bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600" data-uid="${user.uid}">تعطيل</button>`
                            }
                        </div>
                    `;
                    usersListContainer.appendChild(userEl);
                });
                
            } catch (error) {
                console.error("Error loading users:", error);
                usersListContainer.innerHTML = '<div class="text-center py-4 text-red-500">فشل تحميل المستخدمين.</div>';
            }
        }
    }
    
    usersListContainer.addEventListener('click', async (e) => {
        const uid = e.target.dataset.uid;
        if (!uid) return;
        
        // CORRECTED: Use db.collection(...).doc(...)
        const userDocRef = db.collection("users").doc(uid);

        try {
            if (e.target.classList.contains('approve-user-btn')) {
                // CORRECTED: Use userDocRef.update()
                await userDocRef.update({ status: 'approved' });
                showToast('تم تفعيل الحساب', 'success');
                loadUsersForAdmin();
            }
            if (e.target.classList.contains('disable-user-btn')) {
                // CORRECTED: Use userDocRef.update()
                await userDocRef.update({ status: 'pending' });
                showToast('تم تعطيل الحساب', 'info');
                loadUsersForAdmin();
            }
        } catch (error) {
            console.error("Error updating user status:", error);
            showAlert('خطأ', 'فشل تحديث حالة المستخدم.', 'error');
        }
    });

    // --- Profile Modal Logic (CORRECTED) ---
    profileSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userMenuDropdown.classList.add('hidden');
        document.getElementById('profile-name').value = userProfile.name;
        document.getElementById('profile-phone').value = userProfile.phone;
        document.getElementById('profile-email').value = userProfile.email;
        document.getElementById('profile-avatar-preview').src = userProfile.avatarUrl || `https://placehold.co/100x100/e0e7ff/4f46e5?text=${userProfile.name.charAt(0)}`;
        showProfileTab('profile');
        profileModal.style.display = 'flex';
    });
    
    closeProfileModalBtn.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });
    
    profileTabBtn.addEventListener('click', () => showProfileTab('profile'));
    passwordTabBtn.addEventListener('click', () => showProfileTab('password'));

    function showProfileTab(tab) {
        const profileContent = document.getElementById('profile-tab-content');
        const passwordContent = document.getElementById('password-tab-content');
        profileContent.classList.remove('animate-fade-in-content');
        passwordContent.classList.remove('animate-fade-in-content');

        if (tab === 'profile') {
            profileContent.style.display = 'block';
            passwordContent.style.display = 'none';
            profileTabBtn.classList.add('active-tab');
            passwordTabBtn.classList.remove('active-tab');
            void profileContent.offsetWidth; 
            profileContent.classList.add('animate-fade-in-content');
        } else {
            profileContent.style.display = 'none';
            passwordContent.style.display = 'block';
            profileTabBtn.classList.remove('active-tab');
            passwordTabBtn.classList.add('active-tab');
            void passwordContent.offsetWidth; 
            passwordContent.classList.add('animate-fade-in-content');
        }
    }

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profile-name').value;
        const newPhone = document.getElementById('profile-phone').value;
        
        try {
            // CORRECTED: Use db.collection(...).doc(...)
            const userDocRef = db.collection("users").doc(currentUser.uid);
            // CORRECTED: Use userDocRef.update()
            await userDocRef.update({
                name: newName,
                phone: newPhone,
            });
            
            userProfile.name = newName;
            userProfile.phone = newPhone;
            
            updateUIForUser(userProfile);
            profileModal.style.display = 'none';
            showToast('تم تحديث الملف الشخصي', 'success');

        } catch (error) {
            console.error("Profile update error:", error);
            showAlert('خطأ', 'فشل تحديث الملف الشخصي.', 'error');
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword.length < 6) {
            showAlert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'warning');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('خطأ', 'كلمتا المرور غير متطابقتين.', 'warning');
            return;
        }

        try {
            // CORRECTED: Use currentUser.updatePassword()
            await currentUser.updatePassword(newPassword);
            passwordForm.reset();
            profileModal.style.display = 'none';
            showAlert('تم بنجاح', 'تم تغيير كلمة المرور بنجاح.', 'success');
        } catch (error) {
            console.error("Password update error:", error);
            showAlert('خطأ', 'فشل تغيير كلمة المرور. قد تحتاج لتسجيل الخروج والدخول مرة أخرى.', 'error');
        }
    });


    // --- Global Click Listener (Original) ---
    document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userMenuDropdown.contains(e.target)) {
            userMenuDropdown.classList.add('hidden');
        }
    });

    // --- PWA Logic (Original) ---
    let deferredPrompt;
    const installPrompt = document.getElementById('pwa-install-prompt');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installPrompt.style.display = 'block';
    });
    
    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        installPrompt.style.display = 'none';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        installPrompt.style.display = 'none';
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => console.log('ServiceWorker registration successful'))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
    }

    // --- NEW: Checkout Logic (CORRECTED) ---
    checkoutBtn.addEventListener('click', async () => {
        if (Object.keys(cart).length === 0) {
            showAlert('سلتك فارغة!', 'الرجاء إضافة أصناف للسلة أولاً.', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "سيتم إرسال هذا الطلب كفاتورة إلى الأدمن.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، أرسل الطلب',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280',
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'جاري إرسال الطلب...',
            text: 'برجاء الانتظار.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            let orderText = `
🧾 <b>طلب جديد من ${userProfile.name}</b>
--------------------------------------
<b>البريد:</b> ${userProfile.email}
<b>الهاتف:</b> ${userProfile.phone}
            
<b>--- الأصناف المطلوبة ---</b>
`;
            let totalPrice = 0;
            const cartItems = Object.values(cart);
            // CORRECTED: Use db.batch()
            const batch = db.batch();
            
            for (const item of cartItems) {
                const itemTotal = item.price * item.quantity;
                totalPrice += itemTotal;
                
                orderText += `
- ${item.name}
  (الكمية: ${item.quantity} | السعر: ${item.price} جم | الإجمالي: ${itemTotal.toFixed(2)} جم)
`;
                // CORRECTED: Use db.collection(...).doc(...)
                const productRef = db.collection("products").doc(item.id);
                const productInStock = products.find(p => p.id === item.id);
                const currentStock = productInStock ? productInStock.quantity : item.maxQuantity;
                const newQuantity = currentStock - item.quantity;
                
                if (newQuantity < 0) {
                    throw new Error(`نفدت كمية المنتج: ${item.name}`);
                }
                
                batch.update(productRef, { quantity: newQuantity });
            }
            
            orderText += `
--------------------------------------
<b>💰 الإجمالي الكلي: ${totalPrice.toFixed(2)} جم</b>
            `;

            await sendTelegramNotification(orderText);
            
            // CORRECTED: Use batch.commit()
            await batch.commit();

            cart = {};
            saveCartToLocalStorage();
            updateCartUI();
            closeCart();
            
            showAlert('تم إرسال طلبك بنجاح!', 'سيتم التواصل معك قريباً.', 'success');

        } catch (error) {
            console.error("Checkout error:", error);
            if (error.message.includes('نفدت كمية')) {
                showAlert('خطأ في المخزون', error.message, 'error');
            } else {
                showAlert('خطأ فادح', 'حدث خطأ أثناء إرسال الطلب. لم يتم تحديث المخزون.', 'error');
            }
            listenToProducts();
        }
    });

}); // End of DOMContentLoaded