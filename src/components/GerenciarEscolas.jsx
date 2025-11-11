import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./GerenciarEscolas.module.css";
// Importar os estilos do painel para usar o grid de 2 colunas
import painelStyles from "./PainelPrincipal.module.css";

// 1. Receber a nova prop "onSelecionarEscola"
export default function GerenciarEscolas({ onSelecionarEscola }) {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nomeEscola, setNomeEscola] = useState("");
  const [emailEscola, setEmailEscola] = useState("");
  const [senhaEscola, setSenhaEscola] = useState("");
  const [codigoInep, setCodigoInep] = useState("");

  const fetchEscolas = async () => {
    // ... (função igual)
    setLoading(true);
    const { data, error } = await supabase
      .from("escolas")
      .select("id, nome_escola, codigo_inep")
      .order("created_at", { ascending: false });

    if (!error) {
      setEscolas(data);
    } else {
      alert("Erro ao buscar escolas: " + error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEscolas();
  }, []);

  const handleAddEscola = async (e) => {
    // ... (função igual)
    e.preventDefault();
    if (!nomeEscola || !emailEscola || !senhaEscola || !codigoInep) {
      alert("Por favor, preencha todos os campos, incluindo o Código INEP.");
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("criar-escola", {
        body: {
          _nome_escola: nomeEscola,
          _email: emailEscola,
          _password: senhaEscola,
          _codigo_inep: codigoInep,
        },
      });
      if (error) throw error;
      alert("Escola e usuário criados com sucesso!");
      setNomeEscola("");
      setEmailEscola("");
      setSenhaEscola("");
      setCodigoInep("");
      fetchEscolas();
    } catch (error) {
      alert("Erro: " + (error.context?.error?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEscola = async (escolaId) => {
    // ... (função igual)
    if (!window.confirm("Tem certeza que deseja deletar esta escola?")) {
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
      <h1>Gerenciar Escolas</h1>

      {/* 2. Usar o grid de 2 colunas do PainelPrincipal */}
      <div className={painelStyles.contentRow}>
        {/* Card 1: Formulário de Cadastro */}
        <form onSubmit={handleAddEscola} className={styles.cardForm}>
          <h3>Cadastrar Nova Escola</h3>
          {/* ... (inputs do formulário iguais) */}
          <input
            type="text"
            placeholder="Nome da nova escola"
            value={nomeEscola}
            onChange={(e) => setNomeEscola(e.target.value)}
            className={styles.input}
          />
          <input
            type="text"
            placeholder="Código INEP da escola"
            value={codigoInep}
            onChange={(e) => setCodigoInep(e.target.value)}
            className={styles.input}
          />
          <input
            type="email"
            placeholder="Email de login da escola"
            value={emailEscola}
            onChange={(e) => setEmailEscola(e.target.value)}
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Senha de login da escola"
            value={senhaEscola}
            onChange={(e) => setSenhaEscola(e.target.value)}
            className={styles.input}
          />
          <button type="submit" disabled={loading} className={styles.addButton}>
            {loading ? "Salvando..." : "Criar Escola e Login"}
          </button>
        </form>

        {/* Card 2: Lista de Escolas */}
        <div className={styles.cardList}>
          <h3>Escolas Cadastradas</h3>
          {loading && <p>Carregando lista...</p>}
          <ul className={styles.list}>
            {escolas.length > 0
              ? escolas.map((escola) => (
                  <li key={escola.id} className={styles.listItem}>
                    <span>
                      <strong>{escola.nome_escola}</strong>
                      <small>INEP: {escola.codigo_inep}</small>
                    </span>
                    {/* 3. GRUPO DE BOTÕES ATUALIZADO */}
                    <div className={styles.buttonGroup}>
                      <button
                        onClick={() => onSelecionarEscola(escola)} // Chama a prop
                        className={styles.detailsButton} // Novo botão
                        disabled={loading}
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => handleDeleteEscola(escola.id)}
                        className={styles.deleteButton}
                        disabled={loading}
                      >
                        Deletar
                      </button>
                    </div>
                  </li>
                ))
              : !loading && <p>Nenhuma escola cadastrada ainda.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
