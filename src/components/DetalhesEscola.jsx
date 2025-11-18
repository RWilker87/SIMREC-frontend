// src/components/DetalhesEscola.jsx

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./DetalhesEscola.module.css";
import painelStyles from "./PainelPrincipal.module.css";

// ==========================================================
// COMPONENTE DE GRÁFICO — BARRAS + LINHA (MIX) (AJUSTADO IDEB/IDEPE)
// ==========================================================
const GraficoDeBarras = ({ titulo, data }) => {
  if (!data || data.length === 0) return null;

  // --- dados brutos (ordenados por ano externamente) ---
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
  // Detecta IDEB/IDEPE no campo e também no título
  const tituloLower = titulo.toLowerCase();
  const isIdeb =
    tituloLower.includes("ideb") ||
    tituloLower.includes("idepe") ||
    avaliacao.includes("ideb") ||
    avaliacao.includes("idepe");

  // FORCE escala 0-10 para IDEB/IDEPE
  let maxValor = 10;
  if (!isIdeb) {
    // comportamento antigo para outras avaliações
    if (serie.includes("2")) maxValor = 1000;
    else if (serie.includes("5") || serie.includes("9")) maxValor = 500;
    else maxValor = 10;
  } else {
    maxValor = 10;
  }

  // --- Nova normalização robusta para IDEB/IDEPE ---
  // Se isIdeb: detectar rawMax e escolher divisor (1,10,100,1000...)
  // tal que rawMax / divisor <= 10 (ou divisor kept minimal)
  let divisor = 1;
  if (isIdeb) {
    const rawMax = Math.max(
      ...rawPontos.map((p) => Math.abs(p.rawValor || 0)),
      0
    );
    // Evita divisor = 0 e garante que valores como 75 -> 7.5, 750 -> 7.5, etc.
    while (rawMax / divisor > 10) {
      divisor *= 10;
      // safety: prevent infinite loop (não necessário, mas seguro)
      if (divisor > 1e9) break;
    }
    // se rawMax estiver entre 11 e 99 e divisor stayed 1, a regra acima fará divisor=10
    // (ex: rawMax=50 -> divisor=10 -> 50/10 = 5)
  }

  const pontos = rawPontos.map((p) => {
    let v = p.rawValor;
    if (isIdeb && divisor > 1) v = v / divisor;
    // se divisor === 1 e isIdeb, mantemos v (caso já esteja 0-10)
    // cap entre 0 e maxValor
    v = Math.max(0, Math.min(v, maxValor));
    return { ...p, valor: v };
  });

  // marcadores para eixo Y
  const gerarMarcadores = () => {
    if (maxValor === 10) return [10, 7.5, 5, 2.5, 0];
    if (maxValor === 500) return [500, 375, 250, 125, 0];
    return [1000, 750, 500, 250, 0];
  };
  const marcadores = gerarMarcadores();

  // cores (ciclo)
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE"];

  // --- Gerar pontos para svg (percentuais) ---
  const svgPoints = useMemo(() => {
    const n = pontos.length;
    if (n === 0) return [];
    return pontos.map((p, i) => {
      const x = n === 1 ? 50 : (i / (n - 1)) * 100;
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

      <div className={styles.chartContainer}>
        <div className={styles.yAxis}>
          {marcadores.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        <div className={styles.chartContent} style={{ position: "relative" }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            {marcadores.map((m, idx) => {
              const y = 100 - (m / maxValor) * 100;
              return (
                <line
                  key={`grid-${idx}`}
                  x1="0"
                  x2="100"
                  y1={`${y}`}
                  y2={`${y}`}
                  stroke="#f3f3f3"
                  strokeWidth="0.3"
                />
              );
            })}

            {polylineStr && (
              <polyline
                points={polylineStr}
                fill="none"
                stroke="#333"
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            )}

            {svgPoints.map((pt, i) => (
              <circle
                key={`p-${i}`}
                cx={`${pt.x}`}
                cy={`${pt.y}`}
                r={1.4}
                fill="#222"
                stroke="#fff"
                strokeWidth="0.3"
              />
            ))}
          </svg>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              height: "100%",
              width: "100%",
              zIndex: 1,
            }}
          >
            {pontos.map((p, index) => {
              const heightPercent = Math.max(
                0,
                Math.min(100, (p.valor / maxValor) * 100)
              );
              // mostrar original caso tenha sido dividido
              const mostraOriginal =
                isIdeb && divisor > 1 && p.rawValor !== undefined;
              const titleText = mostraOriginal
                ? `${p.ano}: ${p.valor.toFixed(2)} (orig: ${p.rawValor})`
                : `${p.ano}: ${p.valor.toFixed(2)}`;

              return (
                <div key={p.ano} className={styles.barGroup}>
                  <div className={styles.barWrapper}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: colors[index % colors.length],
                        zIndex: 0,
                      }}
                      title={titleText}
                    />
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
// COMPONENTE PRINCIPAL — DetalhesEscola (mesmo que antes)
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
              placeholder="Avaliação (SAEB, IDEB, IDEPE...)"
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
              placeholder="Série (2º Ano, 5º Ano, 9º Ano)"
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
