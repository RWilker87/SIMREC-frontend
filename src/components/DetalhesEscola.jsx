// src/components/DetalhesEscola.jsx

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./DetalhesEscola.module.css";

// ==========================================================
// COMPONENTE DE GRÁFICO — 100% SVG PREMIUM NATIVO
// ==========================================================
const GraficoDeBarras = ({ titulo, data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

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

  // Verifica se é Fluência
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
    v = Math.max(0, Math.min(v, maxValor));
    return { ...p, valor: v };
  });

  // Marcadores do Eixo Y
  const gerarMarcadores = () => {
    if (isFluencia) return [100, 80, 60, 40, 20, 0];
    if (maxValor === 10) return [10, 8, 6, 4, 2, 0];
    if (maxValor === 500) return [500, 400, 300, 200, 100, 0];
    return [1000, 800, 600, 400, 200, 0];
  };
  const marcadores = gerarMarcadores();

  // Cores institucionais SUAVIZADAS (Vermelho, Âmbar, Verde, Azul, Roxo)
  const colors = ["#E57373", "#FFB74D", "#81C784", "#64B5F6", "#BA68C8"];

  // --- Dimensões SVG Unificadas ---
  const svgWidth = 800;
  const svgHeight = 450;
  const margin = { top: 50, right: 40, bottom: 60, left: 60 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  const N = pontos.length;
  
  // Coordenadas calculadas no mesmo viewport
  const svgPoints = useMemo(() => {
    return pontos.map((p, i) => {
      const x = margin.left + (i + 0.5) * (chartWidth / N);
      const y = margin.top + chartHeight - (p.valor / maxValor) * chartHeight;
      return {
        x,
        y,
        ano: p.ano,
        valor: p.valor,
        rawValor: p.rawValor,
        index: i,
      };
    });
  }, [pontos, maxValor, N, chartWidth, chartHeight]);

  const linePath = useMemo(() => {
    if (svgPoints.length < 2) return "";
    return svgPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  }, [svgPoints]);

  return (
    <div className={styles.graficoCard}>
      <h3>{formatarTitulo(titulo)}</h3>

      <div className={styles.chartOuterWrapper}>
        <div className={styles.chartWrapper}>
          <svg
            className={styles.svgChart}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            width="100%"
            height="100%"
          >
            {/* Definições de Gradientes e Filtros */}
            <defs>
              {colors.map((c, idx) => (
                <linearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} />
                  <stop offset="100%" stopColor={`${c}c0`} />
                </linearGradient>
              ))}
              <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Linhas de Grade Horizontais e Rótulos Eixo Y */}
            {marcadores.map((m) => {
              const y = margin.top + chartHeight - (m / maxValor) * chartHeight;
              return (
                <g key={`grid-${m}`} className={styles.gridGroup}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={svgWidth - margin.right}
                    y2={y}
                    className={styles.gridLine}
                  />
                  <text
                    x={margin.left - 15}
                    y={y + 4}
                    textAnchor="end"
                    className={styles.yLabelText}
                  >
                    {m}
                  </text>
                </g>
              );
            })}

            {/* Eixo X - Linha Base */}
            <line
              x1={margin.left}
              y1={margin.top + chartHeight}
              x2={svgWidth - margin.right}
              y2={margin.top + chartHeight}
              className={styles.axisBaseLine}
            />

            {/* Renderização das Barras Gradientes com Topos Arredondados */}
            {svgPoints.map((pt) => {
              const barWidth = Math.min(50, (chartWidth / N) * 0.45);
              const barHeight = Math.max(0, margin.top + chartHeight - pt.y);
              const barX = pt.x - barWidth / 2;
              const rx = 8; // Raio das bordas do topo
              
              // Se a barra tiver altura menor que o raio, ajustamos
              const finalRx = Math.min(rx, barHeight);

              // Desenha o retângulo principal com borda arredondada
              // E um pequeno retângulo plano sobreposto no fundo para achatar apenas a base!
              return (
                <g key={`bar-${pt.ano}`} className={styles.barGroup}>
                  <rect
                    x={barX}
                    y={pt.y}
                    width={barWidth}
                    height={barHeight}
                    rx={finalRx}
                    ry={finalRx}
                    fill={`url(#grad-${pt.index % colors.length})`}
                    className={`${styles.barRect} ${
                      hoveredPoint?.index === pt.index ? styles.barRectActive : ""
                    }`}
                  />
                  {/* Retângulo plano na base para remover os cantos arredondados inferiores */}
                  {barHeight > finalRx && (
                    <rect
                      x={barX}
                      y={margin.top + chartHeight - finalRx}
                      width={barWidth}
                      height={finalRx}
                      fill={`url(#grad-${pt.index % colors.length})`}
                    />
                  )}
                </g>
              );
            })}

            {/* Linha de Tendência */}
            {linePath && (
              <>
                <path
                  d={linePath}
                  className={styles.trendLineGlow}
                />
                <path
                  d={linePath}
                  className={styles.trendLine}
                />
              </>
            )}

            {/* Rótulos Eixo X (Anos) */}
            {svgPoints.map((pt) => (
              <text
                key={`x-text-${pt.ano}`}
                x={pt.x}
                y={svgHeight - 15}
                textAnchor="middle"
                className={styles.xLabelText}
              >
                {pt.ano}
              </text>
            ))}

            {/* Pontos de Dados Interativos */}
            {svgPoints.map((pt) => (
              <g
                key={`node-${pt.ano}`}
                className={`${styles.chartNodeGroup} ${
                  hoveredPoint?.index === pt.index ? styles.chartNodeGroupActive : ""
                }`}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="8"
                  fill="var(--detail-color)"
                  className={styles.nodeGlowRing}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="var(--detail-color)"
                  className={styles.nodeMiddleRing}
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="2"
                  fill="#ffffff"
                />
              </g>
            ))}

            {/* Zonas de Captura de Hover (Vertical Columns) */}
            {svgPoints.map((pt) => (
              <rect
                key={`hover-col-${pt.ano}`}
                x={pt.x - chartWidth / N / 2}
                y={margin.top}
                width={chartWidth / N}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Tooltip Dinâmico Absoluto */}
          {hoveredPoint && (
            <div
              className={styles.htmlTooltip}
              style={{
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                top: `${(hoveredPoint.y / svgHeight) * 100 - 16}%`,
              }}
            >
              <div className={styles.tooltipHeader}>{hoveredPoint.ano}</div>
              <div className={styles.tooltipBody}>
                <span className={styles.tooltipLabel}>Índice:</span>
                <strong className={styles.tooltipValue}>
                  {isFluencia
                    ? `${Math.round(hoveredPoint.rawValor)}%`
                    : Number(hoveredPoint.rawValor).toFixed(2)}
                </strong>
              </div>
            </div>
          )}
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

  // Estados dos Modais
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(false);
  const [isNotasOpen, setIsNotasOpen] = useState(false);
  const [isNovoLancamentoOpen, setIsNovoLancamentoOpen] = useState(false);

  // Estado de Pesquisa interna do histórico
  const [buscaNotasModal, setBuscaNotasModal] = useState("");

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

  // Form Fields para Lançamento
  const [avaliacao, setAvaliacao] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [serie, setSerie] = useState("");
  const [valorIndice, setValorIndice] = useState("");
  const [disciplina, setDisciplina] = useState("");

  // Filtros
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroAvaliacao, setFiltroAvaliacao] = useState("todas");
  const [filtroSerie, setFiltroSerie] = useState("todas");
  const [filtroDisciplina, setFiltroDisciplina] = useState("todas");
  const [selectedGrafico, setSelectedGrafico] = useState(0);

  const handleAddResultado = async (e) => {
    e.preventDefault();
    if (!canEdit) return alert("Apenas o administrador pode adicionar resultados.");
    if (!avaliacao || !ano || !serie || !valorIndice || !disciplina) {
      alert("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("resultados").insert({
        escola_id: escola.id,
        avaliacao: avaliacao.trim(),
        ano: parseInt(ano, 10),
        serie: serie.trim(),
        valor_indice: parseFloat(valorIndice),
        disciplina: disciplina.trim(),
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
          .replace(/[^a-z0-9]/g, "");
      }

      const chave = `${normalizar(r.avaliacao)}-${normalizar(r.serie)}-${normalizar(
        r.disciplina
      )}`;

      if (!map[chave]) {
        map[chave] = {
          dados: [],
          tituloOriginal: `${r.avaliacao} - ${r.serie} - ${r.disciplina}`,
          avaliacao: r.avaliacao || "Sem avaliação",
          serie: r.serie || "Sem série",
          disciplina: r.disciplina || "Sem disciplina",
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
      avaliacao: grupo.avaliacao,
      serie: grupo.serie,
      disciplina: grupo.disciplina,
      dados: grupo.dados,
    }));
  }, [resultados]);

  const opcoesFiltros = useMemo(() => {
    const sortAlpha = (a, b) =>
      String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });

    return {
      avaliacoes: [...new Set(grupos.map((g) => g.avaliacao))].sort(sortAlpha),
      series: [...new Set(grupos.map((g) => g.serie))].sort(sortAlpha),
      disciplinas: [...new Set(grupos.map((g) => g.disciplina))].sort(sortAlpha),
    };
  }, [grupos]);

  const gruposFiltrados = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();

    return grupos.filter((grupo) => {
      const matchAvaliacao =
        filtroAvaliacao === "todas" || grupo.avaliacao === filtroAvaliacao;
      const matchSerie = filtroSerie === "todas" || grupo.serie === filtroSerie;
      const matchDisciplina =
        filtroDisciplina === "todas" || grupo.disciplina === filtroDisciplina;

      const textoBusca = `${grupo.titulo} ${grupo.avaliacao} ${grupo.serie} ${grupo.disciplina}`.toLowerCase();
      const matchBusca = !termo || textoBusca.includes(termo);

      return matchAvaliacao && matchSerie && matchDisciplina && matchBusca;
    });
  }, [grupos, filtroBusca, filtroAvaliacao, filtroSerie, filtroDisciplina]);

  // Histórico filtrado para o modal de notas
  const notasFiltradasModal = useMemo(() => {
    const termo = buscaNotasModal.trim().toLowerCase();
    if (!termo) return resultados;
    return resultados.filter((r) => {
      return (
        String(r.disciplina || "").toLowerCase().includes(termo) ||
        String(r.avaliacao || "").toLowerCase().includes(termo) ||
        String(r.serie || "").toLowerCase().includes(termo) ||
        String(r.ano || "").includes(termo) ||
        String(r.valor_indice || "").includes(termo)
      );
    });
  }, [resultados, buscaNotasModal]);

  useEffect(() => {
    if (selectedGrafico > 0 && selectedGrafico >= gruposFiltrados.length) {
      setSelectedGrafico(0);
    }
  }, [selectedGrafico, gruposFiltrados.length]);

  const grupoAtual = gruposFiltrados[selectedGrafico] || null;

  const limparFiltros = () => {
    setFiltroBusca("");
    setFiltroAvaliacao("todas");
    setFiltroSerie("todas");
    setFiltroDisciplina("todas");
    setSelectedGrafico(0);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filtroBusca !== "" ||
      filtroAvaliacao !== "todas" ||
      filtroSerie !== "todas" ||
      filtroDisciplina !== "todas"
    );
  }, [filtroBusca, filtroAvaliacao, filtroSerie, filtroDisciplina]);

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar
        </button>
        <h1 className={styles.schoolTitle}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary-color)", flexShrink: 0 }}>
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {escola?.nome_escola}
        </h1>
        <span className={styles.inepBadge}>INEP: {escola?.codigo_inep}</span>
      </header>

      <div className={styles.dashboardWorkspace}>
        {/* Strip de Informações Gerais (Widgets) */}
        <div className={styles.infoStrip}>
          <div className={styles.infoWidget}>
            <div className={styles.infoWidgetIcon}>📊</div>
            <div className={styles.infoWidgetContent}>
              <span className={styles.infoWidgetValue}>{grupos.length}</span>
              <span className={styles.infoWidgetLabel}>Provas Únicas</span>
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

        {/* Action Bar (Barra de Ações para abrir Modais) */}
        <div className={styles.actionBar}>
          <div className={styles.actionBarLeft}>
            <button
              onClick={() => setIsFiltrosOpen(true)}
              className={`${styles.actionButton} ${hasActiveFilters ? styles.actionButtonActive : ""}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filtrar Provas
              {hasActiveFilters && <span className={styles.activeFilterIndicator} />}
            </button>

            <button onClick={() => setIsNotasOpen(true)} className={styles.actionButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Notas Lançadas
            </button>
          </div>

          <div className={styles.actionBarRight}>
            {canEdit && (
              <button
                onClick={() => setIsNovoLancamentoOpen(true)}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Novo Lançamento
              </button>
            )}
          </div>
        </div>

        {/* Navegação Rápida entre Provas Filtradas (Pills horizontais) */}
        {gruposFiltrados.length > 0 && (
          <div className={styles.pillsOuterWrapper}>
            <div className={styles.pillsContainer}>
              {gruposFiltrados.map((grupo, index) => (
                <button
                  key={grupo.chave}
                  className={`${styles.pill} ${selectedGrafico === index ? styles.pillActive : ""}`}
                  onClick={() => setSelectedGrafico(index)}
                  title={grupo.titulo}
                >
                  <span className={styles.pillTitle}>{grupo.avaliacao}</span>
                  <span className={styles.pillMeta}>
                    {grupo.serie} • {grupo.disciplina}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Display do Gráfico SVG */}
        <div className={styles.chartDisplayArea}>
          {resultados.length === 0 ? (
            <div className={styles.noDataState}>
              <p>📊 Nenhum resultado cadastrado para esta escola.</p>
              <small>Use o botão de "Novo Lançamento" acima para cadastrar a primeira nota.</small>
            </div>
          ) : gruposFiltrados.length === 0 ? (
            <div className={styles.noDataState}>
              <p>🔍 Nenhuma prova atende aos filtros atuais.</p>
              <button onClick={limparFiltros} className={styles.clearFiltersButton} style={{ margin: "16px auto 0" }}>
                Limpar filtros e ver tudo
              </button>
            </div>
          ) : (
            grupoAtual && (
              <GraficoDeBarras
                key={grupoAtual.chave}
                titulo={grupoAtual.titulo}
                data={grupoAtual.dados}
              />
            )
          )}
        </div>
      </div>

      {/* ==========================================================
          MODAL 1: FILTROS AVANÇADOS
          ========================================================== */}
      {isFiltrosOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsFiltrosOpen(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filtrar Provas
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsFiltrosOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalFormGroup}>
                <label className={styles.filterLabel} htmlFor="modal-busca">Buscar prova (termo livre)</label>
                <input
                  id="modal-busca"
                  type="text"
                  className={styles.filterInput}
                  placeholder="Ex: SAEB, Língua Portuguesa, 5º..."
                  value={filtroBusca}
                  onChange={(e) => {
                    setFiltroBusca(e.target.value);
                    setSelectedGrafico(0);
                  }}
                />
              </div>

              <div className={styles.modalFormGrid}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.filterLabel} htmlFor="modal-avaliacao">Avaliação</label>
                  <select
                    id="modal-avaliacao"
                    className={styles.filterSelect}
                    value={filtroAvaliacao}
                    onChange={(e) => {
                      setFiltroAvaliacao(e.target.value);
                      setSelectedGrafico(0);
                    }}
                  >
                    <option value="todas">Todas</option>
                    {opcoesFiltros.avaliacoes.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalFormGroup}>
                  <label className={styles.filterLabel} htmlFor="modal-serie">Série</label>
                  <select
                    id="modal-serie"
                    className={styles.filterSelect}
                    value={filtroSerie}
                    onChange={(e) => {
                      setFiltroSerie(e.target.value);
                      setSelectedGrafico(0);
                    }}
                  >
                    <option value="todas">Todas</option>
                    {opcoesFiltros.series.map((opcao) => (
                      <option key={opcao} value={opcao}>{opcao}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                <label className={styles.filterLabel} htmlFor="modal-disciplina">Disciplina</label>
                <select
                  id="modal-disciplina"
                  className={styles.filterSelect}
                  value={filtroDisciplina}
                  onChange={(e) => {
                    setFiltroDisciplina(e.target.value);
                    setSelectedGrafico(0);
                  }}
                >
                  <option value="todas">Todas</option>
                  {opcoesFiltros.disciplinas.map((opcao) => (
                    <option key={opcao} value={opcao}>{opcao}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.clearFiltersButton}
                onClick={limparFiltros}
                disabled={!hasActiveFilters}
              >
                Limpar Filtros
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setIsFiltrosOpen(false)}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 2: HISTÓRICO DE NOTAS
          ========================================================== */}
      {isNotasOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNotasOpen(false)}>
          <div className={`${styles.modalContainer} ${styles.modalContainerLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Histórico de Notas Lançadas ({resultados.length})
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsNotasOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Pesquisa interna no histórico */}
              <div className={styles.modalSearchWrapper}>
                <svg className={styles.modalSearchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className={styles.modalSearchInput}
                  placeholder="Pesquisar histórico por disciplina, ano, avaliação..."
                  value={buscaNotasModal}
                  onChange={(e) => setBuscaNotasModal(e.target.value)}
                />
              </div>

              {resultados.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma nota lançada nesta escola.</p>
              ) : notasFiltradasModal.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma nota corresponde à busca no histórico.</p>
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
                        {canEdit && <th style={{ textAlign: "center" }}>Ação</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {notasFiltradasModal.map((r) => (
                        <tr key={r.id} className={styles.tableRow}>
                          <td><span className={styles.tableBadge}>{r.avaliacao}</span></td>
                          <td className={styles.tableImportant}>{r.disciplina}</td>
                          <td>{r.serie}</td>
                          <td><strong>{r.ano}</strong></td>
                          <td>
                            <span className={styles.tableValueBadge}>
                              {r.valor_indice?.toFixed(2) || "N/A"}
                            </span>
                          </td>
                          {canEdit && (
                            <td style={{ textAlign: "center" }}>
                              <button
                                className={styles.tableDeleteButton}
                                onClick={() => handleDeleteResultado(r.id)}
                                disabled={loading}
                                title="Deletar lançamento"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsNotasOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 3: NOVO LANÇAMENTO (ADMIN APENAS)
          ========================================================== */}
      {isNovoLancamentoOpen && canEdit && (
        <div className={styles.modalOverlay} onClick={() => setIsNovoLancamentoOpen(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="12" y2="12" />
                </svg>
                Lançar Novo Resultado
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsNovoLancamentoOpen(false)}>✕</button>
            </div>
            <form
              onSubmit={(e) => {
                handleAddResultado(e);
                setIsNovoLancamentoOpen(false);
              }}
            >
              <div className={styles.modalBody}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.filterLabel} htmlFor="form-avaliacao">Nome da Avaliação</label>
                  <input
                    id="form-avaliacao"
                    type="text"
                    placeholder="Ex: SAEB, IDEPE, Simulado Municipal"
                    value={avaliacao}
                    onChange={(e) => setAvaliacao(e.target.value)}
                    className={styles.filterInput}
                    required
                  />
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.filterLabel} htmlFor="form-disciplina">Disciplina</label>
                  <input
                    id="form-disciplina"
                    type="text"
                    placeholder="Ex: Matemática, Língua Portuguesa"
                    value={disciplina}
                    onChange={(e) => setDisciplina(e.target.value)}
                    className={styles.filterInput}
                    required
                  />
                </div>

                <div className={styles.modalFormGrid} style={{ marginTop: "16px" }}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.filterLabel} htmlFor="form-ano">Ano</label>
                    <input
                      id="form-ano"
                      type="number"
                      placeholder="Ex: 2026"
                      value={ano}
                      onChange={(e) => setAno(e.target.value)}
                      className={styles.filterInput}
                      required
                    />
                  </div>

                  <div className={styles.modalFormGroup}>
                    <label className={styles.filterLabel} htmlFor="form-serie">Série</label>
                    <input
                      id="form-serie"
                      type="text"
                      placeholder="Ex: 5º Ano, 9º Ano"
                      value={serie}
                      onChange={(e) => setSerie(e.target.value)}
                      className={styles.filterInput}
                      required
                    />
                  </div>
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.filterLabel} htmlFor="form-valor">Valor do Índice / Nota</label>
                  <input
                    id="form-valor"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 6.42 ou 88.50"
                    value={valorIndice}
                    onChange={(e) => setValorIndice(e.target.value)}
                    className={styles.filterInput}
                    required
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsNovoLancamentoOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.btnPrimary}
                >
                  {loading ? "Salvando..." : "Confirmar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
