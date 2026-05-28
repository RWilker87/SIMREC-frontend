// src/components/PainelPrincipal.jsx (Redesign completo com ícones SVG)

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./PainelPrincipal.module.css";
import DetalheMunicipio from "./DetalheMunicipio.jsx";

// Componentes de Ícones SVG unificados
const IconSchool = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconBookOpen = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IconCheckCircle = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconClipboard = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const IconActivity = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconTarget = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconTrendingUp = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconTrendingDown = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const IconMunicipality = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <rect x="9" y="14" width="6" height="7" rx="1" />
    <line x1="3" y1="22" x2="21" y2="22" />
  </svg>
);

export default function PainelPrincipal({ session, isAdmin, minhaEscola }) {
  const [loading, setLoading] = useState(true);

  // Aba do painel admin
  const [abaAdmin, setAbaAdmin] = useState("visao");

  // Estados Admin
  const [totalEscolas, setTotalEscolas] = useState(0);
  const [totalResultados, setTotalResultados] = useState(0);
  const [escolasAtivas, setEscolasAtivas] = useState(0);
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0);
  const [resultadosPorDisciplina, setResultadosPorDisciplina] = useState([]);
  const [atividadesRecentes, setAtividadesRecentes] = useState([]);

  // Estados Gestor
  const [resultadosEscola, setResultadosEscola] = useState([]);
  const [mediaEscola, setMediaEscola] = useState(0);
  const [crescimentoEscola, setCrescimentoEscola] = useState(0);
  const [ultimasAvaliacoes, setUltimasAvaliacoes] = useState([]);
  const [disciplinasEscola, setDisciplinasEscola] = useState([]);

  // Função para formatar o tempo
  function formatTempo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMin = Math.round(diffMs / (1000 * 60));
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (diffMin < 1) return "Agora";
    if (diffMin < 60) return `Há ${diffMin}m`;
    if (diffHr < 24) return `Há ${diffHr}h`;
    return `Há ${diffDay}d`;
  }

  // Busca dados do ADMIN
  useEffect(() => {
    if (!isAdmin) return;

    async function fetchDadosAdmin() {
      setLoading(true);

      // Total de escolas
      const { count: countEscolas } = await supabase
        .from("escolas")
        .select("*", { count: "exact", head: true });
      if (countEscolas !== null) setTotalEscolas(countEscolas);

      // Todos os resultados
      const { data: todosResultados } = await supabase
        .from("resultados")
        .select("ano, valor_indice, escola_id, avaliacao, disciplina, created_at");

      if (todosResultados) {
        setTotalResultados(todosResultados.length);

        // Contar avaliações únicas
        const avaliacoesUnicas = new Set(todosResultados.map(r => r.avaliacao));
        setTotalAvaliacoes(avaliacoesUnicas.size);

        // Contar escolas com dados recentes (últimos 2 anos)
        const anoAtual = new Date().getFullYear();
        const escolasComDadosRecentes = new Set(
          todosResultados
            .filter(r => r.ano >= anoAtual - 1)
            .map(r => r.escola_id)
        );
        setEscolasAtivas(escolasComDadosRecentes.size);

        // Agrupar por disciplina
        const disciplinas = {};
        todosResultados.forEach(r => {
          if (!disciplinas[r.disciplina]) {
            disciplinas[r.disciplina] = 0;
          }
          disciplinas[r.disciplina]++;
        });

        const disciplinasArray = Object.entries(disciplinas)
          .map(([nome, count]) => ({ nome, count }))
          .sort((a, b) => b.count - a.count);
        setResultadosPorDisciplina(disciplinasArray);
      }

      // Atividades recentes
      const { data: resultadosRecentes } = await supabase
        .from("resultados")
        .select("created_at, avaliacao, disciplina, escola_id(nome_escola)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (resultadosRecentes) {
        setAtividadesRecentes(
          resultadosRecentes.map((r) => ({
            tipo: "Resultado",
            titulo: `${r.disciplina} - ${r.avaliacao}`,
            subtitulo: r.escola_id?.nome_escola || "N/A",
            data: r.created_at,
          }))
        );
      }

      setLoading(false);
    }

    fetchDadosAdmin();
  }, [isAdmin]);

  // Busca dados do GESTOR
  useEffect(() => {
    if (isAdmin || !minhaEscola) return;

    async function fetchDadosGestor() {
      setLoading(true);

      // Resultados da escola
      const { data: resultados } = await supabase
        .from("resultados")
        .select("*")
        .eq("escola_id", minhaEscola.id);

      if (resultados) {
        setResultadosEscola(resultados);

        const anoAtual = new Date().getFullYear();
        const anoAnterior = anoAtual - 1;

        const calcularMedia = (arr) => {
          if (arr.length === 0) return 0;
          return arr.reduce((acc, val) => acc + (val.valor_indice || 0), 0) / arr.length;
        };

        const resultadosAtual = resultados.filter((r) => r.ano === anoAtual);
        const resultadosAnterior = resultados.filter((r) => r.ano === anoAnterior);

        const mediaAtual = calcularMedia(resultadosAtual);
        const mediaAnterior = calcularMedia(resultadosAnterior);

        setMediaEscola(mediaAtual);

        if (mediaAnterior > 0) {
          setCrescimentoEscola(((mediaAtual - mediaAnterior) / mediaAnterior) * 100);
        }

        // Últimas 5 avaliações
        const ultimas = resultados
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setUltimasAvaliacoes(ultimas);

        // Agrupar por disciplina
        const disciplinas = {};
        resultados.forEach(r => {
          if (!disciplinas[r.disciplina]) {
            disciplinas[r.disciplina] = 0;
          }
          disciplinas[r.disciplina]++;
        });

        const disciplinasArray = Object.entries(disciplinas)
          .map(([nome, count]) => ({ nome, count }))
          .sort((a, b) => b.count - a.count);
        setDisciplinasEscola(disciplinasArray);
      }

      setLoading(false);
    }

    fetchDadosGestor();
  }, [isAdmin, minhaEscola]);

  // Renderização Admin
  if (isAdmin) {
    return (
      <div className={styles.container}>
        {/* CABEÇALHO COM ABAS */}
        <div className={styles.adminHeader}>
          <div className={styles.titleArea}>
            <h1>{abaAdmin === "visao" ? "Visão Geral do Município" : "Notas do Município"}</h1>
            <span className={styles.subtext}>
              {abaAdmin === "visao"
                ? "Acompanhamento em tempo real dos índices de aprendizagem escolar"
                : "Registre os índices educacionais do município"}
            </span>
          </div>
          <div className={styles.adminTabs}>
            <button
              className={abaAdmin === "visao" ? styles.adminTabAtivo : styles.adminTab}
              onClick={() => setAbaAdmin("visao")}
            >
              <IconActivity size={17} />
              Visão Geral
            </button>
            <button
              className={abaAdmin === "notas" ? styles.adminTabAtivo : styles.adminTab}
              onClick={() => setAbaAdmin("notas")}
            >
              <IconMunicipality size={17} />
              Notas do Município
            </button>
          </div>
        </div>

        {/* ============ ABA: VISÃO GERAL ============ */}
        {abaAdmin === "visao" && (
          <>
            {/* KPI Cards Admin */}
            <div className={styles.kpiContainer}>
              <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBubble}><IconSchool size={22} /></div>
                  <span className={styles.kpiBadge}>SIMREC</span>
                </div>
                <span className={styles.kpiValue}>{loading ? "..." : totalEscolas}</span>
                <span className={styles.kpiLabel}>Total de Escolas</span>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiSecondary}`}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBubble}><IconBookOpen size={22} /></div>
                  <span className={styles.kpiBadge}>Avaliações</span>
                </div>
                <span className={styles.kpiValue}>{loading ? "..." : totalResultados}</span>
                <span className={styles.kpiLabel}>Resultados Lançados</span>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBubble}><IconCheckCircle size={22} /></div>
                  <span className={styles.kpiBadge}>Frequência</span>
                </div>
                <span className={styles.kpiValue}>{loading ? "..." : escolasAtivas}</span>
                <span className={styles.kpiLabel}>Escolas Ativas</span>
              </div>

              <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
                <div className={styles.kpiHeaderRow}>
                  <div className={styles.kpiIconBubble}><IconClipboard size={22} /></div>
                  <span className={styles.kpiBadge}>Formatos</span>
                </div>
                <span className={styles.kpiValue}>{loading ? "..." : totalAvaliacoes}</span>
                <span className={styles.kpiLabel}>Tipos de Avaliação</span>
              </div>
            </div>

            {/* Conteúdo Admin */}
            <div className={styles.contentRow}>
              <div className={styles.contentCard}>
                <div className={styles.cardHeader}>
                  <IconBookOpen size={18} />
                  <h3>Resultados por Disciplina</h3>
                </div>
                {loading ? (
                  <div className={styles.cardLoading}><p>Carregando análises...</p></div>
                ) : resultadosPorDisciplina.length === 0 ? (
                  <p className={styles.emptyState}>Nenhum dado disponível</p>
                ) : (
                  <ul className={styles.disciplinasList}>
                    {resultadosPorDisciplina.map((disciplina) => (
                      <li key={disciplina.nome} className={styles.disciplinaItem}>
                        <div className={styles.disciplinaInfo}>
                          <strong>{disciplina.nome}</strong>
                          <span className={styles.disciplinaMeta}>
                            {disciplina.count} lançamento{disciplina.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className={styles.disciplinaBarra}>
                          <div
                            className={styles.disciplinaFill}
                            style={{ width: `${(disciplina.count / totalResultados) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.contentCard}>
                <div className={styles.cardHeader}>
                  <IconActivity size={18} />
                  <h3>Atividades Recentes</h3>
                </div>
                {loading ? (
                  <div className={styles.cardLoading}><p>Carregando atividades...</p></div>
                ) : (
                  <ul className={styles.listaAtividades}>
                    {atividadesRecentes.length === 0 ? (
                      <li className={styles.emptyState}>Nenhuma atividade registrada hoje.</li>
                    ) : (
                      atividadesRecentes.map((atividade, index) => (
                        <li key={index} className={styles.atividadeItem}>
                          <div className={styles.atividadeMarker} />
                          <div className={styles.atividadeContent}>
                            <strong>{atividade.titulo}</strong>
                            <span className={styles.subtitulo}>{atividade.subtitulo}</span>
                            <span className={styles.tempo}>{formatTempo(atividade.data)}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============ ABA: NOTAS DO MUNICÍPIO ============ */}
        {abaAdmin === "notas" && <DetalheMunicipio />}
      </div>
    );
  }

  // Renderização Gestor
  const IsCrescimentoPositivo = crescimentoEscola >= 0;

  return (
    <div className={styles.container}>
      <div className={styles.escolaHeader}>
        <div className={styles.escolaTitleGroup}>
          <h1>{minhaEscola?.nome_escola || "Minha Escola"}</h1>
          <span className={styles.escolaInep}>INEP: {minhaEscola?.codigo_inep || "N/A"}</span>
        </div>
        <span className={styles.headerTag}>Painel do Gestor</span>
      </div>

      {/* KPI Cards Gestor */}
      <div className={styles.kpiContainer}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiHeaderRow}>
            <div className={styles.kpiIconBubble}>
              <IconBookOpen size={22} />
            </div>
            <span className={styles.kpiBadge}>Banco</span>
          </div>
          <span className={styles.kpiValue}>{loading ? "..." : resultadosEscola.length}</span>
          <span className={styles.kpiLabel}>Resultados Cadastrados</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiHeaderRow}>
            <div className={styles.kpiIconBubble}>
              <IconTarget size={22} />
            </div>
            <span className={styles.kpiBadge}>Desempenho</span>
          </div>
          <span className={styles.kpiValue}>{loading ? "..." : mediaEscola.toFixed(1)}</span>
          <span className={styles.kpiLabel}>Média da Escola</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
          <div className={styles.kpiHeaderRow}>
            <div className={styles.kpiIconBubble}>
              <IconSchool size={22} />
            </div>
            <span className={styles.kpiBadge}>Grade</span>
          </div>
          <span className={styles.kpiValue}>{loading ? "..." : disciplinasEscola.length}</span>
          <span className={styles.kpiLabel}>Disciplinas Avaliadas</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiTrend}`}>
          <div className={styles.kpiHeaderRow}>
            <div className={styles.kpiIconBubble}>
              {IsCrescimentoPositivo ? <IconTrendingUp size={22} /> : <IconTrendingDown size={22} />}
            </div>
            <span className={`${styles.kpiTrendBadge} ${IsCrescimentoPositivo ? styles.kpiTrendBadgePositivo : styles.kpiTrendBadgeNegativo}`}>
              {IsCrescimentoPositivo ? "Evolução" : "Alerta"}
            </span>
          </div>
          <span className={styles.kpiValue}>
            {loading ? "..." : `${IsCrescimentoPositivo ? "+" : ""}${crescimentoEscola.toFixed(1)}%`}
          </span>
          <span className={IsCrescimentoPositivo ? styles.kpiLabelPositivo : styles.kpiLabelNegativo}>
            Crescimento Anual
          </span>
        </div>
      </div>

      {/* Conteúdo Gestor */}
      <div className={styles.contentRow}>
        {/* Distribuição por Disciplina */}
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <IconBookOpen size={18} />
            <h3>Disciplinas Avaliadas</h3>
          </div>
          {loading ? (
            <div className={styles.cardLoading}><p>Carregando dados da escola...</p></div>
          ) : disciplinasEscola.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma disciplina avaliada ainda.</p>
          ) : (
            <ul className={styles.disciplinasList}>
              {disciplinasEscola.map((disciplina) => (
                <li key={disciplina.nome} className={styles.disciplinaItem}>
                  <div className={styles.disciplinaInfo}>
                    <strong>{disciplina.nome}</strong>
                    <span className={styles.disciplinaMeta}>
                      {disciplina.count} lançamento{disciplina.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={styles.disciplinaBarra}>
                    <div
                      className={styles.disciplinaFill}
                      style={{ width: `${(disciplina.count / resultadosEscola.length) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Últimas Avaliações */}
        <div className={styles.contentCard}>
          <div className={styles.cardHeader}>
            <IconClipboard size={18} />
            <h3>Últimas Avaliações</h3>
          </div>
          {loading ? (
            <div className={styles.cardLoading}><p>Buscando avaliações...</p></div>
          ) : ultimasAvaliacoes.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma avaliação cadastrada ainda.</p>
          ) : (
            <ul className={styles.avaliacoesList}>
              {ultimasAvaliacoes.map((avaliacao) => (
                <li key={avaliacao.id} className={styles.avaliacaoItem}>
                  <div className={styles.avaliacaoInfo}>
                    <strong>{avaliacao.disciplina} - {avaliacao.avaliacao}</strong>
                    <span>Ano: {avaliacao.ano} | Série: {avaliacao.serie}</span>
                  </div>
                  <span className={styles.avaliacaoNota}>{avaliacao.valor_indice?.toFixed(1) || "N/A"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
