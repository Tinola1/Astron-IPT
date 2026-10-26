import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import Loader from '../../../components/common/Loader';
import ProfileForm from '../../../components/account/ProfileForm';
import AddressBook from '../../../components/account/AddressBook';
import PasswordForm from '../../../components/account/PasswordForm';
import { clearAccountError, fetchAccount } from '../../../store/actions/accountActions';

const TABS = ['profile', 'addresses', 'password'];

export default function Profile() {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const { profile, error } = useSelector((s) => s.account);
  const initial = params.get('tab');
  const [tab, setTab] = useState(TABS.includes(initial) ? initial : 'profile');

  useEffect(() => {
    dispatch(clearAccountError());
    dispatch(fetchAccount());
  }, [dispatch]);

  if (!profile) return error ? <Alert severity="error">{error}</Alert> : <Loader fullPage />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
        My account
      </Typography>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            dispatch(clearAccountError());
            setTab(v);
          }}
          variant="scrollable"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="profile" label="Profile" />
          <Tab value="addresses" label="Addresses" />
          <Tab value="password" label="Password" />
        </Tabs>

        {tab === 'profile' && <ProfileForm profile={profile} />}
        {tab === 'addresses' && <AddressBook profile={profile} />}
        {tab === 'password' && <PasswordForm profile={profile} />}
      </Paper>
    </Box>
  );
}