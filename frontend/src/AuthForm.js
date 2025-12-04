import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthForm() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {}
          }
        });
        if (error) {
          setError(error.message);
        } else {
          setShowVerifyModal(true);
          setNotice("We sent a verification email. Please verify to complete sign up.");
        }
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your account email first.");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) {
        setError(error.message);
      } else {
        setNotice("Reset email sent. Check your inbox (and spam).");
      }
    } catch (e) {
      setError("Could not send reset email. Try again.");
      console.error(e);
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyAcknowledged = () => {
    setShowVerifyModal(false);
    setMode("login");
    setPassword("");
  };

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>{mode === "login" ? "Login" : "Create Account"}</h3>
      <p style={styles.helper}>
        {mode === "login"
          ? "Welcome back. Use your email and password to continue."
          : "Create your account to start building your roster."}
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          style={styles.input}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div style={styles.passwordRow}>
          <input
            style={styles.input}
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button
            type="button"
            style={styles.ghost}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {error && <div style={styles.errorText}>{error}</div>}
        {notice && <div style={styles.notice}>{notice}</div>}
        <button type="submit" style={styles.primary} disabled={loading}>
          {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
      <button style={styles.link} onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
      </button>
      <button style={styles.link} onClick={resetPassword} disabled={resetLoading}>
        {resetLoading ? "Sending reset..." : "Reset password"}
      </button>

      {showVerifyModal && (
        <div style={styles.modalBackdrop} onClick={() => setShowVerifyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>Verify your email</h4>
            <p style={{ marginTop: 4 }}>
              We just sent a verification link to <strong>{email}</strong>. Click the link to finish setting up your account.
            </p>
            <p style={{ marginTop: 4, fontSize: 13, color: "#9fb3d7" }}>
              Didn&apos;t get it? Check spam/promotions or try again in a minute.
            </p>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={styles.ghost} onClick={() => setShowVerifyModal(false)}>Close</button>
              <button style={styles.primary} onClick={handleVerifyAcknowledged}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#0f121a",
    border: "1px solid #2b3242",
    borderRadius: 12,
    padding: 18,
    width: 320,
    color: "#eaeaea",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)"
  },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #2b3242",
    background: "#0a0d14",
    color: "#f2f4f8"
  },
  primary: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg, #4f9bff, #6bc1ff)",
    color: "#0b0c10",
    fontWeight: 700,
    cursor: "pointer"
  },
  helper: {
    marginTop: 0,
    marginBottom: 12,
    color: "#9fb3d7",
    fontSize: 14,
    lineHeight: 1.4
  },
  link: {
    marginTop: 10,
    background: "transparent",
    border: "none",
    color: "#8ea2c8",
    cursor: "pointer",
    textDecoration: "underline"
  },
  passwordRow: {
    display: "flex",
    gap: 8,
    alignItems: "center"
  },
  ghost: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #2b3242",
    background: "#0a0d14",
    color: "#c9d5f5",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  errorText: {
    color: "#f66",
    fontSize: 13
  },
  notice: {
    color: "#8bd17c",
    fontSize: 13
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000
  },
  modal: {
    background: "#0f121a",
    border: "1px solid #2b3242",
    borderRadius: 12,
    padding: 18,
    width: 360,
    color: "#eaeaea",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)"
  }
};
