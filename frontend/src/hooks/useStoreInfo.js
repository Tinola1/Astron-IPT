import { useEffect, useState } from 'react';
import client from '../api/client';

// The public store details (name, logo...), fetched once and shared by every component that asks
let pending = null;
export default function useStoreInfo() {
  const [info, setInfo] = useState({});
  useEffect(() => {
    let live = true;
    pending ||= client.get('/store-info').then((r) => r.data).catch(() => ({}));
    pending.then((d) => live && setInfo(d));
    return () => { live = false; };
  }, []);
  return info;
}