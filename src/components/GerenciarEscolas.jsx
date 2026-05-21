import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./GerenciarEscolas.module.css";

export default function GerenciarEscolas({ onSelecionarEscola }) {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nomeEscola, setNomeEscola] = useState("");
  const [emailEscola, setEmailEscola] = useState("");
  const [senhaEscola, setSenhaEscola] = useState("");
  const [codigoInep, setCodigoInep] = useState("");

  const [isCadastroOpen, setIsCadastroOpen] = useState(false);
  const [isEdicaoOpen, setIsEdicaoOpen] = useState(false);
  const [escolaParaEditar, setEscolaParaEditar] = useState(null);
  const [editNomeEscola, setEditNomeEscola] = useState("");
  const [editCodigoInep, setEditCodigoInep] = useState("");

  const fetchEscolas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("escolas")
      .select("id, nome_escola, codigo_inep")
      .order("created_at", { ascending: false });

    if (!error) {
      setEscolas(data || []);
    } else {
      alert("Erro ao buscar escolas: " + error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEscolas();
  }, []);

  const handleAddEscola = async (e) => {
    e.preventDefault();
    if (!nomeEscola || !emailEscola || !senhaEscola || !codigoInep) {
      alert("Por favor, preencha todos os campos, incluindo o Código INEP.");
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("criar-escola", {
        body: {
          _nome_escola: nomeEscola.trim(),
          _email: emailEscola.trim(),
          _password: senhaEscola,
          _codigo_inep: codigoInep.trim(),
        },
      });
      if (error) throw error;
      alert("Escola e usuário criados com sucesso!");
      setNomeEscola("");
      setEmailEscola("");
      setSenhaEscola("");
      setCodigoInep("");
      setIsCadastroOpen(false); // Fecha o modal após sucesso
      fetchEscolas();
    } catch (error) {
      alert("Erro: " + (error.context?.error?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdicao = (escola) => {
    setEscolaParaEditar(escola);
    setEditNomeEscola(escola.nome_escola);
    setEditCodigoInep(escola.codigo_inep);
    setIsEdicaoOpen(true);
  };

  const handleEditEscola = async (e) => {
    e.preventDefault();
    if (!editNomeEscola || !editCodigoInep) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from("escolas")
        .update({
          nome_escola: editNomeEscola.trim(),
          codigo_inep: editCodigoInep.trim(),
        })
        .eq("id", escolaParaEditar.id);

      if (error) throw error;
      alert("Escola atualizada com sucesso!");
      setIsEdicaoOpen(false);
      setEscolaParaEditar(null);
      fetchEscolas();
    } catch (error) {
      alert("Erro ao editar escola: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEscola = async (escolaId) => {

    if (!window.confirm("Tem certeza que deseja deletar esta escola e todos os seus vínculos?")) {
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from("escolas")
        .delete()
        .eq("id", escolaId);
      if (error) throw error;
      setEscolas(escolas.filter((escola) => escola.id !== escolaId));
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Barra de Ações Superior */}
      <div className={styles.actionBar}>
        <div className={styles.titleGroup}>
          <h1>Gerenciar Escolas</h1>
          <span className={styles.schoolCounter}>
            {escolas.length} escola{escolas.length !== 1 ? "s" : ""} cadastrada{escolas.length !== 1 ? "s" : ""}
          </span>
        </div>
        
        <button
          onClick={() => setIsCadastroOpen(true)}
          className={styles.addButtonMain}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Cadastrar Escola
        </button>
      </div>

      {/* Grid de Cards ou Empty/Loading States */}
      {loading && escolas.length === 0 ? (
        <div className={styles.loadingState}>
          <p>Carregando escolas...</p>
        </div>
      ) : escolas.length === 0 ? (
        <div className={styles.noDataState}>
          <p>🏫 Nenhuma escola cadastrada no momento.</p>
          <small>Use o botão de "Cadastrar Escola" acima para começar.</small>
        </div>
      ) : (
        <div className={styles.schoolGrid}>
          {escolas.map((escola) => (
            <div
              key={escola.id}
              className={styles.schoolCard}
              onClick={() => onSelecionarEscola(escola)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.schoolIconWrapper}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span className={styles.inepTag}>INEP: {escola.codigo_inep}</span>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.schoolCardName}>{escola.nome_escola}</h3>
              </div>

              <div
                className={styles.cardActions}
                onClick={(e) => e.stopPropagation()} // Impede que o clique no botão abra os detalhes da escola
              >
                <button
                  onClick={() => onSelecionarEscola(escola)}
                  className={styles.detailsButton}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Resultados
                </button>

                <div className={styles.adminActions}>
                  <button
                    onClick={() => handleOpenEdicao(escola)}
                    className={styles.editButton}
                    title="Editar escola"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Editar
                  </button>
                  
                  <button
                    onClick={() => handleDeleteEscola(escola.id)}
                    className={styles.deleteButton}
                    title="Deletar escola"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================================
          MODAL DE CADASTRO DE ESCOLA
          ========================================================== */}
      {isCadastroOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCadastroOpen(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Cadastrar Nova Escola
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsCadastroOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddEscola}>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.inputLabel} htmlFor="cad-nome">Nome da Escola</label>
                  <input
                    id="cad-nome"
                    type="text"
                    placeholder="Ex: Escola Municipal Maria das Dores"
                    value={nomeEscola}
                    onChange={(e) => setNomeEscola(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.inputLabel} htmlFor="cad-inep">Código INEP</label>
                  <input
                    id="cad-inep"
                    type="text"
                    placeholder="Ex: 26012345"
                    value={codigoInep}
                    onChange={(e) => setCodigoInep(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.inputLabel} htmlFor="cad-email">Email de Acesso (Login do Gestor)</label>
                  <input
                    id="cad-email"
                    type="email"
                    placeholder="Ex: gestao.mariadoores@edu.com"
                    value={emailEscola}
                    onChange={(e) => setEmailEscola(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.inputLabel} htmlFor="cad-senha">Senha de Acesso</label>
                  <input
                    id="cad-senha"
                    type="password"
                    placeholder="Defina uma senha de acesso segura"
                    value={senhaEscola}
                    onChange={(e) => setSenhaEscola(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsCadastroOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.btnPrimary}
                >
                  {loading ? "Salvando..." : "Confirmar Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL DE EDIÇÃO DE ESCOLA
          ========================================================== */}
      {isEdicaoOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsEdicaoOpen(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Editar Escola
              </h3>
              <button className={styles.modalCloseButton} onClick={() => setIsEdicaoOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleEditEscola}>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.inputLabel} htmlFor="edit-nome">Nome da Escola</label>
                  <input
                    id="edit-nome"
                    type="text"
                    placeholder="Ex: Escola Municipal Maria das Dores"
                    value={editNomeEscola}
                    onChange={(e) => setEditNomeEscola(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "16px" }}>
                  <label className={styles.inputLabel} htmlFor="edit-inep">Código INEP</label>
                  <input
                    id="edit-inep"
                    type="text"
                    placeholder="Ex: 26012345"
                    value={editCodigoInep}
                    onChange={(e) => setEditCodigoInep(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.modalFormGroup} style={{ marginTop: "20px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "12px", padding: "14px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--secondary-hover)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Credenciais de Acesso (E-mail/Senha)
                  </p>
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4", fontFamily: "var(--font-body)" }}>
                    Para alterar o e-mail de acesso ou a senha desta escola, você pode fazer isso de forma direta e segura no painel do <strong>Supabase Auth</strong> ou rodar o script no <strong>SQL Editor</strong> fornecido pelo assistente para resetar senhas em lote de forma instantânea.
                  </p>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsEdicaoOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.btnPrimary}
                >
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

