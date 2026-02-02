// src/components/DetalhesEscola.jsx

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./DetalhesEscola.module.css";
import painelStyles from "./PainelPrincipal.module.css";

// ==========================================================
// COMPONENTE DE GRÁFICO — BARRAS + LINHA (MIX)
// ==========================================================
const GraficoDeBarras = ({ titulo, data }) => {
  if (!data || data.length === 0) return null;

  // --- dados brutos ---
  const rawPontos = data.map((d) => ({
    ano: d.ano,
    rawValor: Number(d.valor_indice ?? 0),
    avaliacao: d.avaliacao,
    serie: d.serie,
    disciplina: d.disciplina,
  }));

  function formatarTitulo(titulo) {
    if (!titulo) return "";
    let novo = titulo.trim();
    novo = novo.replace(/[-–—]+/g, " - ");
    novo = novo.replace(/\s+/g, " ");
    novo = novo.toUpperCase();
    novo = novo.replace(/ - /g, " – ");
    novo = novo.replace(/(\d+)\s*o\b/gi, "$1º");
    return novo;
  }

  const primeira = rawPontos[0] || {};
  const serie = (primeira.serie || "").toString().toLowerCase();
  const avaliacao = (primeira.avaliacao || "").toString().toLowerCase();
  const tituloLower = titulo.toLowerCase();

  // Verifica tipos de avaliação
  const isIdeb =
    tituloLower.includes("ideb") ||
    tituloLower.includes("idepe") ||
    avaliacao.includes("ideb") ||
    avaliacao.includes("idepe");

  // NOVO: Verifica se é Fluência
  const isFluencia =
    tituloLower.includes("fluencia") ||
    tituloLower.includes("fluência") ||
    avaliacao.includes("fluencia") ||
    avaliacao.includes("fluência");

  // Define a escala máxima
  let maxValor = 10;

  if (isFluencia) {
    maxValor = 100; // Escala de 0 a 100 para Fluência
  } else if (!isIdeb) {
    if (serie.includes("2")) maxValor = 1000;
    else if (serie.includes("5") || serie.includes("9")) maxValor = 500;
    else maxValor = 10;
  } else {
    maxValor = 10; // Padrão IDEB
  }

  // Normalização para IDEB (apenas se não for fluência)
  let divisor = 1;
  if (isIdeb && !isFluencia) {
    const rawMax = Math.max(
      ...rawPontos.map((p) => Math.abs(p.rawValor || 0)),
      0
    );
    while (rawMax / divisor > 10) {
      divisor *= 10;
      if (divisor > 1e9) break;
    }
  }

  const pontos = rawPontos.map((p) => {
    let v = p.rawValor;
    if (isIdeb && divisor > 1) v = v / divisor;

    // Garante que não ultrapasse o máximo visualmente
    v = Math.max(0, Math.min(v, maxValor));

    return { ...p, valor: v };
  });

  // Marcadores do Eixo Y
  const gerarMarcadores = () => {
    if (isFluencia) return [100, 80, 60, 40, 20, 0]; // Marcadores de porcentagem
    if (maxValor === 10) return [10, 8, 6, 4, 2, 0];
    if (maxValor === 500) return [500, 400, 300, 200, 100, 0];
    return [1000, 800, 600, 400, 200, 0];
  };
  const marcadores = gerarMarcadores();

  // Cores institucionais SUAVIZADAS para gráficos
  const colors = ["#E57373", "#FFB74D", "#FFF176", "#81C784", "#64B5F6"];

  // --- CORREÇÃO DO ALINHAMENTO SVG ---
  const svgPoints = useMemo(() => {
    const n = pontos.length;
    if (n === 0) return [];
    return pontos.map((p, i) => {
      const x = ((i + 0.5) / n) * 100;
      const y = 100 - (Math.min(p.valor, maxValor) / maxValor) * 100;
      return { x, y, valor: p.valor, ano: p.ano, rawValor: p.rawValor };
    });
  }, [pontos, maxValor]);

  const polylineStr =
    svgPoints.length > 1
      ? svgPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")
      : "";

  return (
    <div className={styles.graficoCard}>
      <h3>{formatarTitulo(titulo)}</h3>

      <div className={styles.chartWrapper}>
        {/* Eixo Y */}
        <div className={styles.yAxis}>
          {marcadores.map((m) => (
            <div key={m} className={styles.yLabel}>
              {/* Se for fluência, pode adicionar % no eixo se quiser, 
                  mas manter limpo (apenas números) costuma ser melhor. 
                  Vamos manter números. */}
              {m}
            </div>
          ))}
        </div>

        {/* Área do Gráfico */}
        <div className={styles.chartArea}>
          {/* Camada SVG (Linhas e Pontos) */}
          <svg
            className={styles.svgLayer}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Linhas de Grade */}
            {marcadores.map((m) => {
              const y = 100 - (m / maxValor) * 100;
              return (
                <line
                  key={`grid-${m}`}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  className={styles.gridLine}
                />
              );
            })}

            {/* Linha de tendência */}
            {polylineStr && (
              <polyline points={polylineStr} className={styles.trendLine} />
            )}

            {/* Pontos na linha */}
            {svgPoints.map((pt, i) => (
              <circle
                key={`p-${i}`}
                cx={pt.x}
                cy={pt.y}
                r={1.5}
                className={styles.trendPoint}
              />
            ))}
          </svg>

          {/* Camada de Barras (HTML) */}
          <div className={styles.barsLayer}>
            {pontos.map((p, index) => {
              const heightPercent = Math.max(
                0,
                Math.min(100, (p.valor / maxValor) * 100)
              );

              // Lógica de texto do Tooltip
              let valorTexto;
              if (isFluencia) {
                // Formatação de Porcentagem (ex: 72%)
                valorTexto = `${Math.round(p.valor)}%`;
              } else {
                const mostraOriginal =
                  isIdeb && divisor > 1 && p.rawValor !== undefined;
                valorTexto = mostraOriginal ? p.rawValor : p.valor.toFixed(2);
              }

              return (
                <div key={p.ano} className={styles.barColumn}>
                  {/* Tooltip simples ao passar o mouse */}
                  <div
                    className={styles.barFill}
                    style={{
                      height: `${heightPercent}%`,
                      background: `linear-gradient(180deg, ${colors[index % colors.length]
                        } 0%, ${colors[index % colors.length]}aa 100%)`,
                    }}
                  >
                    <span className={styles.barTooltip}>{valorTexto}</span>
                  </div>
                  <span className={styles.barLabel}>{p.ano}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================
export default function DetalhesEscola({ escola, onVoltar }) {
  const [user, setUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_UID = "e55942f2-87c9-4811-9a0b-0841e8a39733";

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setCanEdit(data?.user?.id === ADMIN_UID);
    }
    getUser();
  }, []);

  async function fetchResultados() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resultados")
        .select("*")
        .eq("escola_id", escola.id)
        .order("ano", { ascending: true });

      if (error) throw error;
      setResultados(data || []);
    } catch (err) {
      alert("Erro ao buscar resultados: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (escola?.id) fetchResultados();
  }, [escola?.id]);

  const [avaliacao, setAvaliacao] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [serie, setSerie] = useState("");
  const [valorIndice, setValorIndice] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [selectedGrafico, setSelectedGrafico] = useState(0);

  const handleAddResultado = async (e) => {
    e.preventDefault();
    if (!canEdit)
      return alert("Apenas o administrador pode adicionar resultados.");
    if (!avaliacao || !ano || !serie || !valorIndice || !disciplina) {
      alert("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("resultados").insert({
        escola_id: escola.id,
        avaliacao,
        ano: parseInt(ano, 10),
        serie,
        valor_indice: parseFloat(valorIndice),
        disciplina,
      });
      if (error) throw error;
      setAvaliacao("");
      setSerie("");
      setValorIndice("");
      setDisciplina("");
      await fetchResultados();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResultado = async (id) => {
    if (!canEdit) return alert("Apenas o administrador pode deletar.");
    setLoading(true);
    try {
      const { error } = await supabase.from("resultados").delete().eq("id", id);
      if (error) throw error;
      await fetchResultados();
    } catch (err) {
      alert("Erro ao deletar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const grupos = useMemo(() => {
    const map = {};
    resultados.forEach((r) => {
      // Normalização agressiva para garantir chaves idênticas
      function normalizar(str) {
        return String(str)
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[º°]/g, "o")
          .replace(/[^a-z0-9]/g, "");
      }

      const chave = `${normalizar(r.avaliacao)}-${normalizar(
        r.serie
      )}-${normalizar(r.disciplina)}`;

      if (!map[chave]) {
        map[chave] = {
          dados: [],
          tituloOriginal: `${r.avaliacao} - ${r.serie} - ${r.disciplina}`,
        };
      }

      map[chave].dados.push({
        ...r,
        ano: Number(r.ano),
        valor_indice: Number(r.valor_indice ?? 0),
      });
    });

    Object.keys(map).forEach((k) => {
      map[k].dados.sort((a, b) => a.ano - b.ano);
    });

    return Object.entries(map).map(([chave, grupo]) => ({
      chave,
      titulo: grupo.tituloOriginal,
      dados: grupo.dados,
    }));
  }, [resultados]);

  // Calcula último ano com dados
  const ultimoAno = useMemo(() => {
    if (resultados.length === 0) return "-";
    const anos = resultados.map((r) => r.ano).sort((a, b) => b - a);
    return anos[0];
  }, [resultados]);

  return (
    <div className={styles.pageContainer}>
      {/* Header Sticky */}
      <header className={styles.stickyHeader}>
        <button onClick={onVoltar} className={styles.voltarButton}>
          ← Voltar
        </button>
        <h1 className={styles.schoolTitle}>{escola?.nome_escola}</h1>
        <span className={styles.inepBadge}>INEP: {escola?.codigo_inep}</span>
      </header>

      {/* Main Layout - 2 Colunas */}
      <div className={styles.mainLayout}>
        {/* Coluna Principal - Gráficos */}
        <main className={styles.mainContent}>
          {loading ? (
            <div className={styles.loadingState}>
              <p>Carregando gráficos...</p>
            </div>
          ) : grupos.length > 0 ? (
            <>
              {/* Chart Navigation - Pills */}
              <div className={styles.chartNavigation}>
                <div className={styles.pillsContainer}>
                  {grupos.map((grupo, index) => (
                    <button
                      key={grupo.chave}
                      className={`${styles.pill} ${selectedGrafico === index ? styles.pillActive : ""
                        }`}
                      onClick={() => setSelectedGrafico(index)}
                      title={grupo.titulo}
                    >
                      {grupo.titulo}
                    </button>
                  ))}
                </div>
                <div className={styles.chartCounter}>
                  {selectedGrafico + 1} / {grupos.length}
                </div>
              </div>

              {/* Chart Display Area */}
              <div className={styles.chartDisplayArea}>
                {(() => {
                  const grupo = grupos[selectedGrafico];
                  if (!grupo) return null;

                  const titulo = grupo.titulo;
                  const dadosFormatados = grupo.dados.map((d) => ({
                    ano: d.ano,
                    valor_indice: d.valor_indice,
                    avaliacao: d.avaliacao,
                    serie: d.serie,
                    disciplina: d.disciplina,
                  }));

                  return (
                    <GraficoDeBarras
                      key={grupo.chave}
                      titulo={titulo}
                      data={dadosFormatados}
                    />
                  );
                })()}
              </div>
            </>
          ) : (
            <div className={styles.noDataState}>
              <p>📊 Nenhum gráfico disponível para esta escola.</p>
              <small>Adicione resultados usando o formulário ao lado.</small>
            </div>
          )}
        </main>

        {/* Sidebar - Info e Administração */}
        <aside className={styles.sidebar}>
          {/* Info Card */}
          <div className={styles.infoCard}>
            <h3>📋 Informações</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Total de Gráficos</span>
                <span className={styles.infoValue}>{grupos.length}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Último Ano</span>
                <span className={styles.infoValue}>{ultimoAno}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Resultados</span>
                <span className={styles.infoValue}>{resultados.length}</span>
              </div>
            </div>
          </div>

          {/* Admin Form */}
          {canEdit && (
            <div className={styles.adminCard}>
              <h3>➕ Adicionar Resultado</h3>
              <form onSubmit={handleAddResultado} className={styles.compactForm}>
                <input
                  type="text"
                  placeholder="Avaliação"
                  value={avaliacao}
                  onChange={(e) => setAvaliacao(e.target.value)}
                  className={styles.input}
                />

                <input
                  type="text"
                  placeholder="Disciplina"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  className={styles.input}
                />

                <div className={styles.inputRow}>
                  <input
                    type="number"
                    placeholder="Ano"
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className={styles.input}
                  />

                  <input
                    type="text"
                    placeholder="Série"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor"
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
            </div>
          )}

          {/* Results List */}
          <div className={styles.resultsCard}>
            <h3>📚 Todos os Resultados</h3>
            {loading ? (
              <p className={styles.loadingText}>Carregando...</p>
            ) : resultados.length === 0 ? (
              <p className={styles.emptyText}>Nenhum resultado cadastrado.</p>
            ) : (
              <ul className={styles.resultsList}>
                {resultados.map((r) => (
                  <li key={r.id} className={styles.resultItem}>
                    <div className={styles.resultInfo}>
                      <strong>
                        {r.disciplina} - {r.avaliacao}
                      </strong>
                      <small>
                        {r.ano} - {r.serie}
                      </small>
                    </div>
                    <span className={styles.resultValue}>
                      {r.valor_indice?.toFixed(2) || "N/A"}
                    </span>
                    {canEdit && (
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteResultado(r.id)}
                        disabled={loading}
                        title="Deletar"
                      >
                        🗑️
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
