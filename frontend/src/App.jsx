import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
    const [user, setUser] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const userSalvo = sessionStorage.getItem('user');
        if (userSalvo) {
            setUser(JSON.parse(userSalvo));
        }
        setCarregando(false);
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
                <Dashboard onLogout={handleLogout} />
            )}
        </>
    );
}

export default App;