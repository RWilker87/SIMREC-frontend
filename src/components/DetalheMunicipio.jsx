// DetalheMunicipio.jsx — Painel de Notas do Município (idêntico ao DetalhesEscola)

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./DetalhesEscola.module.css";

// ==========================================================
// CONSTANTES (mesmas do DetalhesEscola)
// ==========================================================

const normStr = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

const TIPOS_AVALIACAO = [
  {
    key: "SAEPE",
    label: "SAEPE",
    cor: "azul",
    desc: "Média de Proficiência (Estadual - Pernambuco)",
    match: (av, ds) => normStr(av).includes("saepe"),
  },
  {
    key: "SAEB",
    label: "SAEB",
    cor: "azul",
    desc: "Média de Proficiência (Nacional - Brasil)",
    match: (av, ds) => normStr(av).includes("saeb") && !normStr(av).includes("saepe"),
  },
  {
    key: "IDEB",
    label: "IDEB",
    cor: "vermelho",
    desc: "Índice de Desenvolvimento da Educação Básica (Nacional)",
    match: (av, ds) => normStr(av).includes("ideb") || normStr(ds).includes("ideb"),
  },
  {
    key: "IDEPE",
    label: "IDEPE",
    cor: "ambar",
    desc: "Índice de Desenvolvimento da Educação de Pernambuco (Estadual)",
    match: (av, ds) => normStr(av).includes("idep") || normStr(ds).includes("idep"),
  },
  {
    key: "Fluencia",
    label: "Fluência",
    cor: "verde",
    desc: "Avaliação de Fluência e Alfabetização (Anos Iniciais)",
    match: (av, ds) => normStr(av).includes("fluenc") || normStr(ds).includes("fluenc"),
  },
];

// ==========================================================
// ÍCONES SVG (mesmos do DetalhesEscola)
// ==========================================================

const IconIdeb = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const IconIdep = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconFluencia = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const TIPO_ICONS = { SAEPE: IconIdeb, SAEB: IconIdeb, IDEB: IconIdeb, IDEPE: IconIdep, Fluencia: IconFluencia };

const formatarTitulo = (titulo) =>
  String(titulo || "")
    .replace(/fluencia/i, "Fluência")
    .replace(/idepe/i, "IDEPE")
    .replace(/idep/i, "IDEP")
    .replace(/ideb/i, "IDEB")
    .replace(/saepe/i, "SAEPE")
    .replace(/saeb/i, "SAEB");

// ==========================================================
// GRÁFICO DE BARRAS (idêntico ao DetalhesEscola)
// ==========================================================

const GraficoDeBarras = ({ titulo, data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const safeData = Array.isArray(data) && data.length > 0 ? data : [];

  const rawPontos = safeData.map((d) => ({
    ano: d.ano,
    rawValor: Number(d.valor_indice ?? 0),
    avaliacao: d.avaliacao,
    serie: d.serie,
    disciplina: d.disciplina,
  }));

  const primeira = rawPontos[0] || {};
  const serieStr = (primeira.serie || "").toString().toLowerCase();
  const avaliacaoStr = (primeira.avaliacao || "").toString().toLowerCase();
  const tituloLower = (titulo || "").toLowerCase();

  const isIdeb =
    tituloLower.includes("ideb") || tituloLower.includes("idepe") || tituloLower.includes("idep") ||
    avaliacaoStr.includes("ideb") || avaliacaoStr.includes("idepe") || avaliacaoStr.includes("idep");

  const isFluencia =
    tituloLower.includes("fluencia") || tituloLower.includes("fluência") ||
    avaliacaoStr.includes("fluencia") || avaliacaoStr.includes("fluência");

  let maxValor = 10;
  if (!isFluencia && !isIdeb) {
    if (serieStr.includes("2")) maxValor = 1000;
    else if (serieStr.includes("5") || serieStr.includes("9")) maxValor = 500;
    else maxValor = 500;
  }

  let divisor = 1;
  if (isIdeb && !isFluencia && rawPontos.length > 0) {
    const rawMax = Math.max(...rawPontos.map((p) => Math.abs(p.rawValor || 0)), 0);
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

  const marcadores = maxValor === 10 ? [10, 8, 6, 4, 2, 0]
    : maxValor === 500 ? [500, 400, 300, 200, 100, 0]
    : [1000, 800, 600, 400, 200, 0];

  const colors = ["#E57373", "#FFB74D", "#81C784", "#64B5F6", "#BA68C8"];
  const svgWidth = 800;
  const svgHeight = 450;
  const margin = { top: 50, right: 40, bottom: 60, left: 60 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;
  const N = pontos.length;

  const svgPoints = useMemo(() => {
    if (N === 0 || maxValor === 0) return [];
    return pontos.map((p, i) => {
      const x = margin.left + (i + 0.5) * (chartWidth / N);
      const y = margin.top + chartHeight - (p.valor / maxValor) * chartHeight;
      return { x, y, ano: p.ano, valor: p.valor, rawValor: p.rawValor, index: i };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeData.length, N, maxValor]);

  const linePath = useMemo(() => {
    if (svgPoints.length < 2) return "";
    return svgPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  }, [svgPoints]);

  if (safeData.length === 0) return null;

  return (
    <div className={styles.graficoCard}>
      <div className={styles.graficoHeader}>
        <h3>{formatarTitulo(titulo)}</h3>
      </div>
      <div className={styles.chartOuterWrapper}>
        <div className={styles.chartWrapper}>
          <svg className={styles.svgChart} viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
            <defs>
              {colors.map((c, idx) => (
                <linearGradient key={`gmu-${idx}`} id={`gmu-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} />
                  <stop offset="100%" stopColor={`${c}c0`} />
                </linearGradient>
              ))}
            </defs>

            {marcadores.map((m) => {
              const y = margin.top + chartHeight - (m / maxValor) * chartHeight;
              return (
                <g key={`mu-grid-${m}`}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} className={styles.gridLine} />
                  <text x={margin.left - 15} y={y + 4} textAnchor="end" className={styles.yLabelText}>{m}</text>
                </g>
              );
            })}

            <line x1={margin.left} y1={margin.top + chartHeight} x2={svgWidth - margin.right} y2={margin.top + chartHeight} className={styles.axisBaseLine} />

            {svgPoints.map((pt) => {
              const barWidth = Math.min(50, (chartWidth / N) * 0.45);
              const barHeight = Math.max(0, margin.top + chartHeight - pt.y);
              const barX = pt.x - barWidth / 2;
              const rx = Math.min(8, barHeight);
              return (
                <g key={`mu-bar-${pt.ano}`}>
                  <rect x={barX} y={pt.y} width={barWidth} height={barHeight} rx={rx} ry={rx} fill={`url(#gmu-${pt.index % colors.length})`} className={`${styles.barRect} ${hoveredPoint?.index === pt.index ? styles.barRectActive : ""}`} />
                  {barHeight > rx && (
                    <rect x={barX} y={margin.top + chartHeight - rx} width={barWidth} height={rx} fill={`url(#gmu-${pt.index % colors.length})`} />
                  )}
                </g>
              );
            })}

            {linePath && (
              <>
                <path d={linePath} className={styles.trendLineGlow} />
                <path d={linePath} className={styles.trendLine} />
              </>
            )}

            {svgPoints.map((pt) => (
              <text key={`mu-x-${pt.ano}`} x={pt.x} y={svgHeight - 15} textAnchor="middle" className={styles.xLabelText}>{pt.ano}</text>
            ))}

            {svgPoints.map((pt) => (
              <g key={`mu-node-${pt.ano}`} className={`${styles.chartNodeGroup} ${hoveredPoint?.index === pt.index ? styles.chartNodeGroupActive : ""}`}>
                <circle cx={pt.x} cy={pt.y} r="8" fill="var(--detail-color)" className={styles.nodeGlowRing} />
                <circle cx={pt.x} cy={pt.y} r="5" fill="var(--detail-color)" className={styles.nodeMiddleRing} />
                <circle cx={pt.x} cy={pt.y} r="2" fill="#ffffff" />
              </g>
            ))}

            {svgPoints.map((pt) => (
              <rect key={`mu-hover-${pt.ano}`} x={pt.x - chartWidth / N / 2} y={margin.top} width={chartWidth / N} height={chartHeight} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)} />
            ))}
          </svg>

          {hoveredPoint && (
            <div className={styles.htmlTooltip} style={{ left: `${(hoveredPoint.x / svgWidth) * 100}%`, top: `${(hoveredPoint.y / svgHeight) * 100 - 16}%` }}>
              <div className={styles.tooltipHeader}>{hoveredPoint.ano}</div>
              <div className={styles.tooltipBody}>
                <span className={styles.tooltipLabel}>Índice:</span>
                <strong className={styles.tooltipValue}>{Number(hoveredPoint.rawValor).toFixed(2)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================================
// BREADCRUMB (idêntico ao DetalhesEscola)
// ==========================================================

const Breadcrumb = ({ tipo, disciplina, serie, onReset, onClickTipo, onClickDisciplina }) => {
  const tipoLabel = TIPOS_AVALIACAO.find((t) => t.key === tipo)?.label || tipo;
  return (
    <nav className={styles.breadcrumb}>
      <button className={styles.breadcrumbBtn} onClick={onReset}>Início</button>
      {tipo && (
        <>
          <span className={styles.breadcrumbSep}>›</span>
          <button className={`${styles.breadcrumbBtn} ${!disciplina ? styles.breadcrumbActive : ""}`} onClick={disciplina ? onClickTipo : undefined} style={!disciplina ? { cursor: "default" } : {}}>
            {tipoLabel}
          </button>
        </>
      )}
      {disciplina && (
        <>
          <span className={styles.breadcrumbSep}>›</span>
          <button className={`${styles.breadcrumbBtn} ${!serie ? styles.breadcrumbActive : ""}`} onClick={serie ? onClickDisciplina : undefined} style={!serie ? { cursor: "default" } : {}}>
            {disciplina}
          </button>
        </>
      )}
      {serie && (
        <>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={`${styles.breadcrumbBtn} ${styles.breadcrumbActive}`}>{serie}</span>
        </>
      )}
    </nav>
  );
};

// ==========================================================
// COMPONENTE PRINCIPAL
// ==========================================================

export default function DetalheMunicipio() {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isNotasOpen, setIsNotasOpen] = useState(false);
  const [isNovoLancamentoOpen, setIsNovoLancamentoOpen] = useState(false);
  const [editingResultado, setEditingResultado] = useState(null);
  const [buscaNotasModal, setBuscaNotasModal] = useState("");

  // Navegação drill-down
  const [selectedTipo, setSelectedTipo] = useState(null);
  const [selectedDisciplina, setSelectedDisciplina] = useState(null);
  const [selectedSerie, setSelectedSerie] = useState(null);

  // Form - Novo Lançamento
  const [avaliacao, setAvaliacao] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [serie, setSerie] = useState("");
  const [valorIndice, setValorIndice] = useState("");
  const [disciplina, setDisciplina] = useState("");

  async function fetchResultados() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resultados")
        .select("*")
        .is("escola_id", null)
        .order("ano", { ascending: true });
      if (error) throw error;
      setResultados(data || []);
    } catch (err) {
      alert("Erro ao buscar dados: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResultados();
  }, []);

  const handleAddResultado = async (e) => {
    e.preventDefault();
    if (!avaliacao || !ano || !serie || !valorIndice || !disciplina) {
      alert("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("resultados").insert({
        escola_id: null,
        avaliacao: avaliacao.trim(),
        ano: parseInt(ano, 10),
        serie: serie.trim(),
        valor_indice: parseFloat(valorIndice),
        disciplina: disciplina.trim(),
      });
      if (error) throw error;
      setAvaliacao(""); setSerie(""); setValorIndice(""); setDisciplina("");
      setIsNovoLancamentoOpen(false);
      await fetchResultados();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingResultado) return;
    const { avaliacao: ea, ano: eano, serie: eserie, valor_indice: evalor, disciplina: edisc } = editingResultado;
    if (!ea || !eano || !eserie || evalor === "" || !edisc) {
      alert("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("resultados").update({
        avaliacao: String(ea).trim(),
        ano: parseInt(eano, 10),
        serie: String(eserie).trim(),
        valor_indice: parseFloat(evalor),
        disciplina: String(edisc).trim(),
      }).eq("id", editingResultado.id);
      if (error) throw error;
      setEditingResultado(null);
      await fetchResultados();
    } catch (err) {
      alert("Erro ao editar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResultado = async (id) => {
    if (!window.confirm("Tem certeza que deseja remover esta nota?")) return;
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

  // Agrupa resultados por avaliação + série + disciplina
  const grupos = useMemo(() => {
    const map = {};
    resultados.forEach((r) => {
      function normalizar(str) {
        return String(str).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[º°]/g, "o").replace(/[^a-z0-9]/g, "");
      }
      const chave = `${normalizar(r.avaliacao)}-${normalizar(r.serie)}-${normalizar(r.disciplina)}`;
      if (!map[chave]) {
        map[chave] = {
          dados: [],
          titulo: `${r.avaliacao} - ${r.serie} - ${r.disciplina}`,
          avaliacao: (r.avaliacao || "").trim(),
          serie: (r.serie || "").trim(),
          disciplina: (r.disciplina || "").trim(),
        };
      }
      map[chave].dados.push({ ...r, ano: Number(r.ano), valor_indice: Number(r.valor_indice ?? 0) });
    });
    Object.keys(map).forEach((k) => map[k].dados.sort((a, b) => a.ano - b.ano));
    return Object.entries(map).map(([chave, g]) => ({ chave, ...g }));
  }, [resultados]);

  const contagemPorTipo = useMemo(() => {
    const counts = {};
    TIPOS_AVALIACAO.forEach((t) => {
      counts[t.key] = grupos.filter((g) => t.match(g.avaliacao, g.disciplina)).length;
    });
    return counts;
  }, [grupos]);

  const disciplinasDisponiveis = useMemo(() => {
    if (!selectedTipo) return [];
    const tipo = TIPOS_AVALIACAO.find((t) => t.key === selectedTipo);
    if (!tipo) return [];
    const discs = [...new Set(grupos.filter((g) => tipo.match(g.avaliacao, g.disciplina)).map((g) => g.disciplina))];
    return discs.sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
  }, [grupos, selectedTipo]);

  const seriesDisponiveis = useMemo(() => {
    if (!selectedTipo || !selectedDisciplina) return [];
    const tipo = TIPOS_AVALIACAO.find((t) => t.key === selectedTipo);
    if (!tipo) return [];
    const series = [...new Set(
      grupos.filter((g) => tipo.match(g.avaliacao, g.disciplina) && g.disciplina === selectedDisciplina).map((g) => g.serie)
    )];
    return series.sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
  }, [grupos, selectedTipo, selectedDisciplina]);

  const grupoSelecionado = useMemo(() => {
    if (!selectedTipo || !selectedDisciplina || !selectedSerie) return null;
    const tipo = TIPOS_AVALIACAO.find((t) => t.key === selectedTipo);
    if (!tipo) return null;
    return grupos.find((g) => tipo.match(g.avaliacao, g.disciplina) && g.disciplina === selectedDisciplina && g.serie === selectedSerie) || null;
  }, [grupos, selectedTipo, selectedDisciplina, selectedSerie]);

  const resetToStep1 = () => { setSelectedTipo(null); setSelectedDisciplina(null); setSelectedSerie(null); };
  const resetToStep2 = () => { setSelectedDisciplina(null); setSelectedSerie(null); };
  const resetToStep3 = () => { setSelectedSerie(null); };

  const ultimoAno = useMemo(() => {
    if (resultados.length === 0) return "—";
    return Math.max(...resultados.map((r) => r.ano));
  }, [resultados]);

  const notasFiltradasModal = useMemo(() => {
    const termo = buscaNotasModal.trim().toLowerCase();
    if (!termo) return resultados;
    return resultados.filter((r) =>
      String(r.disciplina || "").toLowerCase().includes(termo) ||
      String(r.avaliacao || "").toLowerCase().includes(termo) ||
      String(r.serie || "").toLowerCase().includes(termo) ||
      String(r.ano || "").includes(termo) ||
      String(r.valor_indice || "").includes(termo)
    );
  }, [resultados, buscaNotasModal]);

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <div className={styles.dashboardWorkspace} style={{ maxWidth: "100%", padding: 0 }}>
      {/* KPI strip */}
      <div className={styles.infoStrip}>
        <div className={styles.infoWidget}>
          <div className={styles.infoWidgetIcon}>📊</div>
          <div className={styles.infoWidgetContent}>
            <span className={styles.infoWidgetValue}>{grupos.length}</span>
            <span className={styles.infoWidgetLabel}>Avaliações Únicas</span>
          </div>
        </div>
        <div className={styles.infoWidget}>
          <div className={styles.infoWidgetIcon}>⏱️</div>
          <div className={styles.infoWidgetContent}>
            <span className={styles.infoWidgetValue}>{ultimoAno}</span>
            <span className={styles.infoWidgetLabel}>Último Lançamento</span>
          </div>
        </div>
        <div className={styles.infoWidget}>
          <div className={styles.infoWidgetIcon}>📝</div>
          <div className={styles.infoWidgetContent}>
            <span className={styles.infoWidgetValue}>{resultados.length}</span>
            <span className={styles.infoWidgetLabel}>Notas Lançadas</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionBarLeft}>
          <button onClick={() => setIsNotasOpen(true)} className={styles.actionButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Notas Lançadas
          </button>
        </div>
        <div className={styles.actionBarRight}>
          <button onClick={() => setIsNovoLancamentoOpen(true)} className={`${styles.actionButton} ${styles.btnPrimary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO DRILL-DOWN */}
      <div className={styles.drillContainer}>
        {selectedTipo && (
          <Breadcrumb
            tipo={selectedTipo}
            disciplina={selectedDisciplina}
            serie={selectedSerie}
            onReset={resetToStep1}
            onClickTipo={resetToStep2}
            onClickDisciplina={resetToStep3}
          />
        )}

        {/* ETAPA 1 — Selecionar Avaliação */}
        {!selectedTipo && (
          <>
            {loading ? (
              <div className={styles.drillEmpty}><p>Carregando...</p></div>
            ) : resultados.length === 0 ? (
              <div className={styles.drillEmpty}>
                <p>Nenhum resultado cadastrado para o município.</p>
                <small>Use o botão "Novo Lançamento" acima para cadastrar o primeiro resultado.</small>
              </div>
            ) : (
              <>
                <p className={styles.stepPrompt}>Selecione o tipo de avaliação</p>
                <div className={styles.tipoCards}>
                  {TIPOS_AVALIACAO.map((tipo) => {
                    const count = contagemPorTipo[tipo.key] || 0;
                    const Icon = TIPO_ICONS[tipo.key];
                    return (
                      <button
                        key={tipo.key}
                        className={`${styles.tipoCard} ${styles[`tipoCard_${tipo.cor}`]} ${count === 0 ? styles.tipoCardDisabled : ""}`}
                        onClick={() => count > 0 && setSelectedTipo(tipo.key)}
                        disabled={count === 0}
                      >
                        <div className={styles.tipoCardIcon}><Icon /></div>
                        <span className={styles.tipoCardLabel}>{tipo.label}</span>
                        <span className={styles.tipoCardDesc}>{tipo.desc}</span>
                        <span className={styles.tipoCardCount}>
                          {count > 0 ? `${count} grupo${count !== 1 ? "s" : ""}` : "Sem dados"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ETAPA 2 — Selecionar Matéria */}
        {selectedTipo && !selectedDisciplina && (
          <>
            <p className={styles.stepPrompt}>Selecione a matéria</p>
            <div className={styles.optionGrid}>
              {disciplinasDisponiveis.map((disc) => (
                <button
                  key={disc}
                  className={`${styles.optionCard} ${styles[`optionCard_${TIPOS_AVALIACAO.find(t => t.key === selectedTipo)?.cor}`]}`}
                  onClick={() => setSelectedDisciplina(disc)}
                >
                  {disc}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ETAPA 3 — Selecionar Série */}
        {selectedTipo && selectedDisciplina && !selectedSerie && (
          <>
            <p className={styles.stepPrompt}>Selecione o ano</p>
            <div className={styles.optionGrid}>
              {seriesDisponiveis.map((s) => (
                <button
                  key={s}
                  className={`${styles.optionCard} ${styles[`optionCard_${TIPOS_AVALIACAO.find(t => t.key === selectedTipo)?.cor}`]}`}
                  onClick={() => setSelectedSerie(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {/* GRÁFICO */}
        {grupoSelecionado && (
          <div className={styles.chartDisplayArea}>
            <GraficoDeBarras
              key={grupoSelecionado.chave}
              titulo={grupoSelecionado.titulo}
              data={grupoSelecionado.dados}
            />
          </div>
        )}
      </div>

      {/* MODAL: HISTÓRICO DE NOTAS */}
      {isNotasOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNotasOpen(false)}>
          <div className={`${styles.modalContainer} ${styles.modalContainerLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Notas Lançadas — Município ({resultados.length})
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsNotasOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalSearchWrapper}>
                <svg className={styles.modalSearchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className={styles.modalSearchInput}
                  placeholder="Pesquisar por disciplina, avaliação, ano..."
                  value={buscaNotasModal}
                  onChange={(e) => setBuscaNotasModal(e.target.value)}
                />
              </div>
              {resultados.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma nota lançada.</p>
              ) : notasFiltradasModal.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma nota corresponde à busca.</p>
              ) : (
                <div className={styles.tableResponsive}>
                  <table className={styles.notesTable}>
                    <thead>
                      <tr>
                        <th>Avaliação</th>
                        <th>Disciplina</th>
                        <th>Série</th>
                        <th>Ano</th>
                        <th>Índice</th>
                        <th style={{ textAlign: "center" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notasFiltradasModal.map((r) => (
                        <tr key={r.id} className={styles.tableRow}>
                          <td><span className={styles.tableBadge}>{r.avaliacao}</span></td>
                          <td className={styles.tableImportant}>{r.disciplina}</td>
                          <td>{r.serie}</td>
                          <td><strong>{r.ano}</strong></td>
                          <td><span className={styles.tableValueBadge}>{r.valor_indice?.toFixed(2) || "N/A"}</span></td>
                          <td style={{ textAlign: "center" }}>
                            <div className={styles.tableActions}>
                              <button className={styles.tableEditButton} onClick={() => setEditingResultado({ ...r })} disabled={loading} title="Editar">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button className={styles.tableDeleteButton} onClick={() => handleDeleteResultado(r.id)} disabled={loading} title="Deletar">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setIsNotasOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO LANÇAMENTO */}
      {isNovoLancamentoOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNovoLancamentoOpen(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Lançar Nota — Município
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsNovoLancamentoOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddResultado}>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.filterLabel} htmlFor="mu-avaliacao">Tipo de Avaliação</label>
                  <select id="mu-avaliacao" value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} className={styles.filterSelect} required>
                    <option value="">Selecione...</option>
                    <option value="SAEPE">SAEPE</option>
                    <option value="SAEB">SAEB</option>
                    <option value="IDEB">IDEB</option>
                    <option value="IDEP">IDEPE</option>
                    <option value="Fluencia">Fluência</option>
                  </select>
                </div>
                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.filterLabel} htmlFor="mu-disciplina">Disciplina</label>
                  <input id="mu-disciplina" type="text" placeholder="Ex: Matemática, Língua Portuguesa" value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className={styles.filterInput} required />
                </div>
                <div className={styles.modalFormGrid} style={{ marginTop: "16px" }}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.filterLabel} htmlFor="mu-ano">Ano Civil</label>
                    <input id="mu-ano" type="number" placeholder="Ex: 2025" value={ano} onChange={(e) => setAno(e.target.value)} className={styles.filterInput} required />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.filterLabel} htmlFor="mu-serie">Série / Ano Escolar</label>
                    <input id="mu-serie" type="text" placeholder="Ex: 5° Ano, 9° Ano" value={serie} onChange={(e) => setSerie(e.target.value)} className={styles.filterInput} required />
                  </div>
                </div>
                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.filterLabel} htmlFor="mu-valor">Valor do Índice</label>
                  <input id="mu-valor" type="number" step="0.01" placeholder="Ex: 6.42 ou 88.50" value={valorIndice} onChange={(e) => setValorIndice(e.target.value)} className={styles.filterInput} required />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsNovoLancamentoOpen(false)}>Cancelar</button>
                <button type="submit" disabled={loading} className={`${styles.actionButton} ${styles.btnPrimary}`}>
                  {loading ? "Salvando..." : "Confirmar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR */}
      {editingResultado && (
        <div className={styles.modalOverlay} onClick={() => setEditingResultado(null)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar Resultado — Município
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setEditingResultado(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.filterLabel}>Tipo de Avaliação</label>
                  <select value={editingResultado.avaliacao} onChange={(e) => setEditingResultado((p) => ({ ...p, avaliacao: e.target.value }))} className={styles.filterSelect} required>
                    <option value="">Selecione...</option>
                    <option value="SAEPE">SAEPE</option>
                    <option value="SAEB">SAEB</option>
                    <option value="IDEB">IDEB</option>
                    <option value="IDEP">IDEPE</option>
                    <option value="Fluencia">Fluência</option>
                  </select>
                </div>
                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.filterLabel}>Disciplina</label>
                  <input type="text" placeholder="Ex: Matemática" value={editingResultado.disciplina} onChange={(e) => setEditingResultado((p) => ({ ...p, disciplina: e.target.value }))} className={styles.filterInput} required />
                </div>
                <div className={styles.modalFormGrid} style={{ marginTop: "16px" }}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.filterLabel}>Ano Civil</label>
                    <input type="number" value={editingResultado.ano} onChange={(e) => setEditingResultado((p) => ({ ...p, ano: e.target.value }))} className={styles.filterInput} required />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.filterLabel}>Série / Ano Escolar</label>
                    <input type="text" value={editingResultado.serie} onChange={(e) => setEditingResultado((p) => ({ ...p, serie: e.target.value }))} className={styles.filterInput} required />
                  </div>
                </div>
                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.filterLabel}>Valor do Índice</label>
                  <input type="number" step="0.01" value={editingResultado.valor_indice} onChange={(e) => setEditingResultado((p) => ({ ...p, valor_indice: e.target.value }))} className={styles.filterInput} required />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setEditingResultado(null)}>Cancelar</button>
                <button type="submit" disabled={loading} className={`${styles.actionButton} ${styles.btnPrimary}`}>
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
