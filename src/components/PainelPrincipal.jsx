// src/components/PainelPrincipal.jsx (Redesign completo com personalização)

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./PainelPrincipal.module.css";

export default function PainelPrincipal({ session, isAdmin, minhaEscola }) {
  const [loading, setLoading] = useState(true);

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
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    return `${diffDay}d`;
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
      <div>
        <h1>📊 Dashboard Administrativo</h1>

        {/* KPI Cards Admin */}
        <div className={styles.kpiContainer}>
          <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
            <div className={styles.kpiIcon}>🏫</div>
            <span className={styles.kpiValue}>{loading ? "..." : totalEscolas}</span>
            <span className={styles.kpiLabel}>Total de Escolas</span>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiSecondary}`}>
            <div className={styles.kpiIcon}>📚</div>
            <span className={styles.kpiValue}>{loading ? "..." : totalResultados}</span>
            <span className={styles.kpiLabel}>Resultados Lançados</span>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
            <div className={styles.kpiIcon}>✅</div>
            <span className={styles.kpiValue}>{loading ? "..." : escolasAtivas}</span>
            <span className={styles.kpiLabel}>Escolas Ativas</span>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
            <div className={styles.kpiIcon}>📋</div>
            <span className={styles.kpiValue}>{loading ? "..." : totalAvaliacoes}</span>
            <span className={styles.kpiLabel}>Tipos de Avaliação</span>
          </div>
        </div>

        {/* Conteúdo Admin */}
        <div className={styles.contentRow}>
          {/* Resultados por Disciplina */}
          <div className={styles.contentCard}>
            <h3>📊 Resultados por Disciplina</h3>
            {loading ? (
              <p>Carregando...</p>
            ) : resultadosPorDisciplina.length === 0 ? (
              <p className={styles.emptyState}>Nenhum dado disponível</p>
            ) : (
              <ul className={styles.disciplinasList}>
                {resultadosPorDisciplina.map((disciplina) => (
                  <li key={disciplina.nome} className={styles.disciplinaItem}>
                    <div className={styles.disciplinaInfo}>
                      <strong>{disciplina.nome}</strong>
                      <span className={styles.disciplinaMeta}>{disciplina.count} resultado{disciplina.count !== 1 ? 's' : ''}</span>
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

          {/* Atividades Recentes */}
          <div className={styles.contentCard}>
            <h3>⏱️ Atividades Recentes</h3>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <ul className={styles.listaAtividades}>
                {atividadesRecentes.length === 0 ? (
                  <li>
                    <strong>Nenhuma atividade recente</strong>
                  </li>
                ) : (
                  atividadesRecentes.map((atividade, index) => (
                    <li key={index}>
                      <strong>{atividade.titulo}</strong>
                      <span className={styles.subtitulo}>{atividade.subtitulo}</span>
                      <span className={styles.tempo}>{formatTempo(atividade.data)}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Renderização Gestor
  return (
    <div>
      <div className={styles.escolaHeader}>
        <h1>🏫 {minhaEscola?.nome_escola || "Minha Escola"}</h1>
        <span className={styles.escolaInep}>INEP: {minhaEscola?.codigo_inep || "N/A"}</span>
      </div>

      {/* KPI Cards Gestor */}
      <div className={styles.kpiContainer}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiIcon}>📚</div>
          <span className={styles.kpiValue}>{loading ? "..." : resultadosEscola.length}</span>
          <span className={styles.kpiLabel}>Resultados Cadastrados</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
          <div className={styles.kpiIcon}>🎯</div>
          <span className={styles.kpiValue}>{loading ? "..." : mediaEscola.toFixed(1)}</span>
          <span className={styles.kpiLabel}>Média da Escola</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiInfo}`}>
          <div className={styles.kpiIcon}>📊</div>
          <span className={styles.kpiValue}>{loading ? "..." : disciplinasEscola.length}</span>
          <span className={styles.kpiLabel}>Disciplinas Avaliadas</span>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiTrend}`}>
          <div className={styles.kpiIcon}>{crescimentoEscola >= 0 ? "📈" : "📉"}</div>
          <span className={styles.kpiValue}>
            {loading ? "..." : `${crescimentoEscola >= 0 ? "+" : ""}${crescimentoEscola.toFixed(1)}%`}
          </span>
          <span className={crescimentoEscola >= 0 ? styles.kpiLabelPositivo : styles.kpiLabelNegativo}>
            Crescimento Anual
          </span>
        </div>
      </div>

      {/* Conteúdo Gestor */}
      <div className={styles.contentRow}>
        {/* Distribuição por Disciplina */}
        <div className={styles.contentCard}>
          <h3>📚 Disciplinas Avaliadas</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : disciplinasEscola.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma disciplina avaliada ainda.</p>
          ) : (
            <ul className={styles.disciplinasList}>
              {disciplinasEscola.map((disciplina) => (
                <li key={disciplina.nome} className={styles.disciplinaItem}>
                  <div className={styles.disciplinaInfo}>
                    <strong>{disciplina.nome}</strong>
                    <span className={styles.disciplinaMeta}>{disciplina.count} resultado{disciplina.count !== 1 ? 's' : ''}</span>
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
          <h3>📝 Últimas Avaliações</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : ultimasAvaliacoes.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma avaliação cadastrada ainda.</p>
          ) : (
            <ul className={styles.avaliacoesList}>
              {ultimasAvaliacoes.map((avaliacao) => (
                <li key={avaliacao.id} className={styles.avaliacaoItem}>
                  <div className={styles.avaliacaoInfo}>
                    <strong>{avaliacao.disciplina} - {avaliacao.avaliacao}</strong>
                    <span>{avaliacao.ano} - {avaliacao.serie}</span>
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
