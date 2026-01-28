// src/components/Dashboard.jsx (Totalmente atualizado com permissões)

import { useState, useEffect } from "react"; // Importa o useEffect
import { supabase } from "../supabaseClient";
import styles from "./Dashboard.module.css";
import DetalhesEscola from "./DetalhesEscola.jsx";
import logo from "../assets/logo.png";
import logoSecretaria from "../assets/seducLogo.png";

// Importa os ícones
const IconDashboard = () => <span>📊</span>;
const IconEscolas = () => <span>🏫</span>;

// Importa as "páginas"
import GerenciarEscolas from "./GerenciarEscolas.jsx";
import PainelPrincipal from "./PainelPrincipal.jsx";

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
  const [loadingEscola, setLoadingEscola] = useState(!isAdmin); // Começa carregando se NÃO for admin

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

  // Função para o Admin voltar da tela de Detalhes para a Lista
  const handleVoltarParaLista = () => {
    setEscolaSelecionada(null);
  };

  // Busca a escola específica do GESTOR quando o componente carrega
  useEffect(() => {
    // Roda apenas se o usuário NÃO for admin
    if (!isAdmin) {
      async function fetchMinhaEscola() {
        setLoadingEscola(true);
        const { data, error } = await supabase
          .from("escolas")
          .select("*") // Pega todos os dados da escola
          .eq("user_id", session.user.id) // Busca pela coluna que liga o usuário à escola
          .single(); // Espera apenas um resultado

        if (error) {
          console.error("Erro ao buscar escola do gestor:", error.message);
        } else if (data) {
          setMinhaEscola(data);
        }
        setLoadingEscola(false);
      }
      fetchMinhaEscola();
    }
  }, [isAdmin, session.user.id]); // Dependências do hook

  const emailUsuario = session.user.email;
  const avatarSigla = emailUsuario ? emailUsuario[0].toUpperCase() : "?";
  const nomePerfil = isAdmin ? "Administrador" : "Gestor Escolar";

  return (
    <div className={styles.layoutContainer}>
      {/* 1. Menu Lateral (Sidebar) */}
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.logo}>
            <img src={logo} alt="SIMREC Logo" className={styles.logoImg} />
            <span style={{ fontSize: '0.9em' }}>SIMREC</span>
          </div>
          <nav className={styles.nav}>
            {/* Link comum para o Dashboard */}
            <a
              href="#"
              className={
                paginaAtiva === "dashboard"
                  ? styles.navItemAtivo
                  : styles.navItem
              }
              onClick={() => {
                setPaginaAtiva("dashboard");
                if (isAdmin) setEscolaSelecionada(null);
              }}
            >
              <IconDashboard /> Dashboard
            </a>

            {/* Link exclusivo do ADMIN */}
            {isAdmin && (
              <a
                href="#"
                className={
                  paginaAtiva === "escolas"
                    ? styles.navItemAtivo
                    : styles.navItem
                }
                onClick={() => {
                  setPaginaAtiva("escolas");
                  setEscolaSelecionada(null); // Limpa a seleção
                }}
              >
                <IconEscolas /> Gerenciar Escolas
              </a>
            )}

            {/* Link exclusivo do GESTOR */}
            {!isAdmin && (
              <a
                href="#"
                className={
                  paginaAtiva === "minhaEscola"
                    ? styles.navItemAtivo
                    : styles.navItem
                }
                onClick={() => {
                  setPaginaAtiva("minhaEscola");
                }}
              >
                <IconEscolas /> Minha Escola
              </a>
            )}
          </nav>
        </div>

        {/* Perfil Sidebar Atualizado */}
        <div className={styles.perfilSidebar}>
          <div className={styles.avatar}>{avatarSigla}</div>
          <div className={styles.perfilInfo}>
            <span className={styles.perfilNome}>{nomePerfil}</span>
            <span className={styles.perfilEmail}>{emailUsuario}</span>
          </div>
        </div>
      </aside>

      {/* 2. Conteúdo Principal */}
      <div className={styles.mainContent}>
        {/* Header Atualizado */}
        <header className={styles.header}>
          <div />
          <div className={styles.menuUsuario}>
            <div className={styles.avatar}>{avatarSigla}</div>
            <span>{nomePerfil}</span>
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
          {/* Rota comum para todos */}
          {paginaAtiva === "dashboard" && <PainelPrincipal />}

          {/* Rotas exclusivas do ADMIN */}
          {isAdmin && paginaAtiva === "escolas" && (
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

          {/* Rota exclusiva do GESTOR */}
          {!isAdmin && paginaAtiva === "minhaEscola" && (
            <>
              {loadingEscola && <p>Carregando dados da escola...</p>}

              {/* Mostra os detalhes da escola do gestor */}
              {minhaEscola && (
                <DetalhesEscola
                  escola={minhaEscola}
                  // O botão "Voltar" levará o gestor de volta ao Dashboard
                  onVoltar={() => setPaginaAtiva("dashboard")}
                />
              )}

              {/* Caso de erro (usuário sem escola) */}
              {!loadingEscola && !minhaEscola && (
                <div>
                  <h1>Erro</h1>
                  <p>
                    Nenhuma escola está associada à sua conta. Por favor,
                    contate o administrador do sistema.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
