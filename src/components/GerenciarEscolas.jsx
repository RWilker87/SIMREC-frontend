import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./GerenciarEscolas.module.css";

export default function GerenciarEscolas() {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nomeEscola, setNomeEscola] = useState("");
  const [emailEscola, setEmailEscola] = useState("");
  const [senhaEscola, setSenhaEscola] = useState("");
  // 1. ADICIONAR NOVO ESTADO
  const [codigoInep, setCodigoInep] = useState("");

  const fetchEscolas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("escolas")
      .select("id, nome_escola, codigo_inep")
      .order("nome_escola", { ascending: true });

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
    e.preventDefault();
    // 2. ATUALIZAR VALIDAÇÃO
    if (!nomeEscola || !emailEscola || !senhaEscola || !codigoInep) {
      alert("Por favor, preencha todos os campos, incluindo o Código INEP.");
      return;
    }

    try {
      setLoading(true);

      // 3. ATUALIZAR O CORPO (BODY) DA REQUISIÇÃO
      const { data, error } = await supabase.functions.invoke("criar-escola", {
        body: {
          _nome_escola: nomeEscola,
          _email: emailEscola,
          _password: senhaEscola,
          _codigo_inep: codigoInep, // <-- ADICIONADO
        },
      });

      if (error) throw error;

      alert("Escola e usuário criados com sucesso!");

      // 4. LIMPAR O NOVO CAMPO
      setNomeEscola("");
      setEmailEscola("");
      setSenhaEscola("");
      setCodigoInep(""); // <-- ADICIONADO
      fetchEscolas();
    } catch (error) {
      // Corrigido para mostrar o erro corretamente
      alert("Erro: " + (error.context?.error?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEscola = async (escolaId) => {
    // (Lógica de deletar)
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
      <h3>Gerenciamento de Unidades Escolares</h3>
      <form onSubmit={handleAddEscola} className={styles.form}>
        <h4>Cadastrar Nova Escola (e seu Login)</h4>
        <input
          type="text"
          placeholder="Nome da nova escola"
          value={nomeEscola}
          onChange={(e) => setNomeEscola(e.target.value)}
          className={styles.input}
        />

        {/* 5. ADICIONAR ESTE NOVO INPUT */}
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

      <h4>Escolas Cadastradas:</h4>
      {loading && <p>Carregando lista...</p>}
      <ul className={styles.list}>
        {escolas.length > 0
          ? escolas.map((escola) => (
              <li key={escola.id} className={styles.listItem}>
                <span>
                  {escola.nome_escola} (INEP: {escola.codigo_inep})
                </span>
                <button
                  onClick={() => handleDeleteEscola(escola.id)}
                  className={styles.deleteButton}
                  disabled={loading}
                >
                  Deletar
                </button>
              </li>
            ))
          : !loading && <p>Nenhuma escola cadastrada ainda.</p>}
      </ul>
    </div>
  );
}
