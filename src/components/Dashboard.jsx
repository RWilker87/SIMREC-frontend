// src/components/Dashboard.jsx (Totalmente substituído)

import { useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./Dashboard.module.css";

// Importa os ícones (simulados com texto por enquanto)
const IconDashboard = () => <span>📊</span>;
const IconEscolas = () => <span>🏫</span>;
const IconAdicionar = () => <span>➕</span>;

// Importa as "páginas"
import GerenciarEscolas from "./GerenciarEscolas.jsx";
import PainelPrincipal from "./PainelPrincipal.jsx"; // Vamos criar este

export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(false);
  // Controla qual página está visível
  const [paginaAtiva, setPaginaAtiva] = useState("dashboard");

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const emailUsuario = session.user.email;
  // Pega a primeira letra do email para o Avatar
  const avatarSigla = emailUsuario ? emailUsuario[0].toUpperCase() : "?";

  return (
    <div className={styles.layoutContainer}>
      {/* 1. Menu Lateral (Sidebar) */}
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.logo}>
            <span>S</span> SIMRE
          </div>
          <nav className={styles.nav}>
            <a
              href="#"
              className={
                paginaAtiva === "dashboard"
                  ? styles.navItemAtivo
                  : styles.navItem
              }
              onClick={() => setPaginaAtiva("dashboard")}
            >
              <IconDashboard /> Dashboard
            </a>
            {/* Este link agora carrega seu componente GerenciarEscolas */}
            <a
              href="#"
              className={
                paginaAtiva === "escolas" ? styles.navItemAtivo : styles.navItem
              }
              onClick={() => setPaginaAtiva("escolas")}
            >
              <IconEscolas /> Gerenciar Escolas
            </a>
          </nav>
        </div>
        <div className={styles.perfilSidebar}>
          <div className={styles.avatar}>{avatarSigla}</div>
          <div className={styles.perfilInfo}>
            <span className={styles.perfilNome}>Admin User</span>
            <span className={styles.perfilEmail}>{emailUsuario}</span>
          </div>
        </div>
      </aside>

      {/* 2. Conteúdo Principal */}
      <div className={styles.mainContent}>
        {/* 2a. Cabeçalho (Header) */}
        <header className={styles.header}>
          <div /> {/* Div vazia para empurrar o avatar para a direita */}
          <div className={styles.menuUsuario}>
            <div className={styles.avatar}>{avatarSigla}</div>
            <span>Admin User</span>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              disabled={loading}
            >
              Sair
            </button>
          </div>
        </header>

        {/* 2b. Área da Página */}
        <main className={styles.pagina}>
          {paginaAtiva === "dashboard" && <PainelPrincipal />}
          {paginaAtiva === "escolas" && <GerenciarEscolas />}
        </main>
      </div>
    </div>
  );
}
