// SQL necessário no Supabase:
//
// -- Tabela de configuração de métricas por escola
// CREATE TABLE escola_config (
//   id BIGSERIAL PRIMARY KEY,
//   escola_id INT8 REFERENCES escolas(id) ON DELETE CASCADE,
//   tem_5ano BOOLEAN DEFAULT TRUE,
//   tem_9ano BOOLEAN DEFAULT TRUE,
//   tem_fluencia BOOLEAN DEFAULT TRUE,
//   updated_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(escola_id)
// );
//
// -- Tabela de metas (serie: '5', '9' ou '' para Fluência)
// CREATE TABLE metas (
//   id BIGSERIAL PRIMARY KEY,
//   escola_id INT8 REFERENCES escolas(id) ON DELETE CASCADE,
//   avaliacao TEXT CHECK (avaliacao IN ('IDEB', 'IDEP', 'Fluencia')),
//   serie TEXT NOT NULL DEFAULT '',
//   meta DECIMAL(5,2),
//   ano INT4 NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(escola_id, avaliacao, serie, ano)
// );

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./MetasEscolas.module.css";

const DEFAULT_CONFIG = { tem_2ano: true, tem_5ano: true, tem_9ano: true, tem_fluencia: true };

// ===================== ÍCONES =====================

const IconEscola = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconMeta = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconConfig = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconCalendario = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

// ===================== TOGGLE SWITCH =====================

const Toggle = ({ label, desc, checked, onChange }) => (
  <label className={styles.toggleRow}>
    <div className={styles.toggleInfo}>
      <span className={styles.toggleLabel}>{label}</span>
      {desc && <span className={styles.toggleDesc}>{desc}</span>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleThumb} />
    </button>
  </label>
);

// ===================== CAIXA DE META =====================

const MetaBox = ({ label, value, cor, ativa, max = 10, unit = "/ 10" }) => {
  const hasValue = value !== undefined && value !== null;
  return (
    <div className={`${styles.metaBox} ${styles[`metaBox_${cor}`]} ${!ativa ? styles.metaBoxDesativada : ""} ${ativa && !hasValue ? styles.metaBoxVazia : ""}`}>
      <span className={styles.metaBoxLabel}>{label}</span>
      <span className={styles.metaBoxValue}>
        {!ativa ? "—" : hasValue ? Number(value).toFixed(max > 10 ? 0 : 1) : "·"}
      </span>
      {ativa && hasValue && (
        <span className={styles.metaBoxUnit}>{unit}</span>
      )}
    </div>
  );
};

// ===================== COMPONENTE PRINCIPAL =====================

const normStr = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

export default function MetasEscolas() {
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
  const [escolas, setEscolas] = useState([]);
  const [metas, setMetas] = useState({});
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [escolaModal, setEscolaModal] = useState(null);
  const [formConfig, setFormConfig] = useState({ ...DEFAULT_CONFIG });
  const [formMetas, setFormMetas] = useState({
    IDEB_5: "", IDEP_5: "", IDEB_9: "", IDEP_9: "", Fluencia: "",
    SAEPE_5_LP: "", SAEPE_5_MAT: "", SAEB_5_LP: "", SAEB_5_MAT: "",
    SAEPE_9_LP: "", SAEPE_9_MAT: "", SAEB_9_LP: "", SAEB_9_MAT: "",
    SAEPE_2_LP: "", SAEPE_2_MAT: ""
  });

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => anoAtual + 1 - i);

  useEffect(() => {
    fetchData();
  }, [anoSelecionado]);

  const fetchData = async () => {
    setLoading(true);

    const [
      { data: escolasData },
      { data: metasData },
      { data: configsData },
    ] = await Promise.all([
      supabase.from("escolas").select("id, nome_escola, codigo_inep").order("nome_escola"),
      supabase.from("metas").select("*").eq("ano", anoSelecionado),
      supabase.from("escola_config").select("*"),
    ]);

    // Monta mapa de metas: { [escola_id]: { ... } }
    const metasMap = {};
    (metasData || []).forEach((m) => {
      if (!metasMap[m.escola_id]) metasMap[m.escola_id] = {};
      let chave = m.avaliacao;
      if (m.serie) {
        chave = `${m.avaliacao}_${m.serie}`;
        if (m.disciplina) {
          const disc = normStr(m.disciplina);
          if (disc.includes("port") || disc.includes("lp")) chave += "_LP";
          else if (disc.includes("mat")) chave += "_MAT";
        }
      }
      metasMap[m.escola_id][chave] = m.meta;
    });

    // Monta mapa de configurações: { [escola_id]: { tem_2ano, tem_5ano, tem_9ano, tem_fluencia } }
    const configsMap = {};
    (configsData || []).forEach((c) => {
      configsMap[c.escola_id] = {
        tem_2ano: c.tem_2ano ?? true,
        tem_5ano: c.tem_5ano ?? true,
        tem_9ano: c.tem_9ano ?? true,
        tem_fluencia: c.tem_fluencia ?? true,
      };
    });

    setEscolas(escolasData || []);
    setMetas(metasMap);
    setConfigs(configsMap);
    setLoading(false);
  };

  const getConfig = (escolaId) => configs[escolaId] ?? DEFAULT_CONFIG;

  const handleOpenModal = (escola) => {
    setEscolaModal(escola);
    const cfg = getConfig(escola.id);
    setFormConfig({ ...cfg });
    const em = metas[escola.id] || {};
    setFormMetas({
      IDEB_5: em.IDEB_5 !== undefined ? String(em.IDEB_5) : "",
      IDEP_5: em.IDEP_5 !== undefined ? String(em.IDEP_5) : "",
      IDEB_9: em.IDEB_9 !== undefined ? String(em.IDEB_9) : "",
      IDEP_9: em.IDEP_9 !== undefined ? String(em.IDEP_9) : "",
      Fluencia: em.Fluencia !== undefined ? String(em.Fluencia) : "",
      SAEPE_5_LP: em.SAEPE_5_LP !== undefined ? String(em.SAEPE_5_LP) : "",
      SAEPE_5_MAT: em.SAEPE_5_MAT !== undefined ? String(em.SAEPE_5_MAT) : "",
      SAEB_5_LP: em.SAEB_5_LP !== undefined ? String(em.SAEB_5_LP) : "",
      SAEB_5_MAT: em.SAEB_5_MAT !== undefined ? String(em.SAEB_5_MAT) : "",
      SAEPE_9_LP: em.SAEPE_9_LP !== undefined ? String(em.SAEPE_9_LP) : "",
      SAEPE_9_MAT: em.SAEPE_9_MAT !== undefined ? String(em.SAEPE_9_MAT) : "",
      SAEB_9_LP: em.SAEB_9_LP !== undefined ? String(em.SAEB_9_LP) : "",
      SAEB_9_MAT: em.SAEB_9_MAT !== undefined ? String(em.SAEB_9_MAT) : "",
      SAEPE_2_LP: em.SAEPE_2_LP !== undefined ? String(em.SAEPE_2_LP) : "",
      SAEPE_2_MAT: em.SAEPE_2_MAT !== undefined ? String(em.SAEPE_2_MAT) : ""
    });
    setModalOpen(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!escolaModal) return;
    setSaving(true);

    try {
      // 1. Salvar configuração da escola
      const { error: configErr } = await supabase
        .from("escola_config")
        .upsert({ escola_id: escolaModal.id, ...formConfig }, { onConflict: "escola_id" });
      if (configErr) throw configErr;

      // 2. Montar upserts de metas apenas para métricas ativas com valor preenchido
      const upserts = [];

      if (formConfig.tem_2ano) {
        if (formMetas.SAEPE_2_LP !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEPE", serie: "2", disciplina: "Língua Portuguesa", meta: parseFloat(formMetas.SAEPE_2_LP), ano: anoSelecionado });
        if (formMetas.SAEPE_2_MAT !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEPE", serie: "2", disciplina: "Matemática", meta: parseFloat(formMetas.SAEPE_2_MAT), ano: anoSelecionado });
      }

      if (formConfig.tem_5ano) {
        if (formMetas.IDEB_5 !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "IDEB", serie: "5", disciplina: "", meta: parseFloat(formMetas.IDEB_5), ano: anoSelecionado });
        if (formMetas.IDEP_5 !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "IDEP", serie: "5", disciplina: "", meta: parseFloat(formMetas.IDEP_5), ano: anoSelecionado });
        if (formMetas.SAEPE_5_LP !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEPE", serie: "5", disciplina: "Língua Portuguesa", meta: parseFloat(formMetas.SAEPE_5_LP), ano: anoSelecionado });
        if (formMetas.SAEPE_5_MAT !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEPE", serie: "5", disciplina: "Matemática", meta: parseFloat(formMetas.SAEPE_5_MAT), ano: anoSelecionado });
        if (formMetas.SAEB_5_LP !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEB", serie: "5", disciplina: "Língua Portuguesa", meta: parseFloat(formMetas.SAEB_5_LP), ano: anoSelecionado });
        if (formMetas.SAEB_5_MAT !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEB", serie: "5", disciplina: "Matemática", meta: parseFloat(formMetas.SAEB_5_MAT), ano: anoSelecionado });
      }

      if (formConfig.tem_9ano) {
        if (formMetas.IDEB_9 !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "IDEB", serie: "9", disciplina: "", meta: parseFloat(formMetas.IDEB_9), ano: anoSelecionado });
        if (formMetas.IDEP_9 !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "IDEP", serie: "9", disciplina: "", meta: parseFloat(formMetas.IDEP_9), ano: anoSelecionado });
        if (formMetas.SAEPE_9_LP !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEPE", serie: "9", disciplina: "Língua Portuguesa", meta: parseFloat(formMetas.SAEPE_9_LP), ano: anoSelecionado });
        if (formMetas.SAEPE_9_MAT !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEPE", serie: "9", disciplina: "Matemática", meta: parseFloat(formMetas.SAEPE_9_MAT), ano: anoSelecionado });
        if (formMetas.SAEB_9_LP !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEB", serie: "9", disciplina: "Língua Portuguesa", meta: parseFloat(formMetas.SAEB_9_LP), ano: anoSelecionado });
        if (formMetas.SAEB_9_MAT !== "")
          upserts.push({ escola_id: escolaModal.id, avaliacao: "SAEB", serie: "9", disciplina: "Matemática", meta: parseFloat(formMetas.SAEB_9_MAT), ano: anoSelecionado });
      }

      if (formConfig.tem_fluencia && formMetas.Fluencia !== "") {
        upserts.push({ escola_id: escolaModal.id, avaliacao: "Fluencia", serie: "", disciplina: "", meta: parseFloat(formMetas.Fluencia), ano: anoSelecionado });
      }

      if (upserts.length > 0) {
        const { error: metasErr } = await supabase
          .from("metas")
          .upsert(upserts, { onConflict: "escola_id,avaliacao,serie,disciplina,ano" });
        if (metasErr) throw metasErr;
      }

      // 3. Atualizar estado local
      setConfigs((prev) => ({ ...prev, [escolaModal.id]: { ...formConfig } }));

      const novasMetas = {};
      upserts.forEach((u) => {
        let chave = u.avaliacao;
        if (u.serie) {
          chave = `${u.avaliacao}_${u.serie}`;
          if (u.disciplina) {
            const disc = normStr(u.disciplina);
            if (disc.includes("port") || disc.includes("lp")) chave += "_LP";
            else if (disc.includes("mat")) chave += "_MAT";
          }
        }
        novasMetas[chave] = u.meta;
      });
      setMetas((prev) => ({
        ...prev,
        [escolaModal.id]: { ...(prev[escolaModal.id] || {}), ...novasMetas },
      }));

      setModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const calcProgresso = (escolaId) => {
    const cfg = getConfig(escolaId);
    const em = metas[escolaId] || {};
    let total = 0, definidas = 0;

    if (cfg.tem_2ano) {
      total += 3;
      if (em.SAEPE_2_LP !== undefined) definidas++;
      if (em.SAEPE_2_MAT !== undefined) definidas++;
      if (em.Fluencia !== undefined) definidas++;
    }

    if (cfg.tem_5ano) {
      total += 6;
      if (em.IDEB_5 !== undefined) definidas++;
      if (em.IDEP_5 !== undefined) definidas++;
      if (em.SAEPE_5_LP !== undefined) definidas++;
      if (em.SAEPE_5_MAT !== undefined) definidas++;
      if (em.SAEB_5_LP !== undefined) definidas++;
      if (em.SAEB_5_MAT !== undefined) definidas++;
    }

    if (cfg.tem_9ano) {
      total += 6;
      if (em.IDEB_9 !== undefined) definidas++;
      if (em.IDEP_9 !== undefined) definidas++;
      if (em.SAEPE_9_LP !== undefined) definidas++;
      if (em.SAEPE_9_MAT !== undefined) definidas++;
      if (em.SAEB_9_LP !== undefined) definidas++;
      if (em.SAEB_9_MAT !== undefined) definidas++;
    }

    return { total, definidas };
  };

  const totalCompletas = escolas.filter((e) => {
    const { total, definidas } = calcProgresso(e.id);
    return total > 0 && definidas === total;
  }).length;

  // ===================== RENDER =====================

  return (
    <div className={styles.container}>
      {/* CABEÇALHO */}
      <div className={styles.actionBar}>
        <div className={styles.titleWithIcon}>
          <div className={styles.titleIconWrapper}><IconMeta /></div>
          <div>
            <h1>Metas por Escola</h1>
            <p className={styles.subtitle}>
              Configure quais avaliações cada escola possui e defina as metas anuais
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>Escolas completas</span>
            <span className={styles.progressValue}>{totalCompletas} / {escolas.length}</span>
          </div>
          <div className={styles.yearSelectorWrapper}>
            <IconCalendario />
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className={styles.yearSelect}
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LEGENDA */}
      <div className={styles.legendRow}>
        <div className={`${styles.legendCard} ${styles.legend_vermelho}`}>
          <span className={styles.legendLabel}>IDEB</span>
          <span className={styles.legendDesc}>5° e 9° ano · Escala 0–10</span>
        </div>
        <div className={`${styles.legendCard} ${styles.legend_ambar}`}>
          <span className={styles.legendLabel}>IDEP</span>
          <span className={styles.legendDesc}>5° e 9° ano · Escala 0–10</span>
        </div>
        <div className={`${styles.legendCard} ${styles.legend_verde}`}>
          <span className={styles.legendLabel}>Fluência</span>
          <span className={styles.legendDesc}>Escola inteira · Escala 0–10</span>
        </div>
        <div className={`${styles.legendCard} ${styles.legend_azul}`}>
          <span className={styles.legendLabel}>SAEPE</span>
          <span className={styles.legendDesc}>2º (0–1000) · 5º/9º (0–500)</span>
        </div>
        <div className={`${styles.legendCard} ${styles.legend_azul}`}>
          <span className={styles.legendLabel}>SAEB</span>
          <span className={styles.legendDesc}>5° e 9° ano · Escala 0–500</span>
        </div>
        <div className={styles.legendNote}>
          <span>Métricas desativadas aparecem acinzentadas por escola</span>
        </div>
      </div>

      {/* LISTA DE ESCOLAS */}
      {loading ? (
        <div className={styles.loadingState}><p>Carregando escolas...</p></div>
      ) : escolas.length === 0 ? (
        <div className={styles.noDataState}>
          <p>Nenhuma escola cadastrada.</p>
          <small>Cadastre escolas em "Gerenciar Escolas" primeiro.</small>
        </div>
      ) : (
        <div className={styles.schoolList}>
          {escolas.map((escola) => {
            const cfg = getConfig(escola.id);
            const em = metas[escola.id] || {};
            const { total, definidas } = calcProgresso(escola.id);
            const statusClass =
              total === 0 ? styles.semMetrica :
              definidas === total ? styles.completo :
              definidas > 0 ? styles.parcial :
              styles.semMeta;
            const statusText =
              total === 0 ? "Sem métricas" :
              definidas === total ? "Completo" :
              definidas > 0 ? `${definidas}/${total} metas` :
              "Sem metas";

            return (
              <div key={escola.id} className={styles.schoolRow}>
                {/* Info da escola */}
                <div className={styles.schoolInfo}>
                  <div className={styles.schoolIconWrapper}><IconEscola /></div>
                  <div className={styles.schoolTexts}>
                    <h3 className={styles.schoolName}>{escola.nome_escola}</h3>
                    <span className={styles.inepTag}>INEP: {escola.codigo_inep}</span>
                  </div>
                </div>

                {/* Grupos de métricas */}
                <div className={styles.metricsContainer}>
                  {/* 2° Ano */}
                  <div className={`${styles.gradeGroup} ${!cfg.tem_2ano ? styles.gradeGroupDesativado : ""}`}>
                    <span className={styles.gradeGroupLabel}>2° Ano</span>
                    <div className={styles.gradeBoxes}>
                      <MetaBox label="SAEPE LP" value={em.SAEPE_2_LP} cor="azul" ativa={cfg.tem_2ano} max={1000} unit="pts" />
                      <MetaBox label="SAEPE MT" value={em.SAEPE_2_MAT} cor="azul" ativa={cfg.tem_2ano} max={1000} unit="pts" />
                      <MetaBox label="Fluência" value={em.Fluencia} cor="verde" ativa={cfg.tem_2ano} />
                    </div>
                  </div>

                  <div className={styles.groupDivider} />

                  {/* 5° Ano */}
                  <div className={`${styles.gradeGroup} ${!cfg.tem_5ano ? styles.gradeGroupDesativado : ""}`}>
                    <span className={styles.gradeGroupLabel}>5° Ano</span>
                    <div className={styles.gradeBoxes}>
                      <MetaBox label="IDEB" value={em.IDEB_5} cor="vermelho" ativa={cfg.tem_5ano} />
                      <MetaBox label="IDEP" value={em.IDEP_5} cor="ambar" ativa={cfg.tem_5ano} />
                      <MetaBox label="SAEPE LP" value={em.SAEPE_5_LP} cor="azul" ativa={cfg.tem_5ano} max={500} unit="pts" />
                      <MetaBox label="SAEPE MT" value={em.SAEPE_5_MAT} cor="azul" ativa={cfg.tem_5ano} max={500} unit="pts" />
                      <MetaBox label="SAEB LP" value={em.SAEB_5_LP} cor="azul" ativa={cfg.tem_5ano} max={500} unit="pts" />
                      <MetaBox label="SAEB MT" value={em.SAEB_5_MAT} cor="azul" ativa={cfg.tem_5ano} max={500} unit="pts" />
                    </div>
                  </div>

                  <div className={styles.groupDivider} />

                  {/* 9° Ano */}
                  <div className={`${styles.gradeGroup} ${!cfg.tem_9ano ? styles.gradeGroupDesativado : ""}`}>
                    <span className={styles.gradeGroupLabel}>9° Ano</span>
                    <div className={styles.gradeBoxes}>
                      <MetaBox label="IDEB" value={em.IDEB_9} cor="vermelho" ativa={cfg.tem_9ano} />
                      <MetaBox label="IDEP" value={em.IDEP_9} cor="ambar" ativa={cfg.tem_9ano} />
                      <MetaBox label="SAEPE LP" value={em.SAEPE_9_LP} cor="azul" ativa={cfg.tem_9ano} max={500} unit="pts" />
                      <MetaBox label="SAEPE MT" value={em.SAEPE_9_MAT} cor="azul" ativa={cfg.tem_9ano} max={500} unit="pts" />
                      <MetaBox label="SAEB LP" value={em.SAEB_9_LP} cor="azul" ativa={cfg.tem_9ano} max={500} unit="pts" />
                      <MetaBox label="SAEB MT" value={em.SAEB_9_MAT} cor="azul" ativa={cfg.tem_9ano} max={500} unit="pts" />
                    </div>
                  </div>


                </div>

                {/* Ações */}
                <div className={styles.rowActions}>
                  <span className={`${styles.statusBadge} ${statusClass}`}>{statusText}</span>
                  <button className={styles.configButton} onClick={() => handleOpenModal(escola)}>
                    <IconConfig />
                    Configurar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && escolaModal && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalIconWrapper}><IconMeta /></div>
                <div>
                  <h3>Configurar Metas</h3>
                  <p className={styles.modalSubtitle}>{escolaModal.nome_escola} · {anoSelecionado}</p>
                </div>
              </div>
              <button className={styles.modalCloseButton} onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className={styles.modalBody}>

                {/* ——— SEÇÃO 1: Métricas ativas ——— */}
                <div className={styles.modalSection}>
                  <p className={styles.sectionTitle}>Métricas Ativas</p>
                  <p className={styles.sectionHint}>
                    Ative apenas as avaliações que esta escola possui.
                  </p>
                  <div className={styles.toggleList}>
                    <Toggle
                      label="2° Ano"
                      desc="SAEPE e Fluência do 2° ano"
                      checked={formConfig.tem_2ano}
                      onChange={(v) => setFormConfig((p) => ({ ...p, tem_2ano: v, tem_fluencia: v }))}
                    />
                    <Toggle
                      label="5° Ano"
                      desc="IDEB, IDEP, SAEPE e SAEB do 5° ano"
                      checked={formConfig.tem_5ano}
                      onChange={(v) => setFormConfig((p) => ({ ...p, tem_5ano: v }))}
                    />
                    <Toggle
                      label="9° Ano"
                      desc="IDEB, IDEP, SAEPE e SAEB do 9° ano"
                      checked={formConfig.tem_9ano}
                      onChange={(v) => setFormConfig((p) => ({ ...p, tem_9ano: v }))}
                    />
                  </div>
                </div>

                {/* ——— SEÇÃO 2: Metas ——— */}
                {(formConfig.tem_2ano || formConfig.tem_5ano || formConfig.tem_9ano) && (
                  <div className={styles.modalSection}>
                    <p className={styles.sectionTitle}>Metas para {anoSelecionado}</p>
                    <p className={styles.sectionHint}>
                      Deixe em branco para manter o valor anterior.
                    </p>

                    {/* 2° Ano inputs */}
                    {formConfig.tem_2ano && (
                      <div className={styles.gradeInputGroup}>
                        <div className={styles.gradeInputHeader}>
                          <span className={`${styles.gradeInputBadge} ${styles.gradeInputBadgeAzul}`}>2° Ano</span>
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="saepe_2_lp"
                            label="SAEPE LP"
                            cor="azul"
                            max={1000}
                            step={1}
                            value={formMetas.SAEPE_2_LP}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEPE_2_LP: v }))}
                          />
                          <MetaInput
                            id="saepe_2_mat"
                            label="SAEPE MT"
                            cor="azul"
                            max={1000}
                            step={1}
                            value={formMetas.SAEPE_2_MAT}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEPE_2_MAT: v }))}
                          />
                        </div>
                        <div className={styles.inputRow} style={{ borderTop: "1.5px solid #f1f5f9" }}>
                          <MetaInput
                            id="fluencia"
                            label="Meta de Fluência"
                            cor="verde"
                            max={10}
                            step={0.1}
                            value={formMetas.Fluencia}
                            onChange={(v) => setFormMetas((p) => ({ ...p, Fluencia: v }))}
                          />
                        </div>
                      </div>
                    )}

                    {/* 5° Ano inputs */}
                    {formConfig.tem_5ano && (
                      <div className={styles.gradeInputGroup}>
                        <div className={styles.gradeInputHeader}>
                          <span className={styles.gradeInputBadge}>5° Ano</span>
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="ideb5"
                            label="IDEB"
                            cor="vermelho"
                            max={10}
                            step={0.1}
                            value={formMetas.IDEB_5}
                            onChange={(v) => setFormMetas((p) => ({ ...p, IDEB_5: v }))}
                          />
                          <MetaInput
                            id="idep5"
                            label="IDEP"
                            cor="ambar"
                            max={10}
                            step={0.1}
                            value={formMetas.IDEP_5}
                            onChange={(v) => setFormMetas((p) => ({ ...p, IDEP_5: v }))}
                          />
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="saepe_5_lp"
                            label="SAEPE LP"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEPE_5_LP}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEPE_5_LP: v }))}
                          />
                          <MetaInput
                            id="saepe_5_mat"
                            label="SAEPE MT"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEPE_5_MAT}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEPE_5_MAT: v }))}
                          />
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="saeb_5_lp"
                            label="SAEB LP"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEB_5_LP}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEB_5_LP: v }))}
                          />
                          <MetaInput
                            id="saeb_5_mat"
                            label="SAEB MT"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEB_5_MAT}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEB_5_MAT: v }))}
                          />
                        </div>
                      </div>
                    )}

                    {/* 9° Ano inputs */}
                    {formConfig.tem_9ano && (
                      <div className={styles.gradeInputGroup}>
                        <div className={styles.gradeInputHeader}>
                          <span className={styles.gradeInputBadge}>9° Ano</span>
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="ideb9"
                            label="IDEB"
                            cor="vermelho"
                            max={10}
                            step={0.1}
                            value={formMetas.IDEB_9}
                            onChange={(v) => setFormMetas((p) => ({ ...p, IDEB_9: v }))}
                          />
                          <MetaInput
                            id="idep9"
                            label="IDEP"
                            cor="ambar"
                            max={10}
                            step={0.1}
                            value={formMetas.IDEP_9}
                            onChange={(v) => setFormMetas((p) => ({ ...p, IDEP_9: v }))}
                          />
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="saepe_9_lp"
                            label="SAEPE LP"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEPE_9_LP}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEPE_9_LP: v }))}
                          />
                          <MetaInput
                            id="saepe_9_mat"
                            label="SAEPE MT"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEPE_9_MAT}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEPE_9_MAT: v }))}
                          />
                        </div>
                        <div className={styles.inputRow}>
                          <MetaInput
                            id="saeb_9_lp"
                            label="SAEB LP"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEB_9_LP}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEB_9_LP: v }))}
                          />
                          <MetaInput
                            id="saeb_9_mat"
                            label="SAEB MT"
                            cor="azul"
                            max={500}
                            step={1}
                            value={formMetas.SAEB_9_MAT}
                            onChange={(v) => setFormMetas((p) => ({ ...p, SAEB_9_MAT: v }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!formConfig.tem_2ano && !formConfig.tem_5ano && !formConfig.tem_9ano && (
                  <div className={styles.allDisabledWarning}>
                    Todas as métricas estão desativadas. Ative pelo menos uma acima.
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className={styles.btnPrimary}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== INPUT DE META =====================

function MetaInput({ id, label, cor, max, step, value, onChange, fullWidth }) {
  const pct = value !== "" ? Math.min(100, (parseFloat(value) / max) * 100) : 0;

  return (
    <div className={`${styles.metaInputGroup} ${fullWidth ? styles.metaInputFull : ""}`}>
      <label className={`${styles.metaInputLabel} ${styles[`label_${cor}`]}`} htmlFor={id}>
        {label}
        <span className={styles.metaInputRange}>0 – {max}</span>
      </label>
      <input
        id={id}
        type="number"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Ex: ${max === 1000 ? "750" : max === 500 ? "275" : "6.5"}`}
        className={`${styles.metaInput} ${styles[`metaInput_${cor}`]}`}
      />
      {value !== "" && (
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${styles[`progressFill_${cor}`]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
