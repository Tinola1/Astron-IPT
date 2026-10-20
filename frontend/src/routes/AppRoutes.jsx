import { Routes, Route } from 'react-router-dom';
import CustomerLayout from '../components/layout/CustomerLayout';
import AdminLayout from '../components/layout/AdminLayout';
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
import Dashboard from '../pages/admin/Dashboard';
import ProductList from '../pages/admin/products/ProductList';
import ProductForm from '../pages/admin/products/ProductForm';
import NotFound from '../pages/NotFound';
import AdminOrderList from '../pages/admin/orders/OrderList';
import AdminOrderDetail from '../pages/admin/orders/OrderDetail';

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
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* admin / staff area */}
      <Route path="admin" element={<ProtectedRoute roles={['admin', 'staff']} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="orders" element={<AdminOrderList />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}