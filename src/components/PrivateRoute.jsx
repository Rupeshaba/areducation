import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const PrivateRoute = ({ role }) => {
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      toast.error("Please login to access this page.");
    } else if (role && user?.role !== role) {
      toast.error("You do not have permission to access this page.");
    }
  }, [hydrated, isAuthenticated, user, role]);

  if (!hydrated) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;