import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Login page removed — redirect to /home so any leftover links still work.
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/home', { replace: true });
  }, [navigate]);
  return null;
};

export default LoginPage;
