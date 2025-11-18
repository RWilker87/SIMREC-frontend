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

  const isIdeb =
    tituloLower.includes("ideb") ||
    tituloLower.includes("idepe") ||
    avaliacao.includes("ideb") ||
    avaliacao.includes("idepe");

  // Define a escala máxima
  let maxValor = 10;
  if (!isIdeb) {
    if (serie.includes("2")) maxValor = 1000;
    else if (serie.includes("5") || serie.includes("9")) maxValor = 500;
    else maxValor = 10;
  } else {
    maxValor = 10;
  }

  // Normalização para IDEB
  let divisor = 1;
  if (isIdeb) {
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
    v = Math.max(0, Math.min(v, maxValor));
    return { ...p, valor: v };
  });

  // Marcadores do Eixo Y
  const gerarMarcadores = () => {
    if (maxValor === 10) return [10, 8, 6, 4, 2, 0];
    if (maxValor === 500) return [500, 400, 300, 200, 100, 0];
    return [1000, 800, 600, 400, 200, 0];
  };
  const marcadores = gerarMarcadores();

  // Cores modernas
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981"];

  // --- CORREÇÃO DO ALINHAMENTO SVG ---
  // Calcula a posição X baseada no centro da barra (flex space-around)
  const svgPoints = useMemo(() => {
    const n = pontos.length;
    if (n === 0) return [];
    return pontos.map((p, i) => {
      // Fórmula para space-around: o centro do item i está em ((i + 0.5) / n) * 100%
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
              const mostraOriginal =
                isIdeb && divisor > 1 && p.rawValor !== undefined;
              const valorTexto = mostraOriginal
                ? p.rawValor
                : p.valor.toFixed(2);

              return (
                <div key={p.ano} className={styles.barColumn}>
                  {/* Tooltip simples ao passar o mouse */}
                  <div
                    className={styles.barFill}
                    style={{
                      height: `${heightPercent}%`,
                      background: `linear-gradient(180deg, ${
                        colors[index % colors.length]
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
      function normalizar(str) {
        return String(str)
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[º°]/g, "o")
          .replace(/\s+/g, " ");
      }

      const chave = `${normalizar(r.avaliacao)} - ${normalizar(
        r.serie
      )} - ${normalizar(r.disciplina)}`;
      if (!map[chave]) map[chave] = [];
      map[chave].push({
        ...r,
        ano: Number(r.ano),
        valor_indice: Number(r.valor_indice ?? 0),
      });
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.ano - b.ano);
    });
    return map;
  }, [resultados]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={onVoltar} className={styles.voltarButton}>
          &larr; Voltar
        </button>
        <h1>{escola?.nome_escola}</h1>
        <small>INEP: {escola?.codigo_inep}</small>
      </div>

      <div className={styles.graficosContainer}>
        {loading ? (
          <p>Carregando gráficos...</p>
        ) : Object.keys(grupos).length > 0 ? (
          Object.entries(grupos).map(([chave, dados]) => {
            const titulo = chave;
            const dadosFormatados = dados.map((d) => ({
              ano: d.ano,
              valor_indice: d.valor_indice,
              avaliacao: d.avaliacao,
              serie: d.serie,
              disciplina: d.disciplina,
            }));
            return (
              <GraficoDeBarras
                key={chave}
                titulo={titulo}
                data={dadosFormatados}
              />
            );
          })
        ) : (
          <p className={styles.noData}>Nenhum dado disponível.</p>
        )}
      </div>

      <div className={painelStyles.contentRow}>
        {canEdit && (
          <form onSubmit={handleAddResultado} className={styles.cardForm}>
            <h3>Adicionar Novo Resultado</h3>

            <input
              type="text"
              placeholder="Avaliação (SAEB, IDEB...)"
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
              placeholder="Nota / Índice"
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
                      {r.valor_indice?.toFixed(2) || "N/A"}
                    </span>
                  </div>

                  {canEdit && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteResultado(r.id)}
                      disabled={loading}
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
