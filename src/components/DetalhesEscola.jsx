// src/components/DetalhesEscola.jsx

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./DetalhesEscola.module.css";
import painelStyles from "./PainelPrincipal.module.css";

// --- COMPONENTE DE GRÁFICO (CORRIGIDO) ---
// Este gráfico agora mostra as notas das avaliações (SAEB, Prova Brasil, etc.)
// para um grupo específico (ex: "2023 - 5º Ano - Português")
const GraficoDeBarras = ({ titulo, data }) => {
  if (!data || data.length === 0) return null; // não renderiza se não houver dados

  const maxValor = 10;
  // Cores para as barras
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE"];

  return (
    <div className={styles.graficoCard}>
      <h3>{titulo}</h3>
      <div className={styles.chartContainer}>
        <div className={styles.yAxis}>
          <span>10</span>
          <span>7.5</span>
          <span>5.0</span>
          <span>2.5</span>
          <span>0</span>
        </div>
        <div className={styles.chartContent}>
          {data.map((item, index) => (
            <div key={item.avaliacao} className={styles.barGroup}>
              <div className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${(item.valor_indice / maxValor) * 100}%`,
                    // Usa uma cor diferente para cada barra
                    backgroundColor: colors[index % colors.length],
                  }}
                  title={`${item.avaliacao}: ${item.valor_indice.toFixed(2)}`}
                />
              </div>
              <span className={styles.barLabel}>{item.avaliacao}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function DetalhesEscola({ escola, onVoltar }) {
  const [user, setUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_UID = "e55942f2-87c9-4811-9a0b-0841e8a39733";

  // --- AUTENTICAÇÃO ---
  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setCanEdit(data?.user?.id === ADMIN_UID);
    }
    getUser();
  }, []);

  // --- BUSCAR RESULTADOS ---
  async function fetchResultados() {
    setLoading(true);
    const { data, error } = await supabase
      .from("resultados")
      .select("*")
      .eq("escola_id", escola.id)
      .order("ano", { ascending: true }); // Ordena por ano

    if (error) {
      alert("Erro ao buscar resultados: " + error.message);
    } else {
      setResultados(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchResultados();
  }, [escola.id]);

  // --- FORMULÁRIO DE ADIÇÃO ---
  const [avaliacao, setAvaliacao] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [serie, setSerie] = useState("");
  const [valorIndice, setValorIndice] = useState("");
  const [disciplina, setDisciplina] = useState("");

  const handleAddResultado = async (e) => {
    e.preventDefault();
    if (!canEdit)
      return alert("Apenas o administrador pode adicionar resultados.");

    if (!avaliacao || !ano || !serie || !valorIndice || !disciplina) {
      alert("Preencha todos os campos antes de adicionar.");
      return;
    }

    setLoading(true); // Ativa o loading
    const { error } = await supabase.from("resultados").insert({
      escola_id: escola.id,
      avaliacao,
      ano: parseInt(ano),
      serie,
      valor_indice: parseFloat(valorIndice),
      disciplina,
    });

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Resultado salvo com sucesso!");
      fetchResultados(); // Re-busca os dados para atualizar gráficos e lista
      // Limpa o formulário
      setAvaliacao("");
      setSerie("");
      setValorIndice("");
      setDisciplina("");
    }
    setLoading(false); // Desativa o loading
  };

  // --- DELETAR RESULTADO ---
  const handleDeleteResultado = async (id) => {
    if (!canEdit) return alert("Apenas o administrador pode deletar.");

    setLoading(true); // Ativa o loading
    const { error } = await supabase.from("resultados").delete().eq("id", id);
    if (error) alert("Erro ao deletar: " + error.message);
    else fetchResultados(); // Re-busca os dados para atualizar gráficos e lista
    setLoading(false); // Desativa o loading
  };

  // --- AGRUPAR RESULTADOS POR ANO/SÉRIE/DISCIPLINA ---
  const grupos = {};
  resultados.forEach((r) => {
    // A chave de agrupamento
    const chave = `${r.ano} - ${r.serie} - ${r.disciplina}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(r);
  });

  // --- INTERFACE ---
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onVoltar} className={styles.voltarButton}>
          &larr; Voltar
        </button>
        <h1>{escola.nome_escola}</h1>
        <small>INEP: {escola.codigo_inep}</small>
      </div>

      {/* --- GRÁFICOS AGRUPADOS --- */}
      {/* Container para os gráficos */}
      <div className={styles.graficosContainer}>
        {loading ? (
          <p>Carregando gráficos...</p>
        ) : Object.keys(grupos).length > 0 ? (
          Object.entries(grupos).map(([chave, dados]) => (
            <GraficoDeBarras key={chave} titulo={chave} data={dados} />
          ))
        ) : (
          <p className={styles.noData}>
            Nenhum dado disponível para gerar gráficos.
          </p>
        )}
      </div>

      {/* --- FORMULÁRIO (ADMIN) E LISTA --- */}
      <div className={painelStyles.contentRow}>
        {canEdit && (
          <form onSubmit={handleAddResultado} className={styles.cardForm}>
            <h3>Adicionar Novo Resultado</h3>
            <input
              type="text"
              placeholder="Avaliação (ex: SAEB)"
              value={avaliacao}
              onChange={(e) => setAvaliacao(e.target.value)}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Disciplina (ex: Português)"
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              placeholder="Ano"
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Série (ex: 5º Ano)"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              className={styles.input}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Valor/Índice"
              value={valorIndice}
              onChange={(e) => setValorIndice(e.target.value)}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={loading}
              className={styles.addButton}
            >
              {loading ? "Salvando..." : "Adicionar"}
            </button>
          </form>
        )}

        {/* Lista de todos os resultados */}
        <div className={canEdit ? styles.cardList : styles.cardListFullWidth}>
          <h3>Todos os Resultados</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : resultados.length === 0 ? (
            <p>Nenhum resultado cadastrado.</p>
          ) : (
            <ul className={styles.list}>
              {resultados.map((r) => (
                <li key={r.id} className={styles.listItem}>
                  <div className={styles.resultadoInfo}>
                    <span>
                      <strong>
                        {r.disciplina} - {r.avaliacao}
                      </strong>
                      <small>
                        {r.ano} - {r.serie}
                      </small>
                    </span>
                    <span className={styles.indiceValor}>
                      {r.valor_indice ? r.valor_indice.toFixed(2) : "N/A"}
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteResultado(r.id)}
                      disabled={loading} // Desativa se estiver carregando
                    >
                      Deletar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
