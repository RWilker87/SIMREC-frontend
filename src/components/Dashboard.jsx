// src/components/Dashboard.jsx (Totalmente substituído)

import { useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./Dashboard.module.css";
import DetalhesEscola from "./DetalhesEscola.jsx";

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
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);

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

  const handleVoltarParaLista = () => {
    setEscolaSelecionada(null);
  };

  const emailUsuario = session.user.email;
  // Pega a pri meira letra do email para o Avatar
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
              onClick={() => {
                setPaginaAtiva("dashboard");
                setEscolaSelecionada(null); // Limpa a seleção ao trocar de aba
              }}
            >
              <IconDashboard /> Dashboard
            </a>
            <a
              href="#"
              className={
                paginaAtiva === "escolas" ? styles.navItemAtivo : styles.navItem
              }
              onClick={() => {
                setPaginaAtiva("escolas");
                setEscolaSelecionada(null); // Limpa a seleção ao trocar de aba
              }}
            >
              <IconEscolas /> Gerenciar Escolas
            </a>
          </nav>
        </div>
        {/* ... (perfil sidebar continua igual) */}
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
        {/* ... (header continua igual) */}
        <header className={styles.header}>
          <div />
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

        {/* 3. LÓGICA DE RENDERIZAÇÃO ATUALIZADA */}
        <main className={styles.pagina}>
          {paginaAtiva === "dashboard" && <PainelPrincipal />}

          {/* Se a página ativa for "escolas" */}
          {paginaAtiva === "escolas" && (
            <>
              {/* Mostra DETALHES se uma escola estiver selecionada */}
              {escolaSelecionada ? (
                <DetalhesEscola
                  escola={escolaSelecionada}
                  onVoltar={handleVoltarParaLista}
                />
              ) : (
                /* Mostra a LISTA se nenhuma escola estiver selecionada */
                <GerenciarEscolas
                  onSelecionarEscola={(escola) => setEscolaSelecionada(escola)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
