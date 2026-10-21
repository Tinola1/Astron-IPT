import { legacy_createStore as createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './reducers/authReducer';
import productReducer from './reducers/productReducer';
import compareReducer from './reducers/compareReducer';
import cartReducer from './reducers/cartReducer';
import orderReducer from './reducers/orderReducer';
import adminProductReducer from './reducers/adminProductReducer';
import adminOrderReducer from './reducers/adminOrderReducer';
import productDetailReducer from './reducers/productDetailReducer';
import adminReviewReducer from './reducers/adminReviewReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  products: productReducer,
  compare: compareReducer,
  cart: cartReducer,
  orders: orderReducer,
  adminProducts: adminProductReducer,
  adminOrders: adminOrderReducer,
  adminOrders: adminOrderReducer,
  productDetail: productDetailReducer,
  adminReviews: adminReviewReducer,
});

const composeEnhancers =
  (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

export default createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));