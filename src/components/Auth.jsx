import { useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./Auth.module.css";

import logo from "../assets/logo.png"; // Logo principal do projeto
import logoSecretaria from "../assets/seducLogo.png"; // Logo da SEDUC

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["auth-container"]}>
      <div className={styles.card}>
        {/* Logo principal no topo */}
        <img src={logo} alt="SIMREC Logo" className={styles.logo} />

        <p className={styles.subtitle}>
          Sistema Municipal de Resultados Educacionais de Capoeiras
        </p>

        {/* Formulário de login */}
        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              E-mail
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Senha
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? (
              <>
                <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" fill="currentColor"/></svg>
                Carregando...
              </>
            ) : (
              <>
                Entrar
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </>
            )}
          </button>
        </form>

        {/* Logo da Secretaria embaixo do botão */}
        <img
          src={logoSecretaria}
          alt="Secretaria de Educação de Capoeiras"
          className={styles.logoSecretaria}
        />
      </div>

      <footer className={styles.footer}>
        <p>© 2025 SIMREC. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
