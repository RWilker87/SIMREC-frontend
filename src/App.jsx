// src/App.jsx

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard"; // Vamos criar este arquivo agora

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Tenta pegar a sessão atual (se o usuário já estiver logado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Ouve mudanças no estado de autenticação (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Limpa o "ouvinte" quando o componente é desmontado
    return () => subscription.unsubscribe();
  }, []); // O [] vazio faz com que isso rode apenas uma vez, quando o app carrega

  // MODIFICAÇÃO: Remova o <div className="container"> e use <></>
  return (
    <>
      {/* Se NÃO tiver sessão (usuário não logado), mostra o componente Auth.
        Se TIVER sessão (usuário logado), mostra o Dashboard.
      */}
      {!session ? (
        <Auth />
      ) : (
        // Passamos a sessão (que contém o ID do usuário) para o Dashboard
        <Dashboard key={session.user.id} session={session} />
      )}
    </>
  );
}

export default App;
