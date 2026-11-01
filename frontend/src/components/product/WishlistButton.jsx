import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { toggleWishlist } from '../../store/actions/wishlistActions';

// Heart that saves a unit to the customer's wishlist. Visitors are sent to log in first.
export default function WishlistButton({ productId, sx }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const saved = useSelector((s) => s.wishlist.ids.includes(String(productId)));

  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Please log in to save units to your wishlist');
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    if (user.role !== 'customer') return toast.info('The wishlist is for customer accounts');
    const nowSaved = await dispatch(toggleWishlist(productId));
    if (nowSaved === true) toast.success('Saved to your wishlist');
  };

  return (
    <Tooltip title={saved ? 'Remove from wishlist' : 'Save to wishlist'}>
      <IconButton
        size="small" onClick={click} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        sx={{ bgcolor: 'rgba(255,255,255,.9)', '&:hover': { bgcolor: '#fff' }, ...sx }}
      >
        {saved ? <FavoriteIcon fontSize="small" color="error" /> : <FavoriteBorderIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}