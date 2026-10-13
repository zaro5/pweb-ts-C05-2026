(() => {
  const LOGIN_URL = "https://dummyjson.com/auth/login";
  const FILTER_URL = "https://dummyjson.com/users/filter?key=role&value=";

  interface LoginResponse {
    id: number;
    username: string;
    firstName: string;
    accessToken: string;
    role?: string;
    message?: string;
  }

  const form = QS.$<HTMLFormElement>("login-form");
  const usernameInput = QS.$<HTMLInputElement>("username");
  const passwordInput = QS.$<HTMLInputElement>("password");
  const submitBtn = QS.$<HTMLButtonElement>("submit-btn");
  const errorBox = QS.$("login-error");

  function showError(message: string): void {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function setLoading(loading: boolean): void {
    submitBtn.disabled = loading;
    usernameInput.disabled = loading;
    passwordInput.disabled = loading;
    submitBtn.textContent = loading ? "Memproses..." : "Masuk";
  }

  // Respons login dummyjson tidak selalu memuat role, jadi role dicari lewat endpoint filter.
  async function resolveRole(user: LoginResponse): Promise<string> {
    if (user.role) return user.role;
    for (const role of ["admin", "moderator", "user"]) {
      const res = await fetch(`${FILTER_URL}${role}&limit=0`);
      if (!res.ok) continue;
      const data = (await res.json()) as { users: Array<{ id: number }> };
      if (data.users.some((u) => u.id === user.id)) return role;
    }
    return "user";
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
      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        showError(
          data.message === "Invalid credentials"
            ? "Username atau password salah."
            : data.message ?? "Login gagal. Coba lagi."
        );
        return;
      }

      const role = await resolveRole(data);
      QS.saveSession({ token: data.accessToken, role, firstName: data.firstName });
      window.location.replace(QS.homeFor(role));
    } catch {
      showError("Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  });
})();
