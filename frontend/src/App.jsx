import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { loadUser } from './store/actions/authActions';
import { fetchCart, resetCart } from './store/actions/cartActions';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // keep the navbar cart badge in sync with the logged-in customer
  useEffect(() => {
    if (user?.role === 'customer') dispatch(fetchCart());
    else dispatch(resetCart());
  }, [dispatch, user?._id, user?.role]);

  return (
    <>
      <AppRoutes />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}