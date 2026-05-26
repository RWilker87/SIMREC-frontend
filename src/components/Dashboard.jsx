// src/components/Dashboard.jsx (Totalmente redesenhado com visual Premium)

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./Dashboard.module.css";
import DetalhesEscola from "./DetalhesEscola.jsx";
import logo from "../assets/logo.png";
import GerenciarEscolas from "./GerenciarEscolas.jsx";
import PainelPrincipal from "./PainelPrincipal.jsx";
import MetasEscolas from "./MetasEscolas.jsx";

// Ícones SVG minimalistas e elegantes
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const IconEscolas = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconMetas = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

// UID do Administrador
const ADMIN_USER_ID = "e55942f2-87c9-4811-9a0b-0841e8a39733";

export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(false);
  const [paginaAtiva, setPaginaAtiva] = useState("dashboard");

  // --- Lógica de Permissão ---
  const isAdmin = session.user.id === ADMIN_USER_ID;

  // --- State do Admin ---
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);

  // --- State do Gestor ---
  const [minhaEscola, setMinhaEscola] = useState(null);
  const [loadingEscola, setLoadingEscola] = useState(!isAdmin);

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

  // Busca a escola específica do GESTOR quando o componente carrega
  useEffect(() => {
    if (!isAdmin) {
      async function fetchMinhaEscola() {
        setLoadingEscola(true);
        const { data, error } = await supabase
          .from("escolas")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Erro ao buscar escola do gestor:", error.message);
        } else if (data) {
          setMinhaEscola(data);
        }
        setLoadingEscola(false);
      }
      fetchMinhaEscola();
    }
  }, [isAdmin, session.user.id]);

  // Saudação Dinâmica e Data
  const getGreeting = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getFormattedDate = () => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  };

  const emailUsuario = session.user.email;
  const avatarSigla = emailUsuario ? emailUsuario[0].toUpperCase() : "?";
  const nomePerfil = isAdmin ? "Administrador" : "Gestor Escolar";
  const saudacao = getGreeting();
  const dataHoje = getFormattedDate();

  // Importa as "páginas" dinamicamente
  const renderConteudoPagina = () => {
    if (paginaAtiva === "dashboard") {
      return (
        <PainelPrincipal
          session={session}
          isAdmin={isAdmin}
          minhaEscola={!isAdmin ? minhaEscola : null}
        />
      );
    }

    if (isAdmin && paginaAtiva === "metas") {
      return <MetasEscolas />;
    }

    if (isAdmin && paginaAtiva === "escolas") {
      return escolaSelecionada ? (
        <DetalhesEscola
          escola={escolaSelecionada}
          onVoltar={handleVoltarParaLista}
        />
      ) : (
        <GerenciarEscolas
          onSelecionarEscola={(escola) => setEscolaSelecionada(escola)}
        />
      );
    }

    if (!isAdmin && paginaAtiva === "minhaEscola") {
      if (loadingEscola) return <div className={styles.loadingScreen}><p>Carregando dados da escola...</p></div>;
      
      return minhaEscola ? (
        <DetalhesEscola
          escola={minhaEscola}
          onVoltar={() => setPaginaAtiva("dashboard")}
        />
      ) : (
        <div className={styles.errorScreen}>
          <h1>🏫 Escola Não Encontrada</h1>
          <p>
            Nenhuma escola está associada à sua conta. Por favor,
            contate o administrador do sistema para realizar a vinculação do gestor.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.layoutContainer}>
      {/* 1. Menu Lateral (Sidebar) */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <img src={logo} alt="SIMREC Logo" className={styles.logoImg} />
            <span className={styles.logoText}>SIMREC</span>
          </div>
          
          <nav className={styles.nav}>
            <button
              className={paginaAtiva === "dashboard" ? styles.navItemAtivo : styles.navItem}
              onClick={() => {
                setPaginaAtiva("dashboard");
                if (isAdmin) setEscolaSelecionada(null);
              }}
            >
              <IconDashboard /> 
              <span>Dashboard</span>
            </button>

            {isAdmin && (
              <button
                className={paginaAtiva === "escolas" ? styles.navItemAtivo : styles.navItem}
                onClick={() => {
                  setPaginaAtiva("escolas");
                  setEscolaSelecionada(null);
                }}
              >
                <IconEscolas />
                <span>Gerenciar Escolas</span>
              </button>
            )}

            {isAdmin && (
              <button
                className={paginaAtiva === "metas" ? styles.navItemAtivo : styles.navItem}
                onClick={() => setPaginaAtiva("metas")}
              >
                <IconMetas />
                <span>Metas das Escolas</span>
              </button>
            )}

            {!isAdmin && (
              <button
                className={paginaAtiva === "minhaEscola" ? styles.navItemAtivo : styles.navItem}
                onClick={() => {
                  setPaginaAtiva("minhaEscola");
                }}
              >
                <IconEscolas /> 
                <span>Minha Escola</span>
              </button>
            )}
          </nav>
        </div>

        {/* Perfil Sidebar Premium */}
        <div className={styles.perfilSidebar}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>{avatarSigla}</div>
            <span className={styles.statusIndicator} />
          </div>
          <div className={styles.perfilInfo}>
            <span className={styles.perfilNome}>{nomePerfil}</span>
            <span className={styles.perfilEmail}>{emailUsuario}</span>
          </div>
        </div>
      </aside>

      {/* 2. Conteúdo Principal */}
      <div className={styles.mainContent}>
        {/* Header Elegante e Leve */}
        <header className={styles.header}>
          <div className={styles.headerGreeting}>
            <h2>{saudacao}, {nomePerfil}! 👋</h2>
            <span className={styles.headerDate}>{dataHoje}</span>
          </div>
          
          <div className={styles.headerActions}>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {loading ? "Saindo..." : "Sair"}
            </button>
          </div>
        </header>

        {/* 3. Área de Trabalho */}
        <main className={styles.pagina}>
          {renderConteudoPagina()}
        </main>
      </div>
    </div>
  );
}
