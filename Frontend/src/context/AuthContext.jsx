import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            fetchUser(token);
        } else {
            localStorage.removeItem('token');
            setUser(null);
        }
    }, [token]);

    const fetchUser = async (tk) => {
        try {
            const res = await axios.get(`${BASE_URL}/api/me`, {
                headers: { Authorization: `Bearer ${tk || token}` }
            });
            setUser(res.data); // res.data now includes startup_id
        } catch (error) {
            console.error('Auth error', error);
            setToken(null);
        }
    };

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const res = await axios.post(`${BASE_URL}/auth/login`, formData);
        setToken(res.data.access_token);
    };

    const logout = () => setToken(null);

    // Allow components to refresh user after startup creation
    const refreshUser = () => token && fetchUser(token);

    return (
        <AuthContext.Provider value={{ token, user, setUser, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
