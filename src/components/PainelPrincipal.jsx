// src/components/PainelPrincipal.jsx (Atualizado com dados reais)

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Precisamos do Supabase aqui
import styles from "./PainelPrincipal.module.css";

export default function PainelPrincipal() {
  // Estados para guardar nossos dados reais
  const [loading, setLoading] = useState(true);
  const [totalEscolas, setTotalEscolas] = useState(0);
  const [atividadesRecentes, setAtividadesRecentes] = useState([]);

  // Função para formatar o tempo (ex: "Há 2 horas")
  function formatTempo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHr < 24) return `Há ${diffHr} h`;
    return `Há ${diffDay} d`;
  }

  // Hook para buscar os dados quando o componente carregar
  useEffect(() => {
    async function fetchDados() {
      setLoading(true);

      // 1. Buscar a contagem total de escolas
      const { count, error: countError } = await supabase
        .from("escolas")
        .select("*", { count: "exact", head: true }); // 'head: true' é rápido, só pega a contagem

      if (!countError && count !== null) {
        setTotalEscolas(count);
      } else {
        console.error(
          "Erro ao buscar contagem de escolas:",
          countError?.message
        );
      }

      // 2. Buscar as 5 últimas escolas adicionadas
      const { data: escolasData, error: escolasError } = await supabase
        .from("escolas")
        .select("nome_escola, created_at") // Pega só o nome e a data de criação
        .order("created_at", { ascending: false }) // Ordena pela mais recente
        .limit(5); // Limita a 5 resultados

      if (!escolasError) {
        setAtividadesRecentes(escolasData || []);
      } else {
        console.error(
          "Erro ao buscar atividades recentes:",
          escolasError.message
        );
      }

      setLoading(false);
    }

    fetchDados();
  }, []); // O [] vazio faz rodar só uma vez

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Cards de KPI (AGORA COM DADOS REAIS) */}
      <div className={styles.kpiContainer}>
        {/* Card 1: Total de Escolas */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>
            {loading ? "..." : totalEscolas}
          </span>
          <span className={styles.kpiLabel}>Total de Escolas Cadastradas</span>
        </div>
        {/* Você pode adicionar mais cards reais aqui no futuro */}
      </div>

      {/* Conteúdo Principal (AGORA COM DADOS REAIS) */}
      <div className={styles.contentRow}>
        {/* Atividades Recentes */}
        <div className={styles.contentCard}>
          <h3>Escolas Recém-Adicionadas</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <ul className={styles.listaAtividades}>
              {atividadesRecentes.length === 0 ? (
                <li>
                  <strong>Nenhuma escola cadastrada</strong>
                  <span>
                    Cadastre uma escola na página "Gerenciar Escolas".
                  </span>
                </li>
              ) : (
                atividadesRecentes.map((escola) => (
                  <li key={escola.created_at}>
                    <strong>Nova escola cadastrada</strong>
                    <span>{escola.nome_escola}</span>
                    <span className={styles.tempo}>
                      {formatTempo(escola.created_at)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Espaço reservado para o futuro */}
        <div className={styles.contentCard}>
          <h3>Estatísticas</h3>
          <p>
            Mais gráficos e estatísticas sobre as escolas cadastradas aparecerão
            aqui em breve.
          </p>
        </div>
      </div>
    </div>
  );
}
