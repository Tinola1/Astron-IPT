import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { loadUser } from './store/actions/authActions';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return (
    <>
      <AppRoutes />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}