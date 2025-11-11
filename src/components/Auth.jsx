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
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Carregando..." : "Entrar"}
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
