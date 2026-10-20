import { legacy_createStore as createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './reducers/authReducer';
import productReducer from './reducers/productReducer';
import compareReducer from './reducers/compareReducer';
import cartReducer from './reducers/cartReducer';
import orderReducer from './reducers/orderReducer';
import adminProductReducer from './reducers/adminProductReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  products: productReducer,
  compare: compareReducer,
  cart: cartReducer,
  orders: orderReducer,
  adminProducts: adminProductReducer,
});

const composeEnhancers =
  (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

export default createStore(rootReducer, composeEnhancers(applyMiddleware(thunk)));