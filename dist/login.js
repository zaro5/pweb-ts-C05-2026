"use strict";
(() => {
    const LOGIN_URL = "https://dummyjson.com/auth/login";
    const USER_URL = "https://dummyjson.com/users/";
    // Kalau sudah login, langsung arahkan sesuai role
    const existing = QS.getSession();
    if (existing) {
        window.location.replace(QS.homeFor(existing.role));
        return;
    }
    const form = QS.$("login-form");
    const usernameInput = QS.$("username");
    const passwordInput = QS.$("password");
    const button = QS.$("login-btn");
    const errorBox = QS.$("login-error");
    function normalizeRole(raw) {
        return raw === "admin" || raw === "moderator" ? raw : "user";
    }
    function showError(text) {
        errorBox.textContent = text;
        errorBox.hidden = false;
    }
    function setLoading(loading) {
        button.disabled = loading;
        usernameInput.disabled = loading;
        passwordInput.disabled = loading;
        button.textContent = loading ? "Memproses..." : "Masuk";
    }
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        errorBox.hidden = true;
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            showError("Username dan password wajib diisi.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(LOGIN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, expiresInMins: 60 }),
            });
            const data = (await res.json());
            if (!res.ok) {
                showError(data.message ?? "Username atau password salah.");
                return;
            }
            const token = data.accessToken ?? data.token;
            if (!token)
                throw new Error("Token tidak ditemukan pada respons server.");
            // Role dari respons server. Kalau respons login tidak memuat role,
            // ambil dari data user berdasarkan id.
            let rawRole = data.role;
            if (!rawRole) {
                const userRes = await fetch(USER_URL + data.id);
                if (!userRes.ok)
                    throw new Error("Gagal mengambil data role pengguna.");
                const user = (await userRes.json());
                rawRole = user.role;
            }
            const role = normalizeRole(rawRole);
            QS.saveSession({ token, role, firstName: data.firstName });
            window.location.replace(QS.homeFor(role));
        }
        catch (err) {
            console.error(err);
            showError("Gagal terhubung ke server. Periksa koneksi internet kamu lalu coba lagi.");
        }
        finally {
            setLoading(false);
        }
    });
})();
