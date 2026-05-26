import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function App() {
    const [user, setUser] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const userSalvo = localStorage.getItem('user');
        if (userSalvo) {
            setUser(JSON.parse(userSalvo));
        }
        setCarregando(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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