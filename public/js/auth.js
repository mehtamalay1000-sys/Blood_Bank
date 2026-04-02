// ══════════════════════════════════════════
// Auth Page Logic (login.html)
// ══════════════════════════════════════════

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginTabBtn.classList.remove('active');
        registerTabBtn.classList.add('active');
    }

    // Clear errors
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
    document.getElementById('registerSuccess').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        errorEl.textContent = 'Please enter both username and password';
        errorEl.style.display = 'block';
        return;
    }

    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Role-based redirect
            if (data.user && data.user.role === 'user') {
                window.location.href = '/user';
            } else {
                window.location.href = '/';
            }
        } else {
            errorEl.textContent = data.error || 'Login failed';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');
    const btn = document.getElementById('registerBtn');

    const full_name = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!full_name || !username || !password) {
        errorEl.textContent = 'Please fill in all required fields';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.style.display = 'block';
        return;
    }

    btn.textContent = 'Creating account...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, username, password, role })
        });

        const data = await res.json();

        if (res.ok) {
            successEl.textContent = 'Account created successfully! You can now sign in.';
            successEl.style.display = 'block';
            document.getElementById('registerForm').reset();
            setTimeout(() => switchTab('login'), 2000);
        } else {
            errorEl.textContent = data.error || 'Registration failed';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

(async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data.user && data.user.role === 'user') {
                window.location.href = '/user';
            } else {
                window.location.href = '/';
            }
        }
    } catch (e) {
        // Not logged in, stay on login page
    }
})();
