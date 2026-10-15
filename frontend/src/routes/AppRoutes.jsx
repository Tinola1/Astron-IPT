import { Routes, Route } from 'react-router-dom';
import CustomerLayout from '../components/layout/CustomerLayout';
import ProtectedRoute from './ProtectedRoute';
import Home from '../pages/customer/Home';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import Orders from '../pages/customer/account/Orders';
import OrderDetail from '../pages/customer/account/OrderDetail';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        {/* public */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />

        {/* logged-in customers */}
        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="account/orders" element={<Orders />} />
          <Route path="account/orders/:id" element={<OrderDetail />} />
          {/* profile, addresses, warranties, service requests: later batches */}
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}