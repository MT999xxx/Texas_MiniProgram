import { Navigate } from 'react-router-dom';

interface AuthRouteProps {
    children: React.ReactNode;
}

export default function AuthRoute({ children }: AuthRouteProps) {
    const token = localStorage.getItem('admin_token');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
