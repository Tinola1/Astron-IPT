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
import ProductDetail from '../pages/customer/ProductDetail';
import AdminReviewList from '../pages/admin/reviews/ReviewList';
import Profile from '../pages/customer/account/Profile';
import InstallationList from '../pages/admin/installations/InstallationList';
import MyJobs from '../pages/technician/MyJobs';
import Warranties from '../pages/customer/account/Warranties';
import ServiceRequests from '../pages/customer/account/ServiceRequests';
import ServiceRequestList from '../pages/admin/service/ServiceRequestList';
import InventoryList from '../pages/admin/inventory/InventoryList';
import InventoryDetail from '../pages/admin/inventory/InventoryDetail';
import Reports from '../pages/admin/reports/Reports';
import CustomerList from '../pages/admin/customers/CustomerList';
import CustomerDetail from '../pages/admin/customers/CustomerDetail';
import TeamList from '../pages/admin/users/TeamList';
import CatalogList from '../pages/admin/catalog/CatalogList';
import Wishlist from '../pages/customer/account/Wishlist';
import Appointments from '../pages/customer/account/Appointments';
import ShopSettings from '../pages/admin/shop/ShopSettings';
import BuyingGuides from '../pages/customer/BuyingGuides';
import ContentList from '../pages/admin/content/ContentList';
import StoreInfoForm from '../pages/admin/store/StoreInfoForm';
import Promotions from '../pages/admin/store/Promotions';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        {/* public */}
        <Route index element={<Home />} />
        <Route path="products/:id" element={<ProductDetail />} />
                <Route path="guides" element={<BuyingGuides />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />

        {/* any logged-in user, including staff */}
        <Route element={<ProtectedRoute />}>
          <Route path="account/profile" element={<Profile />} />
        </Route>

        {/* logged-in customers */}
        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="account/orders" element={<Orders />} />
          <Route path="account/orders/:id" element={<OrderDetail />} />
          <Route path="account/warranties" element={<Warranties />} />
          <Route path="account/service-requests" element={<ServiceRequests />} />
          <Route path="account/appointments" element={<Appointments />} />    
          <Route path="account/wishlist" element={<Wishlist />} />      
        </Route>

        {/* technicians */}
        <Route element={<ProtectedRoute roles={['technician']} />}>
          <Route path="technician/jobs" element={<MyJobs />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* admin / staff area */}
      <Route path="admin" element={<ProtectedRoute roles={['admin', 'staff']} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="installations" element={<InstallationList />} />
          <Route path="service-requests" element={<ServiceRequestList />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="orders" element={<AdminOrderList />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="reviews" element={<AdminReviewList />} />
            <Route path="inventory" element={<InventoryList />} />
            <Route path="reports" element={<Reports />} />
            <Route path="team" element={<TeamList />} />
            <Route path="catalog" element={<CatalogList />} />
            <Route path="store-info" element={<StoreInfoForm />} />
            <Route path="promotions" element={<Promotions />} />
            <Route path="content" element={<ContentList />} />
            <Route path="shop" element={<ShopSettings />} />            
            <Route path="inventory/:id" element={<InventoryDetail />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}