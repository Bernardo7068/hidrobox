import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import api from './api';

function App() {
    const [user, setUser] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const userSalvo = sessionStorage.getItem('user');
        
        if (userSalvo) {
            setUser(JSON.parse(userSalvo)); // Renderiza rápido (cache visual)
        }

        if (token) {
            // Sincroniza em pano de fundo com o servidor para garantir permissões atualizadas
            api.get('/me')
                .then(res => {
                    if (res.data && res.data.user) {
                        sessionStorage.setItem('user', JSON.stringify(res.data.user));
                        setUser(res.data.user);
                    }
                })
                .catch(() => {
                    // Se o token for inválido, limpa a sessão
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    setUser(null);
                })
                .finally(() => setCarregando(false));
        } else {
            setCarregando(false);
        }
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
    };

    if (carregando) return null;

    return (
        <>
            {!user ? (
                <Login onLogin={setUser} />
            ) : (
                <Dashboard onLogout={handleLogout} user={user} setUser={setUser} />
            )}
        </>
    );
}

export default App;